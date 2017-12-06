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
					'data': function (d) {
						return d.data || {id: '#'}
					}
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
				'pwdfile' : { 'valid_children' : [], 'icon' : 'jstree-file' },
				'folder' : {'icon' : 'jstree-folder' },
				'pwdfolder' : {'icon' : 'jstree-folder' },
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
				tmp['password'] = {
					label: 'Password'
					,action: function (data) {
						// set or modify password.
						page.pwdpanel.setpwd(data)
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
				parent: data.instance.get_node(data.node.parent).data.id,
				pos: pos,
				type: data.node.type,
				text: data.node.text,
				source_type: data.node.data && data.node.data.source_type || ''
			})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				data.node.data.id = resp.id
				if (data.node.type == 'file') {
					$('#docs').css({bottom: page.base.docs_bottom + '%'}).empty()
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
			var pos = $.inArray(data.node.id, data.instance.get_node(data.node.parent).children)
			page.api.addMenu(pos, data)
			return
		}
		$.ajax({
			type: 'rename',
			url: '/menu/',
			data: JSON.stringify({'id': data.node.data.id, 'text': data.node.text})
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
				id: data.node.data.id,
				parent: data.instance.get_node(data.parent).data.id,
				pos: data.position,
				old_parent: data.instance.get_node(data.old_parent).data.id,
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
		var pk = page.menu.get_selected(true)[0].data.id
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
				data: JSON.stringify(data.node.data)
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
		page.menu.select_node(obj, true)
		$.ajax({
			type: 'getdoc',
			url: '/menu/',
			data: JSON.stringify({'id': obj.data.id, 'source': true})
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
		if (data.node.data.id == 0) {
			alert('can not delet the root node!')
		}
		if (confirm('delete the document?')) {
			$.ajax({
				type: 'delete',
				url: '/menu/',
				data: JSON.stringify({'id': data.node.data.id, type: data.node.type})
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
	,setpwd: function (id, pwd) {
		$.ajax({
			type: 'setpwd',
			url: '/menu/',
			data: JSON.stringify({id: id, pwd: pwd})
		}).done(function (resp) {
			page.menu.get_node(page.menu.get_selected(), true).find('a').focus()
			if (resp.result == 'ok') {
				page.message('success')
			} else {
				page.alert('', 'failed to set password')
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
		page.menu.element//.on('changed.jstree', page.api.getDoc)
		.on('changed.jstree', function (e, data) {
			if (data.action == 'select_node') {
				if (data.node.type.startsWith('pwd')) {
					// var t = data.node.type.endsWith('file') ? 'getdoc' : 'get'
					page.pwdpanel.show(e, function (pwd) {
						if (data.node.type.endsWith('file')) {
							$.ajax({
								url: '/menu/'
								,type: 'getdoc'
								,data: JSON.stringify({id: data.node.data.id, pwd: pwd})
							}).done(function (resp) {
								if (resp.result == 'ok') {
									$('#docs').html(resp.doc).css('bottom', 0)
									$('#editor').hide()
									$(e.target).focus()
								} else {
									page.message('permission die')
									$(e.target).focus()
								}
							})
						} else {
							obj = page.menu.get_node(data.node);
							obj.data.pwd = pwd
							page.menu._load_node(obj, $.proxy(function (status) {
								obj = this._model.data[obj.id];
								obj.state.loading = false;
								obj.state.loaded = status;
								obj.state.failed = !obj.state.loaded;
								var dom = this.get_node(obj, true), i = 0, j = 0, m = this._model.data, has_children = false;
								for(i = 0, j = obj.children.length; i < j; i++) {
									if(m[obj.children[i]] && !m[obj.children[i]].state.hidden) {
										has_children = true;
										break;
									}
								}
								if(obj.state.loaded && dom && dom.length) {
									dom.removeClass('jstree-closed jstree-open jstree-leaf');
									if (!has_children) {
										dom.addClass('jstree-leaf');
									}
									else {
										if (obj.id !== '#') {
											dom.addClass(obj.state.opened ? 'jstree-open' : 'jstree-closed');
										}
									}
								}
								dom.removeClass("jstree-loading").attr('aria-busy',false);
								/**
								 * triggered after a node is loaded
								 * @event
								 * @name load_node.jstree
								 * @param {Object} node the node that was loading
								 * @param {Boolean} status was the node loaded successfully
								 */
								this.trigger('load_node', { "node" : obj, "status" : status });
							}, page.menu));
							$(e.target).focus()
						}
					})
				} else {
					page.api.getDoc(e, data)
				}
			}
		})
		.on('delete_node.jstree', page.api.delDoc)
		.on('rename_node.jstree', page.api.renameMenu)
		.on('move_node.jstree', page.api.moveMenu)
		.on('edit.jstree', page.api.editDoc)
		.on('ready.jstree set_state.jstree', function (e, obj) {
			page.menu.element.focus()
			var sl = page.menu.get_selected()
			page.menu.element.find('#'+ sl + '_anchor').focus()
		})
		page.menu.keydown_events.h = function (e) {
			e.preventDefault();
			if(this.is_open(e.currentTarget)) {
				this.close_node(e.currentTarget);
			}
			else {
				var o = this.get_parent(e.currentTarget);
				if(o && o.id !== $.jstree.root) { this.get_node(o, true).children('.jstree-anchor').focus(); }
			}
		}
		page.menu.keydown_events.k = function (e) {
			e.preventDefault();
			var o = this.get_prev_dom(e.currentTarget);
			if(o && o.length) { o.children('.jstree-anchor').focus(); }
		}
		page.menu.keydown_events.l = function (e) {
			e.preventDefault();
			if(this.is_closed(e.currentTarget)) {
				var node = this.get_node(e.currentTarget)
				if (node.type.startsWith('pwd')) {
					page.pwdpanel.show(e, function (pwd) {
						node.data ? node.data.pwd=pwd : node.data={pwd: pwd}
						this.open_node(e.currentTarget, function (o) { this.get_node(o, true).children('.jstree-anchor').focus(); });
					}, this)
				} else {
					this.open_node(e.currentTarget, function (o) { this.get_node(o, true).children('.jstree-anchor').focus(); });
				}
			}
			else if (this.is_open(e.currentTarget)) {
				var o = this.get_node(e.currentTarget, true).children('.jstree-children')[0];
				if(o) { $(this._firstChild(o)).children('.jstree-anchor').focus()}
				else {
					e.type = "click";
					$(e.currentTarget).trigger(e);
				}
			} else {
				e.type = "click";
				$(e.currentTarget).trigger(e);
			}
		}
		page.menu.keydown_events.j = function (e) {
			e.preventDefault();
			var o = this.get_next_dom(e.currentTarget);
			if(o && o.length) { o.children('.jstree-anchor').focus(); }
		}
		page.menu.keydown_events.g = function (e) {
			e.preventDefault();
			var o = this._firstChild(this.get_container_ul()[0]);
			if(o) { $(o).children('.jstree-anchor').filter(':visible').focus(); }
		}
		page.menu.keydown_events['shift-g'] = function (e) {
			e.preventDefault();
			this.element.find('.jstree-anchor').filter(':visible').last().focus();
		}
		page.menu.keydown_events.d = function (e) {
			this.show_contextmenu(e.currentTarget, e.pageX, e.pageY, e);
		}
	}
	,submenuOperation: function () {
		$('body').on('keydown', '.vakata-context', page.op.vimOpSubmenu)
	}
}

var pwdpanel = function () {
	this.pwd = null

	this.tpl = '<div class="pop-panel">' +
						'<p class="pop-panel-header">请输入密码</p>' +
						// '<input name="password" type="password" />' +
				'</div>';
	this.ctrl_tpl = '<div class="pop-panel-footer">' +
							'<button class="pwd-confirm">确定</button>' +
							'<button class="pwd-cancle">取消</button>' +
					'</div>';
	this.init()
}
pwdpanel.prototype = {
	init: function () {
		this.render()
	}
	,render: function () {
		this.el = $(this.tpl)
		this.input = $('<input name="password" type="password" />')
		this.ctrl = $(this.ctrl_tpl)
		this.el.append(this.input, this.ctrl)
		$('body').append(this.el)
		var self = this
		this.input.on('change', function (e) {
			self.pwd = this.value
		})
		this.ctrl.on('click.cancle', 'button.pwd-cancle', function (e) {
			self.destory()
			page.menu.get_node(page.menu.get_selected(), true).find('a').focus()
		})
	}
	,destory: function () {
		this.pwd = null
		this.el.hide()
		this.input.val('')
	}
	,show: function (e, callback, parent) {
		this.el.show()
		this.input.off('.enter').focus()
		this.ctrl.off('.confirm')
		var self = this
		this.ctrl.on('click.confirm', 'button.pwd-confirm', function (e) {
			callback && callback.call(parent, self.input.val())
			self.destory()
		})
		this.input.on('keydown.enter', function (e) {
			if (e.which == 13) {
				callback && callback.call(parent, e.target.value)
				self.destory()
			} else if (e.which == 27) {
				self.destory()
				page.menu.get_node(page.menu.get_selected(), true).find('a').focus()
			}
		})
	}
	,setpwd: function (data) {
		var obj = page.menu.get_node(data.reference)
		// already pwd node to change password. else create new password
		if (obj.type.startsWith('pwd')) {
			this.changepwd(obj.id, data)
		} else {
			this.createpwd(obj.id, data)
		}
	}
	,createpwd(id, data) {
		this.el.show()
		this.input.off('.enter').focus()
		this.ctrl.off('.confirm')
		var self = this
		this.ctrl.on('click.confirm', 'button.pwd-confirm', function (e) {
			page.api.setpwd(id, e.target.value)
			self.destory()
		})
		this.input.on('keydown.enter', function (e) {
			if (e.which == 13) {
				page.api.setpwd(id, e.target.value)
				self.destory()
			} else if (e.which == 27) {
				self.destory()
				page.menu.get_node(page.menu.get_selected(), true).find('a').focus()
			}
		})
	}
	,changepwd(id, data) {

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
	page.pwdpanel = new pwdpanel()
})
