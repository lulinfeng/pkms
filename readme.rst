
pkms 以目录树节点方式，来管理文章资料的博客系统。 公开的文章可被搜索引擎收录，未公开或
设置里密码的节点，访客无法访问。

pkms 支持reStructuredText和MarkDown，文章节点可多次复制到其它目录下，不增加存储空间，
修改其中一份，所有复制的节点同时生效。 可从其它网页上复制文字表格，粘贴到pkms里自动转为
reStructuredText 代码。

Usage
=======
pkms 基本都是靠快捷键操作，以下是快捷键介绍

全局快捷键
----------

- alt + shift + , 向左，alt + shift + . 向右调整目录树和内容区域大小
- alt + shift + n 显示，alt + shift + m 隐藏目录树
- alt + 1,2,3...n 切换到第n个tab页
- alt + w 关闭当前tab页

目录树快捷键
-------------------
打开页面后，焦点默认处在目录树上

- H 向左移动焦点，碰到目录则收起目录
- J 向下移动焦点
- K 向上移动焦点
- L 向右移动焦点，若遇到闭合的目录则展开目录，若是文章节点则打开文章
- ctrl +  或者 ctrl + mouseLeft 在新标签页打开文章
- ctrl + mouseLeftMove 复制到其它目录
- mouseLeftMove 移动到其它位置
- tab 焦点在文章和目录树之间切换

文章正文快捷键
----------------
- g 移动到页首
- shift + g 移动到页尾
- ctrl + e 编辑
- h/j/k/l 向左/下/上/右滚动页面（假如有滚动条的话）
- [(u) 向上翻页
- ](d) 向下翻页

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
    pip install -r requirements.txt
    python manage.py makemigrations
    python manage.py migrate

and then run developer server::

    python manage.py runserver

在浏览器上打开 ``http://localhost:8000``, 应该就可以看到你的服务器了
在创建节点内容之前，需要创建一个用户。

::

    python manage.py createsuperuser

然后按提示输入超级用户名和密码

部署
======
参考 `使用gunicorn部署 <gunicorn.rst>`_
