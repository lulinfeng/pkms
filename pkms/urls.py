"""docs URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.10/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.conf import settings
from django.urls import re_path
from django.conf.urls.static import static
from django.contrib import admin
from main import views as main_view

urlpatterns = [
    re_path(r'^$', main_view.DocView.as_view()),
    re_path(r'^menu/$', main_view.MenuTree.as_view()),
    re_path(r'^upload/$', main_view.upload_file),
    re_path(r'^publish/$', main_view.publish_doc),
    re_path(r'^unpublish/$', main_view.unpublish_doc),
    re_path(r'^exportpdf/$', main_view.export_pdf),
    re_path(r'^exportdocx/$', main_view.export_docx),
    re_path(r'^what_ip/$', main_view.what_ip),
    re_path(r'^admin/', admin.site.urls),
]

if settings.DEBUG is True:
    # 没有配制nginx时，添加下面静态地址
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.PUBLIC_HTML_URL, document_root=settings.PUBLIC_HTML_ROOT)
    urlpatterns += static('/static_html/', document_root=settings.PUBLIC_STATIC_HTML_ROOT)

