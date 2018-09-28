/*globals jQuery, define, exports, require */
(function (factory) {
	"use strict";
	if (typeof define === 'function' && define.amd) {
		define('jstree.tags', ['jquery','jstree'], factory);
	}
	else if(typeof exports === 'object') {
		factory(require('jquery'), require('jstree'));
	}
	else {
		factory(jQuery, jQuery.jstree);
	}
}(function ($, jstree, undefined) {
	"use strict";

	if($.jstree.plugins.tags) { return; }
	$.jstree.plugins.tags = function (options, parent) {
		this.init = function (el, options) {
			parent.init.call(this, el, options);
		};
		this.refresh = function (skip_loading, forget_state) {
			parent.refresh.call(this, skip_loading, forget_state);
		};
		this.bind = function () {
			this.element
				.on('model.jstree', $.proxy(function (e, data) {
						var m = this._model.data,
							dpc = data.nodes,
							i, c, id, r, g, b;
						for(i = 0; i < dpc.length; i++) {
							c = m[dpc[i]].original.count
							if (c > 1 && m[dpc[i]].data) {
								id = m[dpc[i]].data.id;
								r = 255 * (c % 100) / 100
								g = 255 * (id % 100) / 100
								b = 255 * ((c * id) % 100) / 100
								m[dpc[i]].a_attr.style = 'background: rgba(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) +',.5)'
							}
						}
					}, this)
				)
			parent.bind.call(this);
		};
	};

	// include the tags plugin by default
	// $.jstree.defaults.plugins.push("tags");
}));
