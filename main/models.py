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
			('doc.publish', 'can publish doc'),
			('doc.unpublish', 'can unpublish doc'),
		)

	def __str__(self):
		return self.title

	def __unicode__(self):
		return self.title

	# STATUS = {
	# 	'file': 1,
	# 	'folder': 1 << 1,
	# 	'pwd': 1 << 2,
	# 	'unpublish': 1 << 3,
	# }

	isdel = models.BooleanField(default=False)
	# 1 published ； status 方便过滤出公开的节点， 因为 doctype & 8 == 0 这种方式sql查询比较麻烦
	status = models.SmallIntegerField(default=0)
	# TODO: 改成列表，支持标签引用
	parent = models.TextField(default='[]')
	# file 1, folder 2, pwd 4, unpublish 8
	doctype = models.IntegerField(default=1)
	# source_type: ''|'rst'|'md'
	source_type = models.CharField(max_length=20, default='', blank=True)
	# multiple count is count parents, more than 1 to show multiple tip.
	mulcount = models.SmallIntegerField(default=1)
	tag = models.CharField(max_length=20, default='', blank=True)
	# node password
	pwd = models.CharField(max_length=20, default='', blank=True)
	newtime = models.DateTimeField(auto_now_add=True)
	changetime = models.DateTimeField(auto_now=True)

	# 静态文件名，0:16为静态，9:24为public的静态文件名
	static_name = models.CharField(max_length=50, default='#')
	# static_name = models.CharField(max_length=24, default='#')

	title = models.CharField(max_length=50)
	content = models.TextField(default='', blank=True)


class SortedCatlogModel(models.Model):
	isdel = models.BooleanField(default=False)
	# 目录id 对应 doc 的id
	folder = models.IntegerField(unique=True)
	children = models.BinaryField()
