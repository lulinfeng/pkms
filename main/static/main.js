;(function (page) {
	page.base = {
		line: 30
		,page: 550
		,L_R_pos: 200
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
			'search': {
				'show_only_matches': true,
				// 'case_sensitive': true
			},
			'force_text' : true,
			'types' : {
				// file 1, folder 2, pwd 4, unpub 8
				1 : { 'valid_children' : [], 'icon' : 'jstree-file' },
				9 : { 'valid_children' : [], 'icon' : 'jstree-unpubfile' },
				5 : { 'valid_children' : [], 'icon' : 'jstree-pwdfile' },
				13 : { 'valid_children' : [], 'icon' : 'jstree-unpub-pwdfile' },
				2 : {'icon' : 'jstree-folder' },
				10 : {'icon' : 'jstree-unpubfolder' },
				6 : {'icon' : 'jstree-pwdfolder' },
				14 : {'icon' : 'jstree-unpub-pwdfolder' },
			},
			'plugins' : ['state','dnd','types','contextmenu', 'themes', 'search']
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
						"action": function (data) {page.op.addMenu(data, 10, '')}
					},
					"create_rstfile" : {
						"label": "rstDoc",
						"action": function (data) {page.op.addMenu(data, 9, 'rst')}
					},
					"create_mdfile" : {
						"label": "mdDoc",
						"action": function (data) {page.op.addMenu(data, 9, 'md')}
					}
				}
				tmp['create'] = _tmp.create
				tmp['edit'] = {
					"label"				: "Edit",
					"action"			: function (data) {
						var inst = $.jstree.reference(data.reference),
							obj = inst.get_node(data.reference)
						inst.trigger('edit', obj)
					}
				}
				tmp['publish'] = {
					label: "Publish"
					,action: function (data) {page.api.publish(data)}
				}
				tmp['operation'] = {
					label: 'More...'
					,submenu: {
						rename: _tmp.rename
						,unpublish: {
							label: "Unpublish"
							,action: function (data) {page.api.unpublish(data)}
						}
						,password: {
							label: 'SetPwd'
							,action: function (data) {
								page.pwdpanel.setpwd(data)
							}
						}
						,delete: _tmp.remove
					}
				}
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
				// file 1
				if ((data.node.type | 1) == data.node.type) {
					page.Tab.newTab(data.node)
					page.Tab.current.$doc.css({bottom: page.Tab.current.docs_bottom + '%'}).empty()
					data.instance.deselect_all()
					data.instance.select_node(data.node, true)
					$(page.Tab.current.editor.container).css({top: page.Tab.current.editor_top + '%'}).show()
					page.Tab.current.editor.session.setValue('')
					page.Tab.current.editor.focus()
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
	,renameNode: function (e, data) {
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
			if (resp.result == 'ok') {
				$(page.Tab.current.li).find('span').text(data.node.text)
			} else {
				alert(resp.msg)
				data.instance.refresh()
			}
		}).fail(function (msg) {
			alert(msg)
			data.instance.refresh()
		})
	}
	,moveNode: function (e, data) {
		$.ajax({
			type: 'movenode',
			url: '/menu/',
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
	,copyNode: function (e, data) {
		$.ajax({
			type: 'copynode',
			url: '/menu/',
			data: JSON.stringify({
				id: data.original.data.id,
				parent: data.instance.get_node(data.parent).data.id,
				pos: data.position,
				old_parent: data.instance.get_node(data.old_parent).data.id,
				old_pos: data.old_position
			})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				data.node.data = $.extend(true, {}, data.original.data)
			} else {
				alert(resp.msg)
				data.instance.refresh()
			}
		}).fail(function (e) {
			alert(e)
			data.instance.refresh()
		})
	}
	,saveDoc: function (editor) {
		return $.ajax({
			type: 'put',
			url: '/menu/',
			data: JSON.stringify({'id': page.Tab.current.node.data.id, content: editor.getValue()})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				page.Tab.current.$doc.html(resp.doc)
				if (page.Tab.current.$doc.has('.topic').length) {
					var w = page.Tab.current.$doc.find('.topic')[0].clientWidth
					page.Tab.current.$doc.find('.document').css({'padding-right': w})
				}
			} else {
				alert('保存失败: ' + resp.msg)
			}
		})
	}
	,getDoc: function (e, data) {
		if (data && data.selected && data.selected.length && ((data.node.type | 1) == data.node.type)) {
			if (data.node.a_attr.href == '#') {
				// general get doc
				$.ajax({
					type: 'getdoc',
					url: '/menu/',
					data: JSON.stringify(data.node.data)
				}).done(function (resp) {
					if (resp.result == 'ok') {
						// page.Tab.current.node_id = data.node.data.id
						page.Tab.current.$doc.html(resp.doc).css('bottom', 0)
						if (page.Tab.current.$doc.has('.topic').length) {
							var w = page.Tab.current.$doc.find('.topic')[0].clientWidth
							page.Tab.current.$doc.find('.document').css({'padding-right': w})
						}
						$(page.Tab.current.editor.container).hide()
						$(page.Tab.current.li).find('span').text(data.node.text)
						page.Tab.current.show()
					} else {
						alert(resp.msg)
					}
				})
			} else {
				// get the static resource
				$.ajax({
					type: 'get',
					url: data.node.a_attr.href.replace('/public', '/static'),
					data: Date.parse(new Date()) + ''
				}).done(function (resp) {
					page.Tab.current.$doc.html(resp).css('bottom', 0)
					if (page.Tab.current.$doc.has('.topic').length) {
						var w = page.Tab.current.$doc.find('.topic')[0].clientWidth
						page.Tab.current.$doc.find('.document').css({'padding-right': w})
					}
					// page.Tab.current.node_id = data.node.data.id
					$(page.Tab.current.editor.container).hide()
					$(page.Tab.current.li).find('span').text(data.node.text)
				}).fail(function (e) {
					page.Tab.current.$doc.html(e.responseText).css('bottom', 0)
					$(page.Tab.current.editor.container).hide()
				})
			}
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
				page.Tab.current.$doc.html(resp.doc).css({'bottom': page.Tab.current.docs_bottom + '%'});
				page.Tab.current.editor.session.setValue(resp.source);
				page.Tab.current.editor.focus();
				$(page.Tab.current.editor.container).show();
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
			var parent = data.instance.get_node(data.parent).data.id
			var prev_dom = data.instance.get_prev_dom(data.node)
			$.ajax({
				type: 'delete',
				url: '/menu/',
				data: JSON.stringify({id: data.node.data.id, type: data.node.type, parent: parent})
			}).done(function (resp) {
				if (resp.result == 'ok') {
					data.instance.get_node(prev_dom, true).find('a').first().focus()
					if (data.node.data.tabed) {
						page.Tab.close(data.node)
					}
				} else {
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
				page.Tab.current.$doc.css('bottom', 0).focus()
				$(editor.container).hide()
			}
		})
	}
	,setpwd: function (obj, pwd) {
		$.ajax({
			type: 'setpwd',
			url: '/menu/',
			data: JSON.stringify({id: obj.data.id, pwd: pwd})
		}).done(function (resp) {
			page.menu.get_node(obj, true).find('a').first().focus()
			if (resp.result == 'ok') {
				page.message('success')
				page.menu.set_type_all(obj, obj.type | 4)
			} else {
				page.alert('', 'failed to set password')
			}
		})
	}
	,publish: function (data) {
		var obj = page.menu.get_node(data.reference)
		$.ajax({
			type: 'post'
			,url: '/publish/'
			,data: JSON.stringify({id: obj.data.id})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				// obj.a_attr.href = resp.data
				page.menu.get_node(obj, true).find('a').first().focus()
				page.menu.set_type_all(obj, (obj.type | 8) ^ 8, resp.data)
			} else {
				page.message('error' + resp.msg || '')
			}
		})
	}
	,unpublish: function (data) {
		var obj = page.menu.get_node(data.reference)
		$.ajax({
			type: 'post'
			,url: '/unpublish/'
			,data: JSON.stringify({id: obj.data.id})
		}).done(function (resp) {
			if (resp.result == 'ok') {
				page.menu.get_node(obj, true).find('a').first().focus()
				page.menu.set_type_all(obj, obj.type | 8, '#')
			} else {
				page.message('error' + resp.msg || '')
			}
		})
	}
}

page.op = {
	addMenu: function (data, type, source) {
		var inst = $.jstree.reference(data.reference),
			obj = inst.get_node(data.reference),
			_t = (obj.type | 1) == obj.type ? 'after' : 'first',
			o = {'type': type, 'data': {create: true, 'source_type': source}}
		inst.create_node(obj, o, _t, function (node) {inst.edit(node)})
	}
	,quitEditor: function (editor) {
		editor.container.style.display = 'none'
		page.Tab.current.$doc.css({bottom: 0}).focus()
	}
	,raiseEditor: function (editor) {
		if (page.Tab.current.docs_bottom < 95) {
			page.Tab.current.docs_bottom += 5
			page.Tab.current.editor_top -= 5
			if (page.Tab.current.editor_top <= 5) {
				$(editor.container).css({top: '40px'})
			} else {
				$(editor.container).css({top: page.Tab.current.editor_top + '%'})
			}
			page.Tab.current.$doc.css({bottom: page.Tab.current.docs_bottom + '%'})
			editor.resize()
		}
	}
	,lowerEditor: function (editor) {
		if (page.Tab.current.docs_bottom > 10) {
			page.Tab.current.docs_bottom -= 5
			page.Tab.current.editor_top += 5
			$(editor.container).css({top: page.Tab.current.editor_top + '%'})
			page.Tab.current.$doc.css({bottom: page.Tab.current.docs_bottom + '%'})
			editor.resize()
		}
	}
	,fullScreenEditor: function (editor) {
		if (!page.Tab.current.fullScreen) {
			$(editor.container).css({top: '40px', left: 0})
		} else {
			$(editor.container).css({top: page.Tab.current.editor_top + '%', left: page.base.L_R_pos})
		}
		page.Tab.current.fullScreen = !page.Tab.current.fullScreen
		editor.resize()
	}
	,fullHeightEditor: function (editor) {
		if (!page.Tab.current.fullHeight) {
			$(editor.container).css({top: '40px'})
		} else {
			$(editor.container).css({top: page.Tab.current.editor_top + '%', left: page.base.L_R_pos})
		}
		page.Tab.current.fullHeight = !page.Tab.current.fullHeight
		editor.resize()
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
				page.menu.get_node(page.menu.get_selected(), 1).find('a').first().focus()
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
	,increaseEditor: function (editor) {
		editor.setFontSize(editor.getFontSize() + 1)
	}
	,decreaseEditor: function (editor) {
		var size = editor.getFontSize()
		if (size == 12) return
		editor.setFontSize(size - 1)
	}
	,increaseDoc: function (el) {
		var size = parseInt(el.style.fontSize.replace('px', '') || 13)
		el.style.fontSize = size + 1
	}
	,decreaseDoc: function (el) {
		var size = parseInt(el.style.fontSize.replace('px', '') || 13)
		if (size == 12) return
		el.style.fontSize = size - 1
	}
}

page.event = {
	openNode: function (e)	{
		e.preventDefault();
		if(this.is_closed(e.currentTarget)) {
			var node = this.get_node(e.currentTarget)
			if ((node.type | 4) == node.type) {
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
	,vimReadDoc: function () {
		$('#main').on('keydown', '.docs', function (e) {
			switch(e.which) {
				case 69: // ctrl-e or alt-e to edit the doc
					e.preventDefault()
					if (e.ctrlKey || e.altKey) {
						page.api.editDoc(e, page.Tab.current.node)
					}
					// if (page.Tab.current.node.data.id != 'default') {
					// 	page.api.editDoc(e, page.Tab.current.node)
					// 	return
					// }
					// if (e.ctrlKey || e.altKey) {
					// 	var node_id = page.Tab.current.node_id
					// 	var data = Object.values(page.menu._model.data)

					// 	var i = 0
					// 	for (; i < data.length; i++) {
					// 		if (data[i].id == $.jstree.root) {
					// 			continue
					// 		}
					// 		if (node_id == data[i].data.id) {
					// 			page.api.editDoc(e, data[i])
					// 			return
					// 		}
					// 	}
					// }
					break
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
				case 107: // +
					if (e.altKey) {
						// increase font size
						page.op.increaseDoc(this)
					}
					break
				case 109: // -
					if (e.altKey) {
						// decrease font size
						page.op.decreaseDoc(this)
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
				if ((data.node.type & 1) == 1) {
					// opened to tab just to active it
					if (data.node.data.tabed) {
						page.Tab.activate(data.node.data.id)
						return
					}
					if (data.event && data.event.ctrlKey) {
						page.Tab.newTab(data.node)
					} else {
						page.Tab.activate('default')
						// when the default tab is activated,
						// a node can be found by the defaulttab.node.id
						// page.Tab.current.node.id = data.node.id
						if (data.node.id == page.Tab.current.node.id) {
							return
						}
						page.Tab.current.node = data.node
					}
				}
				// pwd 4
				if ((data.node.type & 4) == 4) {
					if ((data.node.type & 1) == 1) {
						page.pwdpanel.show(e, function (pwd) {
							$.ajax({
								url: '/menu/'
								,type: 'getdoc'
								,data: JSON.stringify({id: data.node.data.id, pwd: pwd})
							}).done(function (resp) {
								if (resp.result == 'ok') {
									page.Tab.current.$doc.html(resp.doc).css('bottom', 0)
									$(page.Tab.current.editor.container).hide()
									// page.Tab.current.node_id = data.node.data.id
									$(page.Tab.current.li).find('span').text(data.node.text)
									$(e.target).focus()
								} else {
									page.message('permission die')
									$(e.target).focus()
								}
							})
						})
					} else if (data.instance.is_closed(data.instance.get_node(data.node, true))) {
						page.pwdpanel.show(e, function (pwd) {
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
						})
					}
				} else {
					page.api.getDoc(e, data)
				}
			}
		})
		.on('delete_node.jstree', page.api.delDoc)
		.on('rename_node.jstree', page.api.renameNode)
		.on('move_node.jstree', page.api.moveNode)
		.on('copy_node.jstree', page.api.copyNode)
		.on('edit.jstree', page.api.editDoc)
		.on('ready.jstree set_state.jstree', function (e, obj) {
			page.menu.element.focus()
			var sl = page.menu.get_selected()
			page.menu.element.find('#'+ sl + '_anchor').focus()
		})
		page.menu.settings.core.keyboard.h = function (e) {
			e.preventDefault();
			if(this.is_open(e.currentTarget)) {
				this.close_node(e.currentTarget);
			}
			else {
				var o = this.get_parent(e.currentTarget);
				if(o && o.id !== $.jstree.root) { this.get_node(o, true).children('.jstree-anchor').focus(); }
			}
		}
		page.menu.settings.core.keyboard.k = function (e) {
			e.preventDefault();
			var o = this.get_prev_dom(e.currentTarget);
			if(o && o.length) { o.children('.jstree-anchor').focus(); }
		}
		page.menu.settings.core.keyboard.l = page.event.openNode
		page.menu.settings.core.keyboard['ctrl-l'] = page.event.openNode
		page.menu.settings.core.keyboard.j = function (e) {
			e.preventDefault();
			var o = this.get_next_dom(e.currentTarget);
			if(o && o.length) { o.children('.jstree-anchor').focus(); }
		}
		page.menu.settings.core.keyboard.g = function (e) {
			e.preventDefault();
			var o = this._firstChild(this.get_container_ul()[0]);
			if(o) { $(o).children('.jstree-anchor').filter(':visible').focus(); }
		}
		page.menu.settings.core.keyboard['shift-g'] = function (e) {
			e.preventDefault();
			this.element.find('.jstree-anchor').filter(':visible').last().focus();
		}
		page.menu.settings.core.keyboard.d = function (e) {
			this.show_contextmenu(e.currentTarget, e.pageX, e.pageY, e);
		}
		page.menu.settings.core.keyboard['ctrl-f'] = function (e) {
			$('#search').show().find('input').focus()
			return false
		}
	}
	,submenuOperation: function () {
		$('body').on('keydown', '.vakata-context', page.op.vimOpSubmenu)
	}
	,leftRightWidth: function () {
		$('body').on('keydown', function (e) {
			if (e.altKey && e.shiftKey) {
				if (e.which == 78) {
					e.preventDefault()
					if (page.base.L_R_pos == 0) return
					page.base.L_R_pos -= 5
					$('.menu').width(0)
					page.Tab.$el.css({'margin-left': -8})
					$('.docs').css({left: 10})
					$('.editor').css({left: 0})
					// page.editor.resize()
				} else if (e.which == 77) {
					e.preventDefault()
					$('.menu').width(page.base.L_R_pos)
					page.Tab.$el.css({'margin-left': page.base.L_R_pos - 8})
					$('.docs').css({left: page.base.L_R_pos + 10})
					$('.editor').css({left: page.base.L_R_pos})
					// page.editor.resize()
				}
				if (e.which == 188) {
					e.preventDefault()
					if (page.base.L_R_pos == 0) return
					page.base.L_R_pos -= 5
					$('.menu').width(page.base.L_R_pos)
					page.Tab.$el.css({'margin-left': page.base.L_R_pos - 8})
					$('.docs').css({left: page.base.L_R_pos + 10})
					$('.editor').css({left: page.base.L_R_pos})
					// page.editor.resize()
				} else if (e.which == 190) {
					e.preventDefault()
					page.base.L_R_pos += 5
					$('.menu').width(page.base.L_R_pos)
					page.Tab.$el.css({'margin-left': page.base.L_R_pos - 8})
					$('.docs').css({left: page.base.L_R_pos + 10})
					$('.editor').css({left: page.base.L_R_pos})
					// page.editor.resize()
				}
			}
		})
	}
	,selectTab: function () {
		$('body').on('keydown', function (e) {
			if (e.altKey && e.which == 87) {
				// alt-w
				e.preventDefault()
				page.Tab.current.close()
				return
			}
			if (!e.altKey || e.shiftKey || e.ctrlKey || e.which < 49 || e.which > 57) {
				return
			}
			e.preventDefault()
			var l = Object.keys(page.tabs).length
			if (l == 0) return
			var n = e.which - 49
			if (n > l - 1) {
				n = l - 1
			}
			page.Tab.$el.children().find('span')[n].click()
		})
	}
	,init: function () {
		this.vimReadDoc()
		this.menuOperation()
		this.submenuOperation()
		this.leftRightWidth()
		this.selectTab()
		// 目录树搜索事件
		$('#search').on('keydown', 'input', function (e) {
			console.log(e.which)
			if (e.which == 13) {
				var query = e.target.value.trim()
				if (!query) {
					page.menu.clear_search()
					return
				}
				$.ajax({
					url: 'menu',
					type: 'search',
					data: query
				}).done(function (data) {
					if (data.result == 'ok') {
						var digui = function (folders, ids) {
							for (var i = 0; i < folders.length; i++) {
								var node = folders[i]
								// 只加载目录
								if (node.type & 2 != 2) {
									continue
								}
								var idx = ids.indexOf(node.data.id)
								if (idx == -1) {
									continue
								}
								ids.splice(idx, 1)
								if (node.state.loaded == false) {
									page.menu.load_node(node, function (obj, status) {
										if (ids.length == 0) {
											page.menu.search(query)
											return
										}
										digui(this.get_json(obj).children, ids)
									})
								} else {
									if (ids.length == 0) {
										page.menu.search(query)
										return
									}
									digui(page.menu.get_json(node).children, ids)
								}
							}
						}
						digui(page.menu.get_json(), data.ids)
						setTimeout(function() {
							// 在未登录的情况下，ids有可能不会为0
							// 公开的文档放在未公开的目录下，会多出未公开目录的id
							if (data.ids.length > 0) {
								console.log(data.ids)
								page.menu.search(query)
							}
						}, 1000);
					} else {
						page.message('error', data.msg)
					}
				})
			} else if (e.which == 27) {
				$('#search').hide()
				page.menu.get_node(page.menu.get_selected(), true).find('a').first().focus()
			} else if (e.which == 70 && e.ctrlKey) {
				e.preventDefault()
				return false
			}
		})
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
			page.menu.get_node(page.menu.get_selected(), true).find('a').first().focus()
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
				page.menu.get_node(page.menu.get_selected(), true).find('a').first().focus()
			}
		})
	}
	,setpwd: function (data) {
		var obj = page.menu.get_node(data.reference)
		if ((obj.type | 4) == obj.type) {
			page.menu.get_node(obj, true).find('a').first().focus()
			return
		} else {
			this.createpwd(obj, data)
		}
	}
	,createpwd(obj, data) {
		this.el.show()
		this.input.off('.enter').focus()
		this.ctrl.off('.confirm')
		var self = this
		this.ctrl.on('click.confirm', 'button.pwd-confirm', function (e) {
			page.api.setpwd(obj, self.input.val())
			self.destory()
		})
		this.input.on('keydown.enter', function (e) {
			if (e.which == 13) {
				page.api.setpwd(obj, e.target.value)
				self.destory()
			} else if (e.which == 27) {
				self.destory()
				page.menu.get_node(obj, true).find('a').first().focus()
			}
		})
	}
	,changepwd(id, data) {

	}
}

// all tab editors
page.editors = {}

page.Editor = function (id) {
	if (page.editors.hasOwnProperty(id)) {
		return page.editors[id]
	}
	var _t = ace.edit(id)
	_t.setTheme("ace/theme/twilight")
	_t.session.setMode("ace/mode/rst")
	_t.setKeyboardHandler("ace/keyboard/vim")
	_t.commands.addCommand({name: 'save', bindKey: {win: "Ctrl-S", "mac": "Cmd-S"},
		exec: page.api.saveDoc
	})
	_t.commands.addCommand({name: 'quit', bindKey: 'ctrl-q', exec: page.op.quitEditor })
	_t.commands.addCommand({name: 'savequit', exec: page.api.saveDocQuitEditor })
	_t.commands.addCommand({name: 'raise', bindKey: 'Ctrl-K', exec: page.op.raiseEditor})
	_t.commands.addCommand({name: 'lower', bindKey: 'Ctrl-J', exec: page.op.lowerEditor})
	_t.commands.addCommand({name: "Toggle Fullscreen", bindKey: "F11",
		exec: page.op.fullScreenEditor
	})
	_t.commands.addCommand({name: "Toggle Max Height", bindKey: "F10",
		exec: page.op.fullHeightEditor
	})
	// increase font size
	_t.commands.addCommand({name: 'increase', bindKey: 'Alt-+', exec: page.op.increaseEditor})
	// decrease font size
	_t.commands.addCommand({name: 'decrease', bindKey: 'Alt--', exec: page.op.decreaseEditor})
	_t.commands.addCommand({name: 'docScrollUp', bindKey: 'Ctrl-Shift-K', exec: function (editor) {
		page.op.raiseDoc(page.Tab.current.$doc[0])
	}})
	_t.commands.addCommand({name: 'docScrollDown', bindKey: 'Ctrl-Shift-J', exec: function (editor) {
		page.op.lowerDoc(page.Tab.current.$doc[0])
	}})
	_t.commands.addCommand({name: 'docIncrease', bindKey: 'Alt-Shift-+', exec: function (editor) {
		page.op.increaseDoc(page.Tab.current.$doc[0])
	}})
	_t.commands.addCommand({name: 'docDecrease', bindKey: 'Alt-Shift--', exec: function (editor) {
		page.op.decreaseDoc(page.Tab.current.$doc[0])
	}})
	page.editors[id] = _t
	return _t
}

page.tabs = {}

page.Tab = {
	$el: (function () {
		var el = $('main').children().first()
		if (el.is('ul.nav-tabs')) {
			return el
		}
		el = $('<ul class="nav-tabs"></ul>')
		$('main').prepend(el)
		return el
	}())
	,current: null
	,newTab: function (node) {
		// hide active tab
		if (page.Tab.current) {
			page.Tab.current.inactivate()
		}
		// insert html
		var tab = {
			docs_bottom: 50
			,editor_top: 50
			,fullScreen: false
			,fullHeight: false
			,node: node
			,is_default: !node.id
		}
		tab.li = document.createElement('li')
		tab.li.className = 'active'
		// tab.li.textContent = node.text
		$(tab.li).append('<span>'+node.text+'</span><i class="close"></i>')
		page.Tab.$el.append(tab.li)
		// event
		tab.show = function () {
			$(tab.li).addClass('active').show()
			$('#pkms_tab_' + node.data.id).show()
		}
		tab.hide = function () {
			$(tab.li).removeClass('active').hide()
			$('#pkms_tab_' + node.data.id).hide()
		}
		tab.inactivate = function () {
			$(tab.li).removeClass('active')
			$('#pkms_tab_' + node.data.id).hide()
		}
		tab.activate = function () {
			// other tab to hide
			if (page.Tab.current == tab) {
				tab.show()
				return
			}
			page.Tab.current.inactivate()
			tab.show()
			page.editor = page.Editor('pkms_editor_' + node.data.id)
			page.Tab.current = tab
			page.menu.deselect_all()
			page.menu.select_node(tab.node.id, true)
		}
		tab.close = function () {
			// change active to other li
			if ($(tab.li).hasClass('active')) {
				if ($(tab.li).prev(':not(:hidden)').length > 0){
					$(tab.li).prev(':not(:hidden)').find('span').click()
				} else {
					$(tab.li).next(':not(:hidden)').find('span').click()
				}
			}
			if (tab.is_default) {
				tab.hide()
				return
			}
			node.data.tabed = false
			$('#pkms_tab_' + node.data.id).remove()
			$(tab.li).remove()
			delete page.tabs[node.data.id]
			delete page.editors['pkms_editor_' + node.data.id]
			// tabs ul remain one children, is the default tab that hided.
			if (page.Tab.$el.children().length == 1) {
				page.Tab.current = page.tabs.default
			}
		}
		$(tab.li).on('click', 'span', tab.activate)
		$(tab.li).on('click', '.close', tab.close)
		// state
		// tab.node_id = node.data.id
		page.Tab.current = page.tabs[node.data.id] = tab
		// create tab contents
		page.Tab.createSection(node)
		tab.$doc = $('#pkms_doc_' + node.data.id)
		tab.editor = page.Editor('pkms_editor_' + node.data.id)
		node.data.tabed = true
	}
	,createSection: function (node) {
		var h = '<section class="rst-content" id="pkms_tab_'+ node.data.id +'">'
			+ '<div class="docs" tabindex="1" id="pkms_doc_'+ node.data.id +'"'
			+ ' style="left:'+ (page.base.L_R_pos + 10) +'px"></div>'
			+ '<div class="editor" id="pkms_editor_'+ node.data.id +'"'
			+ ' style="left:'+ page.base.L_R_pos +'px"></div>'
			+ '</section>'
		$('#main').append(h)
	}
	,close: function (node) {
		page.tabs[node.data.id].close()
	}
	,activate: function (name) {
		// page.Tab.current.hide()
		page.tabs[name].activate()
	}
}

$(function () {
	page.Tab.newTab({text: '', data: {id: 'default'}, id: 0})
	// page.editor = page.Editor('editor')
	ace.config.loadModule("ace/keyboard/vim", function(m) {
		var Vim = require("ace/keyboard/vim")
		var VimApi = Vim.CodeMirror.Vim
		for (var i = 0; i < Vim.handler.defaultKeymap.length; i++) {
			if (Vim.handler.defaultKeymap[i].keys == '<C-[>') {
				Vim.handler.defaultKeymap.splice(i, 1)
				i -= 1
			}
		}
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
	page.menu.set_type_all = function (obj, type, a_attr) {
		var id = obj.data.id
		var data = Object.values(page.menu._model.data)
		var i = 0
		for (; i < data.length; i++) {
			if (data[i].id == $.jstree.root) {
				continue
			}
			if (id == data[i].data.id) {
				page.menu.set_type(data[i], type)
				if (a_attr) {
					data[i].a_attr.href = a_attr
					page.menu.get_node(data[i], true).find('a').first().attr('href', a_attr)
				}
			}
		}
	}
	page.event.init()
	page.pwdpanel = new pwdpanel()
})
