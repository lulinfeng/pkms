
define("ace/ext/web_rst",["require","exports","module", "ace/config", "ace/editor", "ace/lib/event", "ace/line_widgets","ace/lib/dom"], function(require, exports, module) {
var LineWidgets = require("../line_widgets").LineWidgets;
var dom = require("../lib/dom");
var event = require("../lib/event");
var Editor = require("../editor").Editor;

const tag_r = /<(\w+)>/

function parseHtml (data) {
  var range_tag = [];
  var d = data.replace(/<(\w+).*?>/g, '<$1>');
  var rst_data = '';
  while (d.length) {
    var m = d.match(tag_r);
    if (!!m) {
      var tag = m[1];
      d = d.substr(tag.length + 2)
      if (tag == 'tr') {
        continue
      }
      range_tag.push(tag)
    }
  }
}

require("../config").defineOptions(Editor.prototype, "editor", {
  akey: {
    set: function(val) {
      if (val) {
        var editor = this;
        var text = this.textInput.getElement();
        event.addListener(text, "paste", function (e) {
          var types = e.clipboardData.types;
          if (!isArray(types)) {
            return
          }

          var i, htmlstr;
          for (i = 0; i < types.length; i++) {
            var key = types[i];
            if (key.match('^text/html')) {
              htmlstr = e.clipboardData.getData(key)
              // var rst_data = todo
              var session = editor.session;
              var pos = editor.getCursorPosition();
              var lines = ['', '.. figure:: ' + 'data', '']
              session.doc.insertLines(pos.row, lines)
              editor.focus()
            }
          }
        })
      }
    },
    value: true
  }
});

});

        (function() {
          window.require(["ace/ext/web_rst"], function() {});
        })();
