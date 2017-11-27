;(function (page) {
	page.base = {
		line: 30
		,page: 550
		,docs_bottom: 50
		,editor_top: 50
		,fullScreen: false
		,menu_option: {
			'core': {
				'data': {
					'url': '/menu/',
					'data': function (d) {return {'id': d.id}},
				},
				'check_callback': true,
				'multiple': false,
				'themes' : {
					'name': 'default-dark',
					'url': "/static/modules/jstree/themes/default-dark/style.min.css"
				}
			},
			'force_text' : true,
			'types' : {
				'file' : { 'valid_children' : [], 'icon' : 'jstree-file' },
				'folder' : {'icon' : 'jstree-folder' },
			},
			'plugins' : ['state','dnd','types','contextmenu', 'themes']
		}
		// contextmenu
		,submenu_option : {
			select_node: false
			,'items' : function(node) {
				var _tmp = $.jstree.defaults.contextmenu.items()
				var tmp = {}
				delete _tmp.create.action
				_tmp.ccp.label = 'Operation'
				_tmp.create.label = "New"
				_tmp.create.submenu = {
					"create_folder" : {
						"separator_after": true,
						"label": "Folder",
						"action": function (data) {page.op.addMenu(data, 'folder', '')}
					},
					"create_rstfile" : {
						"label": "rstDoc",
						"action": function (data) {page.op.addMenu(data, 'file', 'rst')}
					},
					"create_mdfile" : {
						"label": "mdDoc",
						"action": function (data) {page.op.addMenu(data, 'file', 'md')}
					}
				}
				tmp['create'] = _tmp.create
				tmp['edit'] = {
					"separator_before"	: false,
					"separator_after"	: false,
					"_disabled"			: false,
					"label"				: "Edit",
					"action"			: function (data) {
						var inst = $.jstree.reference(data.reference),
							obj = inst.get_node(data.reference)
						inst.trigger('edit', obj)
					}
				}
				tmp['rename'] = _tmp.rename
				tmp['delete'] = _tmp.remove
				tmp['operation'] = _tmp.edit
				tmp['ccp'] = _tmp.ccp
				return tmp
			}
		}
	}
	window.page = page
})(window.page || {})

page.api = {
	addMenu: function (pos, data) {
		$.ajax({
			type: 'create',
			url: '/menu/',
			data: JSON.stringify({
				parent: data.node.parent,
				pos: pos,
				type: data.node.type,
				text: data.node.text,
				source_type: data.node.data && data.node.data.source_type || ''
			})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				data.instance.set_id(data.node, resp.id)
				if (data.node.type == 'file') {
					$('#docs').css({bottom: page.base.docs_bottom + '%'})
					data.instance.deselect_all()
					data.instance.select_node(data.node, true)
					$('#editor').css({top: page.base.editor_top + '%'}).show()
					page.editor.session.setValue('')
					page.editor.focus()
				}
			} else {
				alert(resp.msg)
				data.instance.refresh()
			}
		}).fail(function () {
			data.instance.refresh()
			$('#docs').css({bottom: 0})
			$('#editor').hide()
		})
	}
	,renameMenu: function (e, data) {
		if (data.node.data && data.node.data.create) {
			delete data.node.data.create
			if (data.node.parent == '#') data.node.parent = 0
			var pos = $.inArray(data.node.id, data.instance.get_node(data.node.parent).children)
			page.api.addMenu(pos, data)
			return
		}
		$.ajax({
			type: 'rename',
			url: '/menu/',
			data: JSON.stringify({'id': data.node.id, 'text': data.node.text})
		}).done(function (resp) {
			if (resp.result != 'ok') {
				alert(resp.msg)
				data.instance.refresh()
			}
		}).fail(function (msg) {
			alert(msg)
			data.instance.refresh()
		})
	}
	,moveMenu: function (e, data) {
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
				alert(resp.msg)
				data.instance.refresh()
			}
		}).fail(function (e) {
			alert(e)
			data.instance.refresh()
		})
	}
	,saveDoc: function (editor) {
		var pk = page.menu.get_selected().pop()
		return $.ajax({
			type: 'put',
			url: '/menu/',
			data: JSON.stringify({'id': pk, content: editor.getValue()})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				$('#docs').html(resp.doc)
			} else {
				alert('保存失败: ' + resp.msg)
			}
		})
	}
	,getDoc: function (e, data) {
		if (data && data.selected && data.selected.length && data.node.type == 'file') {
			$.ajax({
				type: 'getdoc',
				url: '/menu/',
				data: JSON.stringify({'id': data.node.id})
			}).done(function (resp) {
				if (resp.result == 'ok') {
					$('#docs').html(resp.doc).css('bottom', 0)
					$('#editor').hide()
				} else {
					alert(resp.msg)
				}
			}).fail(function (msg) {
				alert(msg)
			})
		}
	}
	,editDoc: function (e, obj) {
		page.menu.deselect_node(page.menu.get_selected(), true)
		page.menu.select_node(obj.id, true)
		$.ajax({
			type: 'getdoc',
			url: '/menu/',
			data: JSON.stringify({'id': obj.id, 'source': true})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				$('#docs').html(resp.doc).css({'bottom': page.base.docs_bottom + '%'});
				page.editor.session.setValue(resp.source);
				page.editor.focus();
				$('#editor').show();
			} else {
				alert(resp.msg);
			}
		}).fail(function (msg) {
			alert(msg);
		});
	}
	,delDoc: function (e, data) {
		if (data.node.id == 0) {
			alert('can not delet the root node!')
		}
		if (confirm('delete the document?')) {
			$.ajax({
				type: 'delete',
				url: '/menu/',
				data: JSON.stringify({'id': data.node.id, type: data.node.type})
			}).done(function (resp) {
				if (resp.result != 'ok') {
					alert(resp.msg)
					data.instance.refresh()
				}
			}).fail(function (msg) {
				alert(msg)
			})
		}
	}
	,saveDocQuitEditor: function (editor) {
		page.api.saveDoc(editor).done(function (resp) {
			if (resp.result == 'ok') {
				$('#docs').css('bottom', 0).focus()
				$('#editor').hide()
			}
		})
	}
}

page.op = {
	addMenu: function (data, type, source) {
		var inst = $.jstree.reference(data.reference),
			obj = inst.get_node(data.reference),
			_t = obj.type == 'file' ? 'after' : 'first',
			o = {'type': type, 'data': {create: true, 'source_type': source}}
		inst.create_node(obj, o, _t, function (node) {inst.edit(node)})
	}
	,quitEditor: function (editor) {
		$('#editor').hide()
		var sl = page.menu.get_selected()
		page.menu.element.find('#'+ sl + '_anchor').click()
		$('#docs').css({bottom: 0}).focus()
	}
	,lowerEditor: function (editor) {
		if (page.base.docs_bottom < 95) {
			page.base.docs_bottom += 5
			page.base.editor_top -= 5
			if (page.base.editor_top <= 5) {
				$('#editor').css({top: '40px'})
			} else {
				$('#editor').css({top: page.base.editor_top + '%'})
			}
			$('#docs').css({bottom: page.base.docs_bottom + '%'})
			page.editor.resize()
		}
	}
	,raiseEditor: function (editor) {
		if (page.base.docs_bottom > 10) {
			page.base.docs_bottom -= 5
			page.base.editor_top += 5
			$('#editor').css({top: page.base.editor_top + '%'})
			$('#docs').css({bottom: page.base.docs_bottom + '%'})
			page.editor.resize()
		}
	}
	,fullScreenEditor: function (editor) {
		if (!page.base.fullScreen) {
			$('#editor').css({top: '40px'})
		} else {
			$('#editor').css({top: page.base.editor_top + '%'})
		}
		page.base.fullScreen = !page.base.fullScreen
		page.editor.resize()
	}
	,vimOpMenu: function (e) {
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
	}
	,vimOpSubmenu: function (e) {
		var o = null
		switch(e.which) {
			case 72: //h
				o = $(e.target).parents('ul')
				if (o.length > 1) {
					o.first().hide().find(".vakata-context-hover").removeClass("vakata-context-hover")
					$(this).find(".vakata-context-hover").last().children('a').focus()
				}
				e.stopImmediatePropagation()
				e.preventDefault()
				break
			case 75: // k
				o = $(this).find("ul:visible").addBack().last().children(".vakata-context-hover").removeClass("vakata-context-hover").prevAll("li:not(.vakata-context-separator)").first()
				if(!o.length) { o = $(this).find("ul:visible").addBack().last().children("li:not(.vakata-context-separator)").last() }
				o.addClass("vakata-context-hover").children('a').focus()
				e.stopImmediatePropagation()
				e.preventDefault()
				break
			case 76: // l
				$(this).find(".vakata-context-hover").last().children("ul").show().children("li:not(.vakata-context-separator)").removeClass("vakata-context-hover").first().addClass("vakata-context-hover").children('a').focus()
				e.stopImmediatePropagation()
				e.preventDefault()
				break
			case 74: // j
				o = $(this).find("ul:visible").addBack().last().children(".vakata-context-hover").removeClass("vakata-context-hover").nextAll("li:not(.vakata-context-separator)").first()
				if(!o.length) { o = $(this).find("ul:visible").addBack().last().children("li:not(.vakata-context-separator)").first() }
				o.addClass("vakata-context-hover").children('a').focus()
				e.stopImmediatePropagation()
				e.preventDefault()
				break
			case 27:
				$.vakata.context.hide()
				page.menu.get_node(page.menu.get_selected(), 1).find('a').focus()
				e.preventDefault()
				break
			default:
				break
		}
	}
	,lowerDoc: function (el) {
		var h = el.scrollHeight - el.clientHeight
		if (el.scrollTop < h) {
			if (h - el.scrollTop < page.base.line) {
				el.scrollTop = h
			} else {
				el.scrollTop += page.base.line
			}
		}
	}
	,raiseDoc: function (el) {
		if (el.scrollTop > 0) {
			if (el.scrollTop < page.base.line) {
				el.scrollTop = 0
			} else {
				el.scrollTop -= page.base.line
			}
		}
	}
}

page.event = {
	vimReadDoc: function () {
		$('#main').on('keydown', '#docs', function (e) {
			switch(e.which) {
				case 71: // home g end G
					e.preventDefault()
					var h = this.scrollHeight - this.clientHeight
					if (e.shiftKey) {
						this.scrollTop = h
					} else {
						this.scrollTop = 0
					}
					break
				case 72: // left h
					e.preventDefault()
					if (this.scrollLeft > 0) {
						if (this.scrollLeft < page.base.line) {
							this.scrollLeft = 0
						} else {
							this.scrollLeft -= page.base.line
						}
					}
					break
				case 74: // down j
					e.preventDefault()
					page.op.lowerDoc(this)
					break
				case 75: // up k
					e.preventDefault()
					page.op.raiseDoc(this)
					break
				case 76: // right l
					e.preventDefault()
					var w = this.scrollWidth - this.clientWidth
					if (this.scrollLeft < w) {
						if (w - this.scrollLeft < page.base.line) {
							this.scrollLeft = w
						} else {
							this.scrollLeft += page.base.line
						}
					}
					break
				case 219: // pgup [
					e.preventDefault()
					if (this.scrollTop > 0) {
						if (this.scrollTop < page.base.page) {
							this.scrollTop = 0
						} else {
							this.scrollTop -= page.base.page
						}
					}
					break
				case 221: // pgdn ]
					e.preventDefault()
					var h = this.scrollHeight - this.clientHeight
					if (this.scrollTop < h) {
						if (h - this.scrollTop < page.base.page) {
							this.scrollTop = h
						} else {
							this.scrollTop += page.base.page
						}
					}
					break
				default:
					break
			}
		})
	}
	,menuOperation: function () {
		page.menu.element.on('changed.jstree', page.api.getDoc)
		.on('delete_node.jstree', page.api.delDoc)
		.on('rename_node.jstree', page.api.renameMenu)
		.on('move_node.jstree', page.api.moveMenu)
		.on('edit.jstree', page.api.editDoc)
		.on('keydown.jstree', '.jstree-anchor', $.proxy(page.op.vimOpMenu, page.menu))
		.on('ready.jstree set_state.jstree', function (e, obj) {
			page.menu.element.focus()
			var sl = page.menu.get_selected()
			page.menu.element.find('#'+ sl + '_anchor').focus()
		})
	}
	,submenuOperation: function () {
		$('body').on('keydown', '.vakata-context', page.op.vimOpSubmenu)
	}
}

$(function () {
	page.editor = (function () {
		var _t = ace.edit('editor')
		_t.setTheme("ace/theme/twilight")
		_t.session.setMode("ace/mode/rst")
		_t.setKeyboardHandler("ace/keyboard/vim")
		_t.commands.addCommand({name: 'save', bindKey: {win: "Ctrl-S", "mac": "Cmd-S"},
			exec: page.api.saveDoc
		})
		_t.commands.addCommand({name: 'quit', exec: page.op.quitEditor })
		_t.commands.addCommand({name: 'savequit', exec: page.api.saveDocQuitEditor })
		_t.commands.addCommand({name: 'raise', bindKey: 'Ctrl-J', exec: page.op.raiseEditor})
		_t.commands.addCommand({name: 'lower', bindKey: 'Ctrl-K', exec: page.op.lowerEditor})
		_t.commands.addCommand({name: "Toggle Fullscreen", bindKey: "F11",
			exec: page.op.fullScreenEditor
		})
		_t.commands.addCommand({name: 'docScrollUp', bindKey: 'Ctrl-Shift-K', exec: function (editor) {
			page.op.raiseDoc(document.getElementById('docs'))
		}})
		_t.commands.addCommand({name: 'docScrollDown', bindKey: 'Ctrl-Shift-J', exec: function (editor) {
			page.op.lowerDoc(document.getElementById('docs'))
		}})
		return _t
	})()
	ace.config.loadModule("ace/keyboard/vim", function(m) {
		var VimApi = require("ace/keyboard/vim").CodeMirror.Vim
		VimApi.defineEx("write", "w", function(cm, input) {
			cm.ace.execCommand("save")
		})
		VimApi.defineEx("quit", "q", function(cm, input) {
			cm.ace.execCommand("quit")
		})
		VimApi.defineEx("wqrite", "wq", function(cm, input) {
			cm.ace.execCommand("savequit")
		})
	})
	page.base.menu_option.contextmenu = page.base.submenu_option
	page.menu = $.jstree.create('#menu', page.base.menu_option)
	page.event.vimReadDoc()
	page.event.menuOperation()
	page.event.submenuOperation()
})
