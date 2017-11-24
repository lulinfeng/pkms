$(function () {
	page = {
		editor: ace.edit("editor"),
		menuElement: $('#menu').jstree({
			'core': {
				'data': {
					'url': '/menu/',
					'data': function (d) {return {'id': d.id};},
				},
				'check_callback': true,
				'multiple': false,
				'themes' : {
					'name': 'default-dark',
					'url': "/static/modules/jstree/themes/default-dark/style.min.css"
				}
			},
			'force_text' : true,
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
			'plugins' : ['state','dnd','types','contextmenu', 'themes']
		}),
		menu: $('#menu').jstree(),
		line: 30,
		page: 550,
		// docs height and editor height initial 50%
		docs_h: 50,
		editor_h: 50,
		fullScreen: false,
	};
	var events = {
		docMainEvt: function () {
			$('#main').on('keydown', '#docs', function (e) {
				switch(e.which) {
					case 71: // home g end G
						e.preventDefault();
						var h = this.scrollHeight - this.clientHeight;
						if (e.shiftKey) {
							this.scrollTop = h;
						} else {
							this.scrollTop = 0;
						}
						break;
					case 72: // left h
						e.preventDefault();
						if (this.scrollLeft > 0) {
							if (this.scrollLeft < page.line) {
								this.scrollLeft = 0;
							} else {
								this.scrollLeft -= page.line;
							}
						}
						break;
					case 74: // down j
						e.preventDefault();
						var h = this.scrollHeight - this.clientHeight;
						if (this.scrollTop < h) {
							if (h - this.scrollTop < page.line) {
								this.scrollTop = h;
							} else {
								this.scrollTop += page.line;
							}
						}
						break;
					case 75: // up k
						e.preventDefault();
						if (this.scrollTop > 0) {
							if (this.scrollTop < page.line) {
								this.scrollTop = 0;
							} else {
								this.scrollTop -= page.line;
							}
						}
						break;
					case 76: // right l
						e.preventDefault();
						var w = this.scrollWidth - this.clientWidth;
						if (this.scrollLeft < w) {
							if (w - this.scrollLeft < page.line) {
								this.scrollLeft = w;
							} else {
								this.scrollLeft += page.line;
							}
						}
						break;
					case 219: // pgup [
						e.preventDefault();
						if (this.scrollTop > 0) {
							if (this.scrollTop < page.page) {
								this.scrollTop = 0;
							} else {
								this.scrollTop -= page.page;
							}
						}
						break;
					case 221: // pgdn ]
						e.preventDefault();
						var h = this.scrollHeight - this.clientHeight;
						if (this.scrollTop < h) {
							if (h - this.scrollTop < page.page) {
								this.scrollTop = h;
							} else {
								this.scrollTop += page.page;
							}
						}
						break;
					default:
						break;
				}
			});
		},
		menuEvt: function () {
			page.menuElement.on('changed.jstree', function (e, data) {
				if (data && data.selected && data.selected.length &&
					data.node.type == 'file') {
					$('#editor').hide();
					$.ajax({
						type: 'getdoc',
						url: '/menu/',
						data: JSON.stringify({'id': data.node.id})
					}).done(function (resp) {
						if (resp.result == 'ok') {
							$('#docs').html(resp.doc);
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
							$('#docs').css({height: '50%', overflow: 'scroll'});
							data.instance.deselect_all();
							data.instance.select_node(data.node, true);
							$('#editor').show();
						}
					} else {
						alert(resp.msg);
						data.instance.refresh();
					}
				}).fail(function () {
					data.instance.refresh();
					$('#docs').css({height: '100%', overflow: 'visible'});
					$('#editor').hide();
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
				});
			})
			.on('edit.jstree', function (e, obj) {
				// 获取doc源码
				$.ajax({
					type: 'getdoc',
					url: '/menu/',
					data: JSON.stringify({'id': obj.id, 'source': true})
				}).done(function (resp) {
					if (resp.result == 'ok') {
						$('#docs').css({'bottom': page.docs_h + '%'})
						page.editor.setValue(resp.doc);
						page.editor.focus();
						$('#editor').show();
					} else {
						alert(resp.msg);
					}
				}).fail(function (msg) {
					alert(msg);
				});
			})
			.on('keydown.jstree', '.jstree-anchor', $.proxy(function (e) {
				if (e.target.tagName && e.target.tagName.toLowerCase() == 'input') {return;}
				var o = null;
				switch(e.which) {
					case 72: // left h
						e.preventDefault();
						if(this.is_open(e.currentTarget)) {
							this.close_node(e.currentTarget);
						}
						else {
							o = this.get_parent(e.currentTarget);
							if(o && o.id !== $.jstree.root) { this.get_node(o, true).children('.jstree-anchor').focus(); }
						}
						break;
					case 75: // up k
						e.preventDefault();
						o = this.get_prev_dom(e.currentTarget);
						if(o && o.length) { o.children('.jstree-anchor').focus(); }
						break;
					case 76: // right l
						e.preventDefault();
						if(this.is_closed(e.currentTarget)) {
							this.open_node(e.currentTarget, function (o) { this.get_node(o, true).children('.jstree-anchor').focus(); });
						}
						else if (this.is_open(e.currentTarget)) {
							o = this.get_node(e.currentTarget, true).children('.jstree-children')[0];
							if(o) { $(this._firstChild(o)).children('.jstree-anchor').focus(); }
							else {
								e.type = "click";
								$(e.currentTarget).trigger(e);
							}
						} else {
							e.type = "click";
							$(e.currentTarget).trigger(e);
						}
						break;
					case 74: // down j
						e.preventDefault();
						o = this.get_next_dom(e.currentTarget);
						if(o && o.length) { o.children('.jstree-anchor').focus(); }
						break;
					case 71: // home g
						e.preventDefault();
						if (e.shiftKey) {
							this.element.find('.jstree-anchor').filter(':visible').last().focus();
						} else {
							o = this._firstChild(this.get_container_ul()[0]);
							if(o) { $(o).children('.jstree-anchor').filter(':visible').focus(); }
						}
						break;
					case 68: // d pop submenu
						this.show_contextmenu(e.currentTarget, e.pageX, e.pageY, e);
						break;
					default:
						break;
				}
			}, page.menu))
			.on('ready.jstree set_state.jstree', function (e, obj) {
				page.menuElement.focus();
				var sl = page.menu.get_selected();
				page.menuElement.find('#'+ sl + '_anchor').focus();
			});
		},
		subMenuEvt: function () {
			// e.preventDefault(); jstree.contextmenu.js : 637
			$('body').on('keydown', '.vakata-context', function (e) {
				var o = null;
				switch(e.which) {
					case 72: //h
						o = $(e.target).parents('ul')
						if (o.length > 1) {
							o.first().hide().find(".vakata-context-hover").removeClass("vakata-context-hover");
							$(this).find(".vakata-context-hover").last().children('a').focus();
						}
						e.stopImmediatePropagation();
						e.preventDefault();
						break;
					case 75: // k
						o = $(this).find("ul:visible").addBack().last().children(".vakata-context-hover").removeClass("vakata-context-hover").prevAll("li:not(.vakata-context-separator)").first();
						if(!o.length) { o = $(this).find("ul:visible").addBack().last().children("li:not(.vakata-context-separator)").last(); }
						o.addClass("vakata-context-hover").children('a').focus();
						e.stopImmediatePropagation();
						e.preventDefault();
						break;
					case 76: // l
						$(this).find(".vakata-context-hover").last().children("ul").show().children("li:not(.vakata-context-separator)").removeClass("vakata-context-hover").first().addClass("vakata-context-hover").children('a').focus();
						e.stopImmediatePropagation();
						e.preventDefault();
						break;
					case 74: // j
						o = $(this).find("ul:visible").addBack().last().children(".vakata-context-hover").removeClass("vakata-context-hover").nextAll("li:not(.vakata-context-separator)").first();
						if(!o.length) { o = $(this).find("ul:visible").addBack().last().children("li:not(.vakata-context-separator)").first(); }
						o.addClass("vakata-context-hover").children('a').focus();
						e.stopImmediatePropagation();
						e.preventDefault();
						break;
					case 27:
						$.vakata.context.hide();
						page.menu.get_node(page.menu.get_selected(), 1).find('a').focus();
						e.preventDefault();
						break;
					default:
						break;
				}
			})
		}
	};

	var init = function (data) {
		events.docMainEvt();
		events.menuEvt();
		events.subMenuEvt();
		page.editor.setTheme("ace/theme/twilight");
		page.editor.session.setMode("ace/mode/rst");
		page.editor.setKeyboardHandler("ace/keyboard/vim");
		page.editor.commands.addCommand({
			name: 'save',
			bindKey: {win: "Ctrl-S", "mac": "Cmd-S"},
			exec: save
		});
		page.editor.commands.addCommand({
			name: 'quit',
			exec: quit
		});
		page.editor.commands.addCommand({
			name: 'raise',
			bindKey: 'Ctrl-K',
			exec: function (editor) {
				if (page.docs_h > 5) {
					page.docs_h -= 5
					page.editor_h += 5
					$('#editor').css({top: page.editor_h + '%'})
					$('#docs').css({bottom: page.docs_h + '%'})
					page.editor.resize()
				}
			}
		});
		page.editor.commands.addCommand({
			name: 'lower',
			bindKey: 'Ctrl-J',
			exec: function (editor) {
				if (page.docs_h < 95) {
					page.docs_h += 5
					page.editor_h -= 5
					$('#editor').css({top: page.editor_h + '%'})
					$('#docs').css({bottom: page.docs_h + '%'})
					page.editor.resize()
				}
			}
		});
		page.editor.commands.addCommand({
			name: "Toggle Fullscreen",
			bindKey: "F11",
			exec: function (editor) {
				if (!page.fullScreen) {
					$('#editor').css({top: '40px'})
				} else {
					$('#editor').css({top: page.editor_h + '%'})
				}
				page.fullScreen = !page.fullScreen
				page.editor.resize()
			}
		})

		ace.config.loadModule("ace/keyboard/vim", function(m) {
			var VimApi = require("ace/keyboard/vim").CodeMirror.Vim;
			VimApi.defineEx("write", "w", function(cm, input) {
				cm.ace.execCommand("save");
			});
			VimApi.defineEx("quit", "q", function(cm, input) {
				cm.ace.execCommand("quit");
			});
		});
	};

	var save = function (editor) {
		var inst = $('#menu').jstree(true);
		var pk = inst.get_selected().pop();
		var content = editor.getValue();
		$.ajax({
			type: 'put',
			url: '/menu/',
			data: JSON.stringify({'id': pk, content: content})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				$('#docs').html(resp.doc);
			} else {
				alert('保存失败: ' + resp.msg);
			}
		});
	};
	var quit = function (editor) {
		$('#editor').hide();
		var sl = page.menu.get_selected();
		page.menuElement.find('#'+ sl + '_anchor').click();
		$('#docs').css({bottom: 0}).focus();
	};
	init('s');
});
