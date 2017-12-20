from django.contrib import admin
from main.models import DocModel


def make_publish(modeladmin, reqeust, qs):
	qs.update(status=1)
	# make_publish.short_description = 'Mark selected doc as published'


def make_unpublish(modeladmin, reqeust, qs):
	qs.update(status=0)


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
