
define("ace/ext/media_block",["require","exports","module", "ace/config", "ace/editor", "ace/lib/event", "ace/line_widgets","ace/lib/dom"], function(require, exports, module) {
var LineWidgets = require("../line_widgets").LineWidgets;
var dom = require("../lib/dom");
var event = require("../lib/event");
var Editor = require("../editor").Editor;
var cssText = "\
.ace_lineWidgetContainer .action{\
  position: absolute;\
  top: 0;\
  display: none;\
}\
.ace_lineWidgetContainer .action button{\
  height: 18px;\
  width: 62px;\
}\
";
dom.importCssString(cssText);

require("../config").defineOptions(Editor.prototype, "editor", {
  akey: {
    set: function(val) {
      if (val) {
        var editor = this;
        var text = this.textInput.getElement();
        event.addListener(text, "paste", function (e) {
          var items = e.clipboardData.items;
          if (items) {
            for (var i = 0; i < items.length; i++) {
              if (items[i].type.indexOf("image") !== -1) {
                var blob = items[i].getAsFile();
                var URLObj = window.URL || window.webkitURL;
                var source = URLObj.createObjectURL(blob);
                // editor.onPaste('.. figure:: ' + source, e);
                var session = editor.session;
                if (!session.widgetManager) {
                  session.widgetManager = new LineWidgets(session);
                  session.widgetManager.attach(editor);
                }

                var pos = editor.getCursorPosition();
                var w = {
                  row: pos.row,
                  fixedWidth: false,
                  coverGutter: false,
                  el: dom.createElement("div"),
                  type: "mediaStatic"
                };
                var left = editor.renderer.$cursorLayer
                    .getPixelPosition(pos).left;
                var el = w.el.appendChild(dom.createElement('img'));
                el.style['margin-left'] = left + 'px';
                el.src = source;
                el.onload = function (e) {
                  w.pixelHeight = this.offsetHeight;
                  session.widgetManager.addLineWidget(w);
                }
                var bu = w.el.appendChild(dom.createElement('div'))
                bu.className = 'action'
                bu.style['margin-left'] = left + 'px';
                var upload = bu.appendChild(dom.createElement('button'))
                upload.innerText = 'upload'
                upload.onclick = function (e) {
                  // ajax upload imgae to server, then src convert to remote source
                  var f = new FormData()
                  f.append('data', blob)
                  $.ajax({
                    type: 'post',
                    url: '/upload/',
                    data: f,
                    processData: false,
                    contentType: false
                  }).done(function (resp) {
                    if (resp.result == 'ok') {
                      var lines = ['', '.. figure:: ' + resp.path, '']
                      session.doc.insertLines(pos.row, lines)
                      session.widgetManager.removeLineWidget(w)
                      editor.focus()
                    } else {
                      alert(resp.msg)
                    }
                  })
                }
                var del = bu.appendChild(dom.createElement('button'))
                del.innerText = 'del'
                del.onclick = function (e) {
                  session.widgetManager.removeLineWidget(w);
                }
                w.el.onmouseover = function (e) {
                  bu.style.display = 'block'
                }
                w.el.onmouseout = function (e) {
                  bu.style.display = 'none'
                }
              }
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
          window.require(["ace/ext/media_block"], function() {});
        })();
