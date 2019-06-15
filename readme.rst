
pkms 是一个针对个人知识体系的管理系统，也可当作个人博客使用，未发布的文章或目录为私有资料，只有自己才能查看。
pkms 基于python django构建，支持MarkDown和reStructuredText，文章可无限制的随意复制到任何目录下，
不会增加额外存储空间，仅仅是增加一个id值，没有真正复制文章内容，因此只要修改其中一份，所有文章都能同时生效。
部署简单，数据库直接使用系统自带的sqlite3，无需额外安装数据库，系统资源消耗低，在100M内存的服务器上也能运行十分流畅，
目录树、文章及编辑器可使用vi移动快捷键，操作方便。可以直接粘贴图片，及将web页面上的内容粘贴为reStructuredText源码。


Requirements
============
- Python 2.7+/3.x
- Django 1.11+
- pandoc 2.0+

导出pdf和docx功能
==================
依赖 `pandoc <https://pandoc.org/installing.html>`__

安装完pandoc后，可能还需要安装以下两个包::

	sudo apt install texlive-xetex fontconfig

Install
===========

::

    git clone https://github.com/lulinfeng/pkms.git
    cd pkms
    sudo pip install -r requirements.txt
    python manage.py makemigrations
    python manage.py migrate

and then run developer server::

    python manage.py runserver

在浏览器上打开 ``http://localhost:8000``, 应该就可以看到你的服务器了
在正式使用之前，需要创建超级用户。在刚才目录下输入以下代码

::

    python manage.py createsuperuser

然后按提示输入超级用户名和密码

部署
======
参考 `使用gunicorn部署 <gunicorn.rst>`_

Usage
=======
pkms 基本都是靠快捷键操作，以下是快捷键介绍

全局快捷键
----------

- alt + shift + ,/. 向左/右调整目录树和内容区域大小
- alt + shift + n/m 显示/隐藏目录树
- alt + n(1,2,3..) 切换到第n个tab页
- alt + w 关闭当前tab页

目录树快捷键
-------------------
打开页面后，焦点默认处在目录树上

- h 折叠当前目录
- j 向下移动焦点
- k 向上移动焦点
- l 展开目录，或打开文章
- ctrl + l 或者 ctrl + mouseLeft 在新标签页打开文章
- ctrl + mouseLeftMove 复制到其它目录
- mouseLeftMove 移动到其它位置
- tab 焦点在文章和目录树之间切换

文章正文快捷键
----------------
- g 移动到页首
- shift + g 移动到页尾
- ctrl + e 编辑
- h 向左滚动页面（假如有滚动条的话）
- j 向下滚动页面
- k 向上滚动页面
- l 向右滚动页面
- [ 向上翻页
- ] 向下翻页

编辑器快捷键
-------------------
- Esc 进入vi模式
- F10 在内容区域全屏编辑器
- F11 在主区域全屏编辑器
- ctrl + s 保存
- ctrl + q 退出编辑
- ctrl + k 向上调整窗口
- ctrl + j 向下调整窗口
- shift + ctrl + k 向上滚动文章内容
- shift + ctrl + j 向下滚动文章内容

rst表格css增强
===============

表格添加 ``infobox`` 样式，使得表格标题看起来像是文章标题，用法如下

::

    .. table::
        :class: infobox

