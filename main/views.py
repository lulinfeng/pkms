# coding: utf-8

import json
from functools import wraps
from hashlib import md5

from django.utils.decorators import available_attrs
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from django.views.generic import TemplateView, View
from django.db.models import F, Case, When

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
    ]

    def get(self, request, *args, **kwargs):
        pk = request.GET['id']
        if pk == '#':
            SortedCatlogModel.objects.get_or_create(
                folder=0, defaults={'children': bytes([])}
            )
            return JsonResponse(
                [{'id': "0", 'text': 'Root', 'children': True, 'state': {'disabled': True}}],
                safe=False
            )
        elif pk not in (0, '0'):
            d = DocModel.objects.get(pk=pk)
            if d.doctype.startswith('pwd') and d.pwd != request.GET.get('pwd'):
                return JsonResponse({'result': 'failed', 'd': []}, safe=False)
        # 按照目录子集合结构排序
        _children_list = SortedCatlogModel.objects.values_list('children', flat=True).get(folder=pk)
        children_list = json.loads(bytes(_children_list))
        orderby = Case(*[When(pk=k, then=pos) for pos, k in enumerate(children_list)])
        r = DocModel.objects.filter(pk__in=children_list).values(
            'id').annotate(text=F('title'), type=F('doctype')).order_by(orderby)
        # r = [{"id":1,"text":"Root node","children":[
        #     {"id":2,"text":"Child node 1","children":True},
        #     {"id":3,"text":"Child node 2"}
        #     ]
        # }]
        r = list(r)
        # on jstree ajax mode, the true children means that is a closed folder
        for i in r:
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
        # ispwd = 'ispwd' in data and data['ispwd']
        # pwd = data.get('pwd', '')
        d = DocModel.objects.create(
            parent=parent, title=title, doctype=_type, source_type=source_type)
        obj = SortedCatlogModel.objects.get(folder=parent)
        children = json.loads(bytes(obj.children))
        children.insert(int(pos), d.pk)
        obj.children = bytes(children)
        obj.save(update_fields=['children'])
        if _type in ('folder', 'pwdfolder'):
            SortedCatlogModel.objects.create(folder=d.pk, children=bytes([]))
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

    def _delete_folder(self, parent_pk):
        f = SortedCatlogModel.objects.filter(folder=parent_pk)
        if f.exists() is True:
            ch = json.loads(bytes(f.values_list('children', flat=True).get()))
            f.delete()
            DocModel.objects.filter(pk__in=ch).delete()
            for pk in ch:
                self._delete_folder(pk)

    def delete(self, request, *args, **kwargs):
        data = json.loads(request.body)
        pk = int(data['id'])
        if pk == 0:
            DocModel.objects.all().delete()
            SortedCatlogModel.objects.all().delete()
            return JsonResponse({'result': 'ok', 'msg': ''})
        _type = data['type']

        doc = DocModel.objects.get(pk=pk)
        s = SortedCatlogModel.objects.get(folder=doc.parent)
        ch = json.loads(bytes(s.children))
        ch.remove(pk)
        s.children = bytes(ch)
        s.save(update_fields=['children'])
        doc.delete()
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
        pk = data['id']
        parent = data['parent']
        pos = data['pos']
        old_parent = data['old_parent']
        # old_pos = data['old_pos']
        _p = SortedCatlogModel.objects.get(folder=parent)
        _p.children = json.loads(bytes(_p.children))
        _p.children.insert(int(pos), int(pk))
        _p.children = bytes(_p.children)
        _p.save(update_fields=['children'])
        _op = SortedCatlogModel.objects.get(folder=old_parent)
        _op.children = json.loads(bytes(_op.children))
        _op.children.remove(int(pk))
        _op.children = bytes(_op.children)
        _op.save(update_fields=['children'])
        return JsonResponse({'result': 'ok', 'msg': ''})

    def setpwd(self, request, *args, **kwargs):
        # set or change password, if doc ispwd is true use change
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
