$(function () {
	var init = function (data) {
		$('#menu').jstree({
			'core': {
				'data': {
					'url': '/menu/',
					'data': function (d) {return {'id': d.id};},
				},
				'check_callback': true,
				'multiple': false,
			},
			'force_text' : true,
			'themes' : {
				'responsive' : false,
				'variant' : 'small',
				'stripes' : true
			},
			'contextmenu' : {
				'items' : function(node) {
					var _tmp = $.jstree.defaults.contextmenu.items();
					var tmp = {};
					delete _tmp.create.action;
					_tmp.ccp.label = 'Operation';
					_tmp.create.label = "New";
					_tmp.create.submenu = {
						"create_folder" : {
							"separator_after": true,
							"label": "Folder",
							"action": function (data) {
								var inst = $.jstree.reference(data.reference),
									obj = inst.get_node(data.reference);
								var _t = 'first';
								// var parent = obj.data.current;
								if (inst.get_type(obj) == 'file') {
									_t = 'after';
									// var tmp = inst.get_node(obj.parent);
									// pos = $.inArray(obj.id, tmp.children);
								}
								inst.create_node(obj, {type: 'folder'}, _t, function (node) {
									setTimeout(function () {inst.edit(node);}, 0);
								});
							}
						},
						"create_rstfile" : {
							"label": "rstFile",
							"action": function (data) {
								var inst = $.jstree.reference(data.reference),
									obj = inst.get_node(data.reference);
								var _t = 'first';
								if (inst.get_type(obj) == 'file') _t = 'after';
								inst.create_node(obj, {type: 'file', data: {'source_type': 'restructuredtext'}}, _t, function (node) {
									setTimeout(function () {
 										inst.edit(node);
									}, 0);
								});
							}
						},
						"create_mdfile" : {
							"label": "mdFile",
							"action": function (data) {
								var inst = $.jstree.reference(data.reference),
									obj = inst.get_node(data.reference);
								var _t = 'first';
								if (inst.get_type(obj) == 'file') _t = 'after';
								inst.create_node(obj, {type: 'file', data: {'source_type': 'markdown'}}, _t, function (node) {
									setTimeout(function () {inst.edit(node);}, 0);
								});
							}
						}
					};
					tmp['create'] = _tmp.create;
					tmp['edit'] = {
						"separator_before"	: false,
						"separator_after"	: false,
						"_disabled"			: false, //(this.check("rename_node", data.reference, this.get_parent(data.reference), "")),
						"label"				: "Edit",
						/*!
						"shortcut"			: 113,
						"shortcut_label"	: 'F2',
						"icon"				: "glyphicon glyphicon-leaf",
						*/
						"action"			: function (data) {
							var inst = $.jstree.reference(data.reference),
								obj = inst.get_node(data.reference);
							inst.trigger('edit', obj);
						}
					};
					tmp['rename'] = _tmp.rename;
					tmp['delete'] = _tmp.remove;
					tmp['operation'] = _tmp.edit;
					tmp['ccp'] = _tmp.ccp;
					return tmp;
				}
			},
			'types' : {
				'file' : { 'valid_children' : [], 'icon' : 'jstree-file' },
				'folder' : {'icon' : 'jstree-folder' },
			},
			'plugins' : ['state','dnd','types','contextmenu']
		}).on('changed.jstree', function (e, data) {
			if (data && data.selected && data.selected.length &&
				data.node.type == 'file') {
				$('.editor').hide();
				$('.docs').css({height: '100%', overflow: 'visible'});
				$.ajax({
					type: 'getdoc',
					url: '/menu/',
					data: JSON.stringify({'id': data.node.id})
				}).done(function (resp) {
					if (resp.result == 'ok') {
						$('.docs').html(resp.doc);
					} else {
						alert(resp.msg);
					}
				}).fail(function (msg) {
					alert(msg);
				});
			}
		}).on('delete_node.jstree', function (e, data) {
			$.ajax({
				type: 'delete',
				url: '/menu/',
				data: JSON.stringify({'id': data.node.id, type: data.node.type})
			}).done(function (resp) {
				if (resp.result != 'ok') {
					alert(resp.msg);
					data.instance.refresh();
				}
			}).fail(function (msg) {
				alert(msg);
			});
		})
		.on('create_node.jstree', function (e, data) {
			// console.log(data);
			var parent = data.parent == '#' ? 0 : data.parent;
			var pos = data.position;
			$.ajax({
				type: 'create',
				url: '/menu/',
				data: JSON.stringify({
					parent: parent,
					pos: pos,
					type: data.node.type,
					text: data.node.text,
					source_type: data.node.data && data.node.data.source_type || ''
				})
			}).done(function (resp) {
				if (resp.result == 'ok') {
					data.instance.set_id(data.node, resp.id);
					if (data.node.type == 'file') {
						$('.docs').css({height: '50%', overflow: 'scroll'});
						data.instance.deselect_all();
						data.instance.select_node(data.node, true);
						$('.editor').show();
					}
				} else {
					alert(resp.msg);
					data.instance.refresh();
				}
			}).fail(function () {
				data.instance.refresh();
				$('.docs').css({height: '100%', overflow: 'visible'});
				$('.editor').hide();
			});
		})
		.on('rename_node.jstree', function (e, data) {
			$.ajax({
				type: 'rename',
				url: '/menu/',
				data: JSON.stringify({'id': data.node.id, 'text': data.node.text})
			}).done(function (resp) {
				// data.instance.set_id(data.node, d.id);
				// alert(resp.result);
				if (resp.result != 'ok') {
					alert(resp.msg);
					data.instance.refresh();
				}
			}).fail(function (msg) {
				alert(msg);
				data.instance.refresh();
			});
		})
		.on('move_node.jstree', function (e, data) {
			$.ajax({
				type: 'movenode',
				url: '/menu',
				data: JSON.stringify({
					id: data.node.id,
					parent: data.parent,
					pos: data.position,
					old_parent: data.old_parent,
					old_pos: data.old_position
				})
			}).done(function (resp) {
				if (resp.result != 'ok') {
					alert(resp.msg);
					data.instance.refresh();
				}
			}).fail(function (e) {
				alert(e);
				data.instance.refresh();
			})
		})
		.on('copy_node.jstree', function (e, data) {
			// $.get('?operation=copy_node', { 'id' : data.original.id, 'parent' : data.parent })
			// 	.done(function (d) {
			// 		//data.instance.load_node(data.parent);
			// 		data.instance.refresh();
			// 	})
			// 	.fail(function () {
			// 		data.instance.refresh();
			// 	});
		})
		.on('edit.jstree', function (e, obj) {
			// 获取doc源码
			$.ajax({
				type: 'getdoc',
				url: '/menu/',
				data: JSON.stringify({'id': obj.id, 'source': true})
			}).done(function (resp) {
				if (resp.result == 'ok') {
					$('#editor_area').val(resp.doc);
					$('.docs').css({height: '50%', overflow: 'scroll'});
					$('.editor').show();
				} else {
					alert(resp.msg);
				}
			}).fail(function (msg) {
				alert(msg);
			});
		})
	};
	// var digui = function (arr, title, parent) {
	// 	var data = [];
	// 	arr.forEach (function (e) {
	// 		if (typeof(e) == 'object') {
	// 			var el = e[0];
	// 			var child_arr = e.slice(1);
	// 			var _d = {'text': title[el], 'data': {'parent': parent, 'current': el}, type: 'folder'};
	// 			data.push(_d);
	// 			_d['children'] = digui(child_arr, title, el);
	// 		} else {
	// 			var _d = {
	// 				'text': title[e],
	// 				'data': {'parent': parent, 'current': e},
	// 				type: 'file'
	// 			};
	// 			data.push(_d);
	// 		}
	// 	});
	// 	return data
	// };
	var extra_event = function () {
		$('.save').on('click', function (e) {
			var inst = $('#menu').jstree(true);
			var pk = inst.get_selected().pop();
			var content = $('#editor_area').val();
			$.ajax({
				type: 'put',
				url: '/menu/',
				data: JSON.stringify({'id': pk, content: content})
			}).done(function (resp) {
				if (resp.result == 'ok') {
					alert('保存成功');
					$('.docs').css({height: '100%', overflow: 'visible'});
					$('#editor_area').val('');
					$('.editor').hide();
				} else {
					alert('保存失败: ' + resp.msg);
				}
			})
		})
	};
	// $.ajax({
	// 	url: '/menu/'
	// }).done(function (data) {
	// 	if (data['result'] == 'ok') {
	// 		var idtree = data['data']['idtree'];
	// 		var title = data['data']['title'];
	// 		var d = digui(idtree, title, 0);
	// 		init(d);
	// 		extra_event();
	// 	}
	// });
	init('s');
	extra_event()
})