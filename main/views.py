# coding: utf-8

import os
import re
import time
import six
import json
from functools import wraps, WRAPPER_ASSIGNMENTS
from hashlib import md5
import codecs
import tempfile
import subprocess

from django.utils.decorators import method_decorator
# from django.contrib.auth.decorators import permission_required
from django.utils.timezone import now
from django.http import JsonResponse, HttpResponse
from django.views.generic import TemplateView, View
from django.db.models import F, Case, When
from django.core.files.storage import default_storage
from django.views.decorators.csrf import csrf_protect

from markup.templatetags.markup import restructuredtext as rst, mymarkdown
from main.models import DocModel, SortedCatlogModel
from django.conf import settings

# 自定义id前缀，避免打开多个tab时id冲突， 最好放在源文件开头处
ID_PREFIX_RE = re.compile(r'\s*?\.\. id_prefix:\s*(\w+)')
# .. figure:: /media/20180109/1515469771.png
# STATIC_PNG_RE = re.compile(r'\.\. figure:: (?:/media/([0-9/]+?\.png))')
STATIC_PNG_RE = re.compile(r'\.\. figure:: (?:%s([0-9/]+?\.png))' % settings.MEDIA_URL)

FORM_BOUNDARY_RE = re.compile(r'.+?name="(\w+?)"')

TMP_INSITE_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>%s</title>
</head>
<body>
    %s
</body>
</html>
'''
TMP_PUBLIC_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="%(static_url)scss/themes/theme.css">
    <link rel="stylesheet" href="%(static_url)scss/base.css">
    <title>%(title)s</title>
    <style>
    .docs{left:10px}
    ::-webkit-scrollbar {
      width: 15px;
      height: 8px;
    }
    </style>
</head>
<body>
    <header>
        <div id="header">
            <div style="float:left;margin-left:10px;">好好学习：个人知识管理精进指南
                <a href="/">主页</a>
            </div>
        </div>
    </header>
    <section class="rst-content">
    <div class="docs">%(content)s</div>
    </section>
</body>
<script src="%(static_url)smodules/jquery-1.11.2.min.js"></script>
<script>
    if (document.getElementsByClassName('topic').length > 0) {
        document.getElementsByClassName('document')[0].style['paddingRight'] = '250px'
    }
    $('.document').on('click','.section>h1', function(e){
        e.preventDefault()
        var h = this.clientHeight + 10
        var w = $(this).parent()
        if (w.hasClass('section-collapsed')) {
            w.removeClass('section-collapsed')
            w.height(w.height('auto').height(), w.height(h))
        } else {
            w.height(w.height()), w.height(h)
            w.addClass('section-collapsed')
        }
    })
</script>
</html>
'''

def _loads(data):
    if six.PY3:
        return json.loads(data)
    else:
        return json.loads(bytes(data))


def my_perm_required(perm):
    def decorator(view_func):
        @wraps(view_func, assigned=WRAPPER_ASSIGNMENTS)
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
        'copynode', 'search'
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

    def _get_all_parent(self, parent, result):
        _p = DocModel.objects.filter(pk__in=parent).values_list('parent', flat=True)
        _tmp = [j for i in _p for j in json.loads(i)]
        if 0 in _tmp:
            return result
        result.update(_tmp)
        return self._get_all_parent(_tmp, result)

    def search(self, request, *args, **kwargs):
        '''
        Todo: 增加按内容搜索
        '''
        q = request.body.decode('utf-8').replace('str=', '')
        # d = DocModel.objects.filter(isdel=False).extra(
        #     where=['doctype & 2 = 2']).values(
        #     'id', 'staticpage').annotate(text=F('title'), type=F('doctype'))

        if request.user.is_authenticated:
            d = DocModel.objects.filter(title__icontains=q, isdel=False).extra(
                where=['doctype & 6 not in (2,4,6)']).values_list('parent', flat=True)
        else:
            d = DocModel.objects.filter(title__icontains=q, isdel=False, status=1).extra(
                where=['doctype & 6 not in (2,4,6)']).values_list('parent', flat=True)

        parents = set([0])
        for i in d:
            parent = json.loads(i)
            if 0 in parent:
                continue
            parents.update(parent)
            self._get_all_parent(parent, parents)
        return JsonResponse({'result': 'ok', 'ids': list(parents)}, safe=False)

    def get(self, request, *args, **kwargs):
        '''
        get 方法 都是 jstree 目录树 某个目录节点发的请求
        返回一组对象，未登录返回公共节点
        return
            [{"id":1,"text":"Parent node","children":[
                {"id":2,"text":"Child node 1","children":True},
                {"id":3,"text":"Child node 2"}
                ]
            }]
        '''
        pk = request.GET.get('id', '#')
        if pk == '#':
            # '#' 为jstree 初始化请求， 默认返回一个Root节点
            SortedCatlogModel.objects.get_or_create(
                folder=0, defaults={'children': self._bytes([])}
            )
            public_static_name = generate_filename(0)[8:]
            return JsonResponse(
                [{'text': 'Root',
                    'children': True,
                    'data': {'id': 0},  # root 节点 0. 目录表 folder=0
                    'state': {'disabled': True},
                    # 返回 公开的 html url 给引擎爬虫.
                    'a_attr': {'href': settings.PUBLIC_HTML_URL + public_static_name},
                }],
                safe=False
            )
        elif pk not in (0, '0'):
            # 若不是 root 节点，那都是在数据库中存在的，先校验下
            try:
                d = DocModel.objects.get(pk=pk)
            except DocModel.DoesNotExist:
                return JsonResponse({'result': 'failed', 'd': []}, safe=False)
            if d.doctype | 4 == d.doctype and d.pwd != request.GET.get('pwd'):
                return JsonResponse({'result': 'failed', 'd': []}, safe=False)
        # 按照目录子集合结构排序
        _children_list = SortedCatlogModel.objects.values_list('children', flat=True).get(folder=pk)
        children_list = json.loads(_children_list)
        orderby = Case(*[When(pk=k, then=pos) for pos, k in enumerate(children_list)])

        if request.user.is_authenticated:
            # all doc
            r = DocModel.objects.filter(pk__in=children_list, isdel=False).values(
                'id', 'static_name').annotate(text=F('title'), type=F('doctype'), count=F('mulcount')).order_by(orderby)
        else:
            # published doc
            r = DocModel.objects.filter(pk__in=children_list, isdel=False, status=1).values(
                'id', 'static_name').annotate(text=F('title'), type=F('doctype'), count=F('mulcount')).order_by(orderby)

        r = list(r)
        for i in r:
            static_name = i.pop('static_name')
            # 有发布的，返回 public href 给引擎爬虫， 否则返回 # 号
            if i['type'] | 8 == i['type']:
                href = '#'
            else:
                href = settings.PUBLIC_HTML_URL + static_name[8:]
            i['data'] = {'id': i.pop('id')}
            i['a_attr'] = {'href': href}
            # on jstree ajax mode, the true children means that is a closed folder
            if i['type'] | 2 == i['type']:
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
            parent=str([parent]), title=title, doctype=8 | _type, source_type=source_type)
        obj = SortedCatlogModel.objects.get(folder=parent)
        children = self._loads(obj.children)
        children.insert(int(pos), d.pk)
        obj.children = self._bytes(children)
        obj.save(update_fields=['children'])
        if _type | 2 == _type:
            SortedCatlogModel.objects.create(folder=d.pk, children=self._bytes([]))

        # 生成静态文件名字， static 取前16位， public取后16位
        d.static_name = generate_filename(d.pk)
        d.save(update_fields=['static_name'])
        return JsonResponse({'result': 'ok', 'id': d.pk})

    def getdoc(self, request, *args, **kwargs):
        '''
        用户点击jstree具体节点， 返回静态html
        获取节点静态html， 在系统右侧页面展示 （公开的节点，仅在单独打开链接时，由nginx直接调用public_html）
        source = True:  获取某个节点的源文件
        doctype | 4 : 带密码保护的

        '''
        # boundary = request.content_params['boundary']
        # # data = request.readlines()
        # data = {}
        # body = request.readlines()
        # count = len(body)
        # start = 0
        # while 1:
        #     # 第二行
        #     name =  FORM_BOUNDARY_RE.match(body[start+1].decode()).group(1)
        #     value = body[start + 3].decode().strip()
        #     data[name] = value
        #     start += 4
        #     if start > count - 2:
        #         break

        data = json.loads(request.body)

        pk = data['id']
        # if source is set, return the document source to editor
        source = data.get('source')
        d = DocModel.objects.get(pk=pk)
        if (d.doctype | 4 == d.doctype) and d.pwd != data.get('pwd', ''):
            return JsonResponse({'result': 'fail', 'msg': 'permission die'})
        if source is True:
            return JsonResponse({'result': 'ok', 'source': d.content})

        with open(settings.PRIVATE_HTML_ROOT / d.static_name[:16]) as f:
            html = f.read()

        # # 动态生成html
        # if d.source_type == 'rst' or d.doctype | 2 == d.doctype:
        #     r = ID_PREFIX_RE.search(d.content)
        #     if r is not None:
        #         # 自定义id
        #         html = rst(d.content, r.groups()[0])
        #     else:
        #         html = rst(d.content)
        # else:
        #     html = mymarkdown(d.content)
        return JsonResponse({'result': 'ok', 'doc': html})

    def put(self, request, *args, **kwargs):
        '''
        保存或更新文件， 这里不会有目录节点
        static_doc 静态化源文件为html，若是公开节点，多存一份public
        '''
        # save doc
        data = json.loads(request.body)
        pk = data['id']
        d = DocModel.objects.get(pk=pk)
        d.content = data['content']
        d.save(update_fields=['content'])
        try:
            html = static_doc(d)
        except Exception as e:
            return JsonResponse({'result': 'failed', 'msg': str(e), 'doc': ''})

        return JsonResponse({'result': 'ok', 'msg': '', 'doc': html})

    def _delete_child(self, folder_id):
        '''
            folder_id: 节点的id
            当，删除的是目录，并且这个目录没有更多parent，需要实际删除时，
            递归删除目录下的节点
            否则多父节点删除到最后一个节点时，不会执行删除操作及释放资源
        '''
        f = SortedCatlogModel.objects.filter(folder=folder_id)
        ch = json.loads(f.values_list('children', flat=True).get())
        # ch = json.loads(f.children)
        # f.delete()
        # 目录表中标记删除，便于恢复

        # 子节点递归执行delete
        for pk in ch:
            self._delete_doc(pk, parent_id=folder_id)

        f.update(isdel=True, children = b'[]')

    def _delete_doc(self, pk, parent_id):
        '''
        pk: 要删除的id
        parent_id: 当前所属父节点id
        doc 保留最后一个parent，便于恢复到原有目录下
        '''
        doc = DocModel.objects.get(pk=pk)
        parents = json.loads(doc.parent)
        parents.remove(parent_id)
        if not parents:
            # 没有任何父节点，则删掉静态文件，数据库标记为删除
            doc.isdel = True
            delete_static(doc)
            # 如果是目录，则递归删除目录下的节点
            if doc.doctype | 2 == doc.doctype:
                self._delete_child(pk)
        else:
            doc.parent = str(parents)
        doc.mulcount = len(parents)
        doc.save(update_fields=['isdel', 'parent', 'mulcount'])

        # del_from_parent
        folder = SortedCatlogModel.objects.get(folder=parent_id)
        ch = json.loads(folder.children)
        ch.remove(pk)
        folder.children = self._bytes(ch)
        folder.save(update_fields=['children'])

        # update static parent
        # 若 doc 是公开的，则需要更新父目录
        if doc.status == 1:
            if parent_id == 0:
                p = type('', (object,), {'pk': 0, 'status': 1, 'parent': '[]', 'doctype': 2})
            else:
                p = DocModel.objects.get(pk=parent_id)
            static_doc(p)

    def delete(self, request, *args, **kwargs):
        '''
           多标签删除
           删除最后一个标签时，同时删掉附带的图片资源，用正则表达式匹配下面这种
                .. figure:: /media/20180109/1515469771.png
           Todo： 以后增加个回收站
        '''
        data = json.loads(request.body)
        pk = data['id']
        if pk in (0, '0'):
            return JsonResponse({'result': 'failed', 'msg': "Not allow to delete root!"})

        parent = data['parent']
        self._delete_doc(pk, parent)

        doc = DocModel.objects.get(pk=pk)
        return JsonResponse({'result': 'ok', 'msg': '', 'count': doc.mulcount})

    def rename(self, request, *args, **kwargs):
        '''重命名，似乎父节点需要重新发布静态文件'''
        data = json.loads(request.body)
        pk = data['id']
        doc = DocModel.objects.get(pk=pk)
        doc.title = data['text']
        doc.save(update_fields=['title'])

        parent = data['parent']
        # 若 doc 是私密的，不需要重新静态化目录
        if doc.status == 1:
            if parent == 0:
                p = type('', (object,), {'pk': 0, 'status': 1, 'parent': '[]', 'doctype': 2})
            else:
                p = DocModel.objects.get(pk=parent)
            static_doc(p)
        return JsonResponse({'result': 'ok', 'msg': ''})

    def movenode(self, request, *args, **kwargs):
        data = json.loads(request.body)
        pk = int(data['id'])
        target_pk = data['parent']
        pos = int(data['pos'])
        source_pk = data['old_parent']
        # old_pos = data['old_pos']

        doc = DocModel.objects.get(pk=pk)
        target_folder = SortedCatlogModel.objects.get(folder=target_pk)
        target_folder.children = json.loads(target_folder.children)

        if source_pk == target_pk:
            target_folder.children.remove(pk)
        else:
            # if target parent has already exists return failed
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

        # 重新静态化目录 （是发布的并且是非加密的节点才需要更新父目录）
        if doc.status == 1:
            target_p = DocModel.objects.get(pk=target_pk)
            source_p = DocModel.objects.get(pk=source_pk)
            if target_p.status == 1:
                static_doc(target_p)
            if source_p.status == 1:
                static_doc(source_p)

        return JsonResponse({'result': 'ok', 'msg': ''})

    def setpwd(self, request, *args, **kwargs):
        ''' 设置密码后，自动将public的节点转为unpublic节点
        '''
        # set or change password, if doc already set pwd use change
        o = json.loads(request.body)
        pk = o.get('id')
        pwd = o.get('pwd') or ''
        if pk > 0:
            d = DocModel.objects.get(pk=pk)
            # 假如是发布的节点，这里直接doctype|8, status=0避免二次保存
            d.doctype |= 12  # ( 4 | 8)
            d.pwd = pwd
            d.status = 0
            d.save(update_fields=['status', 'doctype', 'pwd'])
        else:
            return JsonResponse({'result': 'failed', 'msg': 'Root node cannot set password'})
        # 设置密码保护后，删除public的静态文件
        if d.status == 1:
            unstatic_doc(d)
            # d.status == 0
            # d.doctype |= 8
            # d.save(update_fields=['status', 'doctype'])
        # set pwd then update all parent static file
        # 设置密码后，需要更新所有父节点，将其隐藏
        static_parent_folder(d)
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
        doc.mulcount = len(doc_parents)
        doc.save(update_fields=['parent', 'mulcount'])

        target_folder = SortedCatlogModel.objects.get(folder=target_pk)
        target_folder.children = self._loads(target_folder.children)
        target_folder.children.insert(pos, pk)
        target_folder.children = self._bytes(target_folder.children)
        target_folder.save(update_fields=['children'])

        # update parent static html file, if node is publish
        # 如果是非私密的节点，需要更新所有父目录静态文件
        if doc.status == 1:
            if target_pk == 0:
                p = type('', (object,), {'doctype': 0b1010, 'status': 1, 'pk': 0, 'parent': '[]'})
            else:
                p = DocModel.objects.get(pk=target_pk)
            static_doc(p)

        return JsonResponse({'result': 'ok', 'msg': '', 'count': doc.mulcount})


def upload_file(request):
    if request.method != 'POST':
        return JsonResponse({'result': 'failed', 'msg': '!!!'})
    if not request.user.has_perm('main.can_upload'):
        return JsonResponse({'result': 'failed', 'msg': 'permission die!'})

    media = request.FILES['data']
    n = now()
    # day_path = '%s' % n.strftime('%Y%m%d')
    day_path = n.strftime('%Y/%m')
    file_path = settings.MEDIA_ROOT / day_path
    if not file_path.exists():
        file_path.mkdir(parents=True)
    filename = '%s.%s' % (n.strftime('%d%H%M%S'), media.content_type.split('/')[-1])
    default_storage.save(file_path / filename, media)
    # with open(os.path.join(file_path, filename), 'wb+') as f:
    #     for chunk in media.chunks():
    #         f.write(chunk)
    return JsonResponse({
        'result': 'ok',
        'path': settings.MEDIA_URL + day_path + '/' + filename
    })


def publish_doc(request):
    if not request.user.has_perm('main.doc.publish'):
        return JsonResponse({'result': 'failed', 'msg': 'permission die'})

    pk = json.loads(request.body).get('id')
    if pk > 0:
        d = DocModel.objects.get(pk=pk)
        d.doctype = (d.doctype | 8) ^ 8
        d.status = 1
    else:
        d = type('', (object,), {'doctype': 0b1010, 'status': 1, 'pk': 0, 'parent': '[]'})
    static_doc(d)
    # static all parent
    static_parent_folder(d)
    href = settings.PUBLIC_HTML_URL + d.static_name[8:]
    return JsonResponse({'result': 'ok', 'data': href})


def unpublish_doc(request):
    if not request.user.has_perm('main.doc.unpublish'):
        return JsonResponse({'result': 'failed', 'msg': 'permission die'})

    pk = json.loads(request.body).get('id')
    if pk == 0:
        return JsonResponse({'result': 'failed', 'msg': 'unpublish not allow on the root node'})
    d = DocModel.objects.get(pk=pk)
    d.status = 0
    d.doctype |= 8
    d.save(update_fields=['status', 'doctype'])
    unstatic_doc(d)
    # unpublish then update all parent static file
    static_parent_folder(d)
    return JsonResponse({'result': 'ok'})


def collect_folder_html(d):
    '''静态化目录, 目录附加链接，仅提供给搜索引擎爬虫之类使用，系统自身用不到
    因此静态内容是publish的子节点(status=1)
    '''
    # delete children, pwd and publish and  unpublish doc, then update static html
    s = SortedCatlogModel.objects.get(folder=d.pk)
    children = json.loads(s.children)
    html = []

    if children:
        cs = DocModel.objects.filter(pk__in=children, status=1, isdel=False)
        for c in cs:
            if c.doctype | 4 != c.doctype:  # 非密码节点
                uri = settings.PUBLIC_HTML_ROOT / c.static_name[8:]
                html.append('<a href="%s">%s</a>' % (uri.as_posix(), c.title))
    return ''.join(html)


def static_doc(d):
    '''
    生成以下静态html文件
    1. 公开的目录 public_html_root
    2. 公开的文件 public_html_root(单文件)， public_static_html_root(站内使用)
    3. 私密文件 private_html_root (站内使用)
    '''
    is_folder = d.doctype | 2 == d.doctype
    if is_folder:
        content = collect_folder_html(d)
    else:
        if d.source_type == 'rst':
            r = ID_PREFIX_RE.search(d.content)
            if r is not None:
                content = rst(d.content, r.groups()[0])
            else:
                content = rst(d.content)
        else:
            content = mymarkdown(d.content)

    # filename = generate_filename(d.pk)
    # 系统使用的静态化html文件名，未发布使用 static_name ，发布的使用public_name
    # 并且发布的存放在 PUBLIC_STATIC_HTML_ROOT 下，nginx 可直接访问到
    # static_name, public_name = filename[:16], filename[8:]
    static_name, public_name = d.static_name[:16], d.static_name[8:]
    # 未公开或加密
    unpublish = d.doctype | 8 == d.doctype or d.doctype | 4 == d.doctype
    # 静态公开的节点
    if unpublish is True:
        if is_folder:
            return content
        # 静态私有节点保存到 settings.PRIVATE_HTML_ROOT , 私有目录不需要静态
        private_file = settings.PRIVATE_HTML_ROOT / static_name
        with codecs.open(private_file, 'w', encoding='utf8') as f:
            f.write(TMP_INSITE_HTML % (getattr(d, 'title', ''), content))
    else:
        if is_folder:
            # 目录 只需要存一个public_html, 搜索引擎能收录即可
            public_file = settings.PUBLIC_HTML_ROOT / public_name
            with codecs.open(public_file, 'w', encoding='utf8') as f:
                title = getattr(d, 'title', '')
                f.write(TMP_PUBLIC_HTML % {'title': title, 'content': content, 'static_url': settings.STATIC_URL})
        else:
            # 系统用静态文件
            static_file = settings.PUBLIC_STATIC_HTML_ROOT / public_name
            with codecs.open(static_file, 'w', encoding='utf8') as f:
                f.write(TMP_INSITE_HTML % (getattr(d, 'title', ''), content))
            # 独立页面, 用于在从搜索引擎打开，能流览到一个完整的页面
            public_file = settings.PUBLIC_HTML_ROOT / public_name
            with codecs.open(public_file, 'w', encoding='utf8') as f:
                title = getattr(d, 'title', '')
                f.write(TMP_PUBLIC_HTML % {'title': title, 'content': content, 'static_url': settings.STATIC_URL})

        # if d.pk > 0: # root节点 == 0 ，jstree需要虚构的，数据库中不存在
        #     d.static_name = filename
        #     d.save(update_fields=['status', 'doctype', 'static_name'])

    return content


def unstatic_doc(d):
    '''仅仅针对public的节点有意义，仅删除public的静态文件
        然后需要重新生成private静态文件
    '''
    if d.doctype | 8 != d.doctype:
        return
    (settings.PUBLIC_HTML_ROOT / d.static_name[8:]).unlink()
    if d.doctype | 1 == d.doctype:
        (settings.PUBLIC_STATIC_HTML_ROOT / d.static_name[8:]).unlink()


def static_parent_folder(child):
    '''
    静态化所有父目录，只有发布的目录才需要更新
    '''
    parents = json.loads(child.parent)
    for d in DocModel.objects.filter(pk__in=parents):
        if d.status == 1:
            static_doc(d)
    if 0 in parents:
        static_doc(type('', (object,), {'doctype': 0b1010, 'status': 1, 'pk': 0, 'parent': '[]'}))


def delete_static(d):
    '''
       删除了节点， 删除静态文件
       同时删除节点里带的静态资源（图片）
    '''
    # 目录并且是发布的
    if d.doctype | 2 == d.doctype:
        if d.status == 1:
            (settings.PUBLIC_HTML_ROOT / d.static_name[8:]).unlink(missing_ok=True)
        return
    (settings.PRIVATE_HTML_ROOT / d.static_name[:16]).unlink(missing_ok=True)
    # 公开的节点还要删除 public html
    if d.status == 1:  # public
        (settings.PUBLIC_HTML_ROOT / d.static_name[8:]).unlink(missing_ok=True)
        (settings.PUBLIC_STATIC_HTML_ROOT / d.static_name[8:]).unlink(missing_ok=True)

    # 删除图片资源
    for png in STATIC_PNG_RE.findall(d.content):
        (settings.MEDIA_ROOT / png).unlink(missing_ok=True)


def generate_filename(pk):
    '''
    返回 32位 md5 值 hd
    hd[0:16] 私密目录静态文件名， hd[8:24] 公开的文件
    分别用于静态文件的 private_name 和 public_name
    '''
    m = md5(str(pk).encode('utf8'))
    # m.update(settings.SECRET_KEY.encode('utf8'))
    m.update(b'static')
    m.update(b'public')
    # hd = m.hexdigest()
    # return hd[:16], hd[8:-8]
    return m.hexdigest()[:24]


def get_local_font():
    '''
    pdf 字体
    '''
    if settings.LANGUAGE_CODE.lower() == 'zh-hans':
        language_code = 'zh'
    else:
        language_code = LANGUAGE_CODE
    sh = 'fc-list -f "%%{family}\n" :lang=%s' % language_code
    status, msg = subprocess.getstatusoutput(sh)
    if status != 0:
        return None
    for font in msg.split('\n'):
        if ',' in font:
            for f in font.split(','):
                if 'Bold' not in f and f.strip():
                    return f
        if 'Bold' not in font and font.strip():
            return font


def export_pdf(request):
    if not request.user.has_perm('main.doc.export_pdf'):
        return JsonResponse({'result': 'failed', 'msg': 'permission die'})

    pk = json.loads(request.body).get('id')
    try:
        d = DocModel.objects.get(pk=pk)
    except DocModel.DoesNotexist:
        return JsonResponse({'result': 'faield', 'msg': 'doc not found'})
    if d.doctype & 1 != 1:
        return JsonResponse({'result': 'faield', 'msg': 'only doc can be exported'})

    output = 'downloads/%s.pdf' % d.title
    sh = '''pandoc -f rst -s %s -o "%s" --pdf-engine=xelatex \
        -V CJKmainfont="%s" \
        -M geometry:"margin=0.5in" \
        -V fontsize=12pt -V documentclass=extarticle
    '''
    status, msg = 1, 'failed'
    local_font = get_local_font()
    if local_font is None:
        return JsonResponse({'result': 'failed', 'msg': 'not found font of language: %s' % settings.LANGUAGE_CODE})

    with tempfile.NamedTemporaryFile(suffix='.rst') as f:
        f.write(d.content.encode())
        f.seek(0)
        status, msg = subprocess.getstatusoutput(sh % (
            f.name,
            # 路径空白字符
            (settings.MEDIA_ROOT / output).as_posix(),
            local_font)
        )
    if status != 0:
        return JsonResponse({'result': 'failed', 'msg': msg})
    return JsonResponse({'result': 'ok', 'data': settings.MEDIA_URL + output})


def export_docx(request):
    if not request.user.has_perm('main.doc.export_docx'):
        return JsonResponse({'result': 'failed', 'msg': 'permission die'})

    pk = json.loads(request.body).get('id')
    try:
        d = DocModel.objects.get(pk=pk)
    except DocModel.DoesNotexist:
        return JsonResponse({'result': 'faield', 'msg': 'doc not found'})
    if d.doctype & 1 != 1:
        return JsonResponse({'result': 'faield', 'msg': 'only doc can be exported'})

    output = 'downloads/%s.docx' % d.title
    sh = 'pandoc -f rst -s %s -o "%s"'
    status, msg = 1, 'failed'

    with tempfile.NamedTemporaryFile(suffix='.rst') as f:
        f.write(d.content.encode())
        f.seek(0)
        out = settings.MEDIA_ROOT / output
        status, msg = subprocess.getstatusoutput(sh % (f.name, out.as_posix()))
    if status != 0:
        return JsonResponse({'result': 'failed', 'msg': msg})
    return JsonResponse({'result': 'ok', 'data': settings.MEDIA_URL + output})


def restatic_all_node():
    '''
    重新生成静态文件， 静态文件分私有静态文件， 访客内页静态文件， 访客单页静态文件（可单独一个页面访问的）
    私有与访客内页静态文件，都是在系统右侧显示的html，不含css js资源。 单页静态文件包含css js。
    1. 删除所有静态文件
    2. 读取节点表，生成所有文章节点静态文件
    3. 读取目录表，生成所有目录静态文件
    '''
    docs = DocModel.objects.filter(isdel=0)
    # 数据结果变更，需要先更新一遍static_name旧数据，后续就可以注释了
    # for d in docs:
    #     static_name = generate_filename(d.pk)
    #     d.static_name = static_name
    #     d.save(update_fields=['static_name'])
    folders = [type('', (object,), {'doctype': 2, 'status': 1, 'pk': 0, 'parent': '[]'})]
    # for d in docs:
    #     # 先略过目录
    #     if d.doctype | 2 == d.doctype:
    #         folders.append(d)
    #         continue
    #     try:
    #         static_doc(d)
    #         print(f'============ {d.pk} ============')
    #     except Exception as e:
    #         print(e, d.pk)

    for f in folders:
        # 若目录是私有的，也没必要生成静态文件
        if f.status != 1:
            continue
        try:
            static_doc(f)
            print(f'------------ {f.pk} -----------')
        except Exception as e:
            print(e, f.pk)


def what_ip(request):
    '''获取客户端ip'''
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return HttpResponse(ip)
