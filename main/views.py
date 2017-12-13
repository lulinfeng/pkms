# coding: utf-8

import os
import time
import six
import json
from functools import wraps

from django.utils.decorators import available_attrs, method_decorator
from django.contrib.auth.decorators import permission_required
from django.utils.timezone import now
from django.http import JsonResponse
from django.views.generic import TemplateView, View
from django.db.models import F, Case, When
from django.core.files.storage import default_storage

from django.conf import settings
from markup.templatetags.markup import restructuredtext as rst, markdown
from main.models import DocModel, SortedCatlogModel


def my_perm_required(perm):
    def decorator(view_func):
        @wraps(view_func, assigned=available_attrs(view_func))
        def _wrapped_view(request, *args, **kwargs):
            if request.user.has_perm(perm) is True:
                return view_func(request, *args, **kwargs)
            return JsonResponse({'result': 'failed', 'msg': 'permission denied'})
        return _wrapped_view
    return decorator


class DocView(TemplateView):
    template_name = 'main.html'


@method_decorator(my_perm_required('main.menu.setpwd'), name='setpwd')
@method_decorator(my_perm_required('main.doc.create'), name='create')
@method_decorator(my_perm_required('main.doc.rename'), name='rename')
@method_decorator(my_perm_required('main.doc.edit'), name='put')
@method_decorator(my_perm_required('main.doc.delete'), name='delete')
@method_decorator(my_perm_required('main.menu.movenode'), name='movenode')
class MenuTree(View):
    '''
        menu event: get create rename select delete  move
    '''

    http_method_names = [
        'get', 'post', 'put', 'delete', 'head', 'options',
        'create', 'getdoc', 'rename', 'movenode', 'setpwd',
        'copynode',
    ]

    def _loads(self, data):
        if six.PY3:
            return json.loads(data)
        else:
            return json.loads(bytes(data))

    def _bytes(self, data):
        if six.PY3:
            return bytes(str(data), 'utf8')
        else:
            return bytes(data)

    def get(self, request, *args, **kwargs):
        pk = request.GET.get('id', '#')
        if pk == '#':
            SortedCatlogModel.objects.get_or_create(
                folder=0, defaults={'children': self._bytes([])}
            )
            return JsonResponse(
                [{'text': 'Root', 'children': True, 'data': {'id': 0}, 'state': {'disabled': True}}],
                safe=False
            )
        elif pk not in (0, '0'):
            d = DocModel.objects.get(pk=pk)
            if d.doctype.startswith('pwd') and d.pwd != request.GET.get('pwd'):
                return JsonResponse({'result': 'failed', 'd': []}, safe=False)
        # 按照目录子集合结构排序
        _children_list = SortedCatlogModel.objects.values_list('children', flat=True).get(folder=pk)
        children_list = self._loads(_children_list)
        orderby = Case(*[When(pk=k, then=pos) for pos, k in enumerate(children_list)])
        r = DocModel.objects.filter(pk__in=children_list, isdel=False).values(
            'id').annotate(text=F('title'), type=F('doctype')).order_by(orderby)
        # r = [{"id":1,"text":"Root node","children":[
        #     {"id":2,"text":"Child node 1","children":True},
        #     {"id":3,"text":"Child node 2"}
        #     ]
        # }]
        r = list(r)
        # on jstree ajax mode, the true children means that is a closed folder
        for i in r:
            i['data'] = {'id': i.pop('id')}
            if i.get('type') in ('folder', 'pwdfolder'):
                i.update({'children': True})
        return JsonResponse({'result': 'ok', 'd': r}, safe=False)

    def create(self, request, *args, **kwargs):
        data = json.loads(request.body)
        parent = data['parent']
        pos = data['pos']
        title = data['text']
        source_type = data.get('source_type', '')
        _type = data['type']
        d = DocModel.objects.create(
            parent=str([parent]), title=title, doctype=_type, source_type=source_type)
        obj = SortedCatlogModel.objects.get(folder=parent)
        children = self._loads(obj.children)
        children.insert(int(pos), d.pk)
        obj.children = self._bytes(children)
        obj.save(update_fields=['children'])
        if _type in ('folder', 'pwdfolder'):
            SortedCatlogModel.objects.create(folder=d.pk, children=self._bytes([]))
        return JsonResponse({'result': 'ok', 'id': d.pk})

    def getdoc(self, request, *args, **kwargs):
        data = json.loads(request.body)
        pk = data['id']
        source = data.get('source')  # 获取源文件用于编辑
        d, source_type, doctype, pwd = DocModel.objects.values_list(
            'content', 'source_type', 'doctype', 'pwd').get(pk=pk)
        if doctype.startswith('pwd') and pwd != data.get('pwd', ''):
            return JsonResponse({'result': 'fail', 'msg': 'permission die'})
        if source_type.endswith('rst'):
            html = rst(d)
        else:
            html = markdown(d)
        if source is True:
            return JsonResponse({'result': 'ok', 'doc': html, 'source': d})
        else:
            return JsonResponse({'result': 'ok', 'doc': html})

    def put(self, request, *args, **kwargs):
        # 保存doc
        data = json.loads(request.body)
        pk = data['id']
        DocModel.objects.filter(pk=pk).update(content=data['content'])

        return JsonResponse({'result': 'ok', 'msg': '', 'doc': rst(data['content'])})

    def _delete_folder(self, folder_id):
        f = SortedCatlogModel.objects.filter(folder=folder_id)
        if f.exists() is True:
            ch = self._loads(f.values_list('children', flat=True).get())
            f.delete()
            DocModel.objects.filter(pk__in=ch).delete()
            for pk in ch:
                self._delete_folder(pk)

    def delete(self, request, *args, **kwargs):
        # 多标签删除
        data = json.loads(request.body)
        pk = data['id']
        if pk in (0, '0'):
            return JsonResponse({'result': 'failed', 'msg': "Don't do that!"})
        _type = data['type']
        parent = data['parent']

        doc = DocModel.objects.get(pk=pk)
        # parent keep the last one and set boolean isdel
        parents = json.loads(doc.parent)
        if (parents) == 1:
            doc.isdel = True
        else:
            parents.remove(parent)
        doc.save()
        # delete form catlog
        s = SortedCatlogModel.objects.get(folder=parent)
        ch = self._loads(s.children)
        ch.remove(pk)
        s.children = self._bytes(ch)
        s.save(update_fields=['children'])
        # recursively delete sub node
        if _type in ('folder', 'pwdfolder'):
            self._delete_folder(pk)
        return JsonResponse({'result': 'ok', 'msg': ''})

    def rename(self, request, *args, **kwargs):
        data = json.loads(request.body)
        pk = data['id']
        title = data['text']
        DocModel.objects.filter(pk=pk).update(title=title)
        return JsonResponse({'result': 'ok', 'msg': ''})

    def movenode(self, request, *args, **kwargs):
        data = json.loads(request.body)
        pk = int(data['id'])
        target_pk = data['parent']
        pos = int(data['pos'])
        source_pk = data['old_parent']
        # old_pos = data['old_pos']

        target_folder = SortedCatlogModel.objects.get(folder=target_pk)
        target_folder.children = self._loads(target_folder.children)
        if source_pk == target_pk:
            target_folder.children.remove(pk)
        else:
            # if target parent has already exists return failed
            doc = DocModel.objects.get(pk=pk)
            doc_parents = json.loads(doc.parent)
            if target_pk in doc_parents:
                return JsonResponse({'result': 'failed', 'msg': 'node has already exists in target'})
            doc_parents.remove(source_pk)
            doc_parents.append(target_pk)
            doc.parent = str(doc_parents)
            doc.save(update_fields=['parent'])
            old_folder = SortedCatlogModel.objects.get(folder=source_pk)
            old_folder.children = self._loads(old_folder.children)
            old_folder.children.remove(pk)
            old_folder.children = self._bytes(old_folder.children)
            old_folder.save(update_fields=['children'])
        target_folder.children.insert(pos, pk)
        target_folder.children = self._bytes(target_folder.children)
        target_folder.save(update_fields=['children'])
        return JsonResponse({'result': 'ok', 'msg': ''})

    def setpwd(self, request, *args, **kwargs):
        # set or change password, if doc already set pwd use change
        o = json.loads(request.body)
        pk = o.get('id')
        pwd = o.get('pwd') or ''
        d = DocModel.objects.get(pk=pk)
        if d.doctype.startswith('pwd'):
            # change password
            if d.pwd != o.get('oldpwd'):
                return JsonResponse({'result': 'failed', 'msg': 'invalid password'})
            d.pwd = pwd
            d.save()
            return JsonResponse({'result': 'ok'})
        else:
            d.doctype = 'pwd%s' % d.doctype
            d.pwd = pwd
            d.save()
            return JsonResponse({'result': 'ok'})

    def copynode(self, request, *args, **kwargs):
        data = json.loads(request.body)
        pk = int(data['id'])
        target_pk = data['parent']
        pos = int(data['pos'])
        source_pk = data['old_parent']

        # same folder or target has already exists return failed
        if source_pk == target_pk:
            return JsonResponse({'result': 'failed', 'msg': 'node has already exists in target'})

        doc = DocModel.objects.get(pk=pk)
        doc_parents = json.loads(doc.parent)
        if target_pk in doc_parents:
            return JsonResponse({'result': 'failed', 'msg': 'node has already exists in target'})

        doc_parents.append(target_pk)
        doc.parent = str(doc_parents)
        doc.save(update_fields=['parent'])

        target_folder = SortedCatlogModel.objects.get(folder=target_pk)
        target_folder.children = self._loads(target_folder.children)
        target_folder.children.insert(pos, pk)
        target_folder.children = self._bytes(target_folder.children)
        target_folder.save(update_fields=['children'])
        return JsonResponse({'result': 'ok', 'msg': ''})


def upload_file(request):
    if request.method != 'POST':
        return JsonResponse({'result': 'failed', 'msg': '!!!'})
    if not request.user.has_perm('main.can_upload'):
        return JsonResponse({'result': 'failed', 'msg': 'permission die!'})

    media = request.FILES['data']
    n = now()
    day_path = '%s' % n.strftime('%Y%m%d')
    file_path = os.path.join(settings.MEDIA_ROOT, day_path)
    if not os.path.exists(file_path):
        os.makedirs(file_path)
    filename = '%d.%s' % (int(time.time()), media.content_type.split('/')[-1])
    default_storage.save(os.path.join(file_path, filename), media)
    # with open(os.path.join(file_path, filename), 'wb+') as f:
    #     for chunk in media.chunks():
    #         f.write(chunk)
    return JsonResponse({'result': 'ok',
            'path': os.path.join(settings.MEDIA_URL, day_path, filename)})
