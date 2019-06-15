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
from django.conf.urls import url
from django.conf.urls.static import static
from django.contrib import admin
from main import views as main_view

urlpatterns = [
    url(r'^$', main_view.DocView.as_view()),
    url(r'^menu/$', main_view.MenuTree.as_view()),
    url(r'^upload/$', main_view.upload_file),
    url(r'^publish/$', main_view.publish_doc),
    url(r'^unpublish/$', main_view.unpublish_doc),
    url(r'^exportpdf/$', main_view.export_pdf),
    url(r'^exportdocx/$', main_view.export_docx),
    url(r'^admin/', admin.site.urls),
]

if settings.DEBUG is True:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
