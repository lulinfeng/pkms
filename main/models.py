# coding: utf-8
from __future__ import unicode_literals

from django.db import models


class DocModel(models.Model):

	class Meta:
		verbose_name = "DocModel"
		verbose_name_plural = "DocModels"
		permissions = (
			('doc.create', 'can create doc'),
			('doc.edit', 'can edit doc'),
			('doc.delete', 'can delete doc'),
			('doc.rename', 'can rename doc'),
			('menu.movenode', 'can move node'),
			('menu.setpwd', 'can password doc'),
		)

	def __str__(self):
		return self.title

	ispwd = models.BooleanField(default=False)
	isdel = models.BooleanField(default=False)
	status = models.SmallIntegerField(default=0)
	# TODO: 改成列表，支持标签引用
	parent = models.IntegerField(default=0)
	# doc_type: --file(docs), --folder(menu)
	doctype = models.CharField(max_length=10, default='file')
	# source_type: ''|'restructuredtext'|'markdown'
	source_type = models.CharField(max_length=20, default='')
	tag = models.CharField(max_length=20, default='')
	pwd = models.CharField(max_length=20, default='')
	newtime = models.DateTimeField(auto_now_add=True)
	changetime = models.DateTimeField(auto_now=True)
	title = models.CharField(max_length=50)
	content = models.TextField(default='')


class SortedCatlogModel(models.Model):
	folder = models.IntegerField(unique=True)
	children = models.BinaryField()
