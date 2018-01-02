import json
from django.contrib import admin
from main.models import DocModel
from main.views import static_doc, unstatic_doc


def make_publish(modeladmin, reqeust, qs):
	root = False
	for d in qs.filter(status=0):
		if d.doctype | 1 == d.doctype:
			d.doctype = (d.doctype | 8) ^ 8
			d.status = 1
			static_doc(d)
			if root is False:
				root = 0 in json.loads(d.parent)
	# may be has childen published on up opration
	# so not to filter status=0
	for d in qs:
		# static all folder
		if d.doctype | 2 == d.doctype:
			d.doctype = (d.doctype | 8) ^ 8
			d.status = 1
			static_doc(d)
			if root is False:
				root = 0 in json.loads(d.parent)
	if root:
		static_doc(type('', (object,), {'doctype': 2, 'status': 1, 'pk': 0, 'parent': '[]'}))


def make_unpublish(modeladmin, reqeust, qs):
	parents = set()
	for d in qs.filter(status=1):
		d.status = 0
		d.doctype |= 8
		unstatic_doc(d)
		parents.update(json.loads(d.parent))

	for p in DocModel.objects.filter(pk__in=parents):
		static_doc(p)
	if 0 in parents:
		static_doc(type('', (object,), {'doctype': 2, 'status': 1, 'pk': 0, 'parent': '[]'}))


@admin.register(DocModel)
class DocAdmin(admin.ModelAdmin):
	list_display = (
		'id',
		'title',
		'status',
		'isdel',
		'parent',
		'doctype',
		'source_type',
		'newtime',
	)
	list_display_links = ('title', )
	actions = [make_publish, make_unpublish]

	def get_actions(self, request):
		actions = super(DocAdmin, self).get_actions(request)
		if 'delete_selected' in actions:
			del actions['delete_selected']
		return actions
