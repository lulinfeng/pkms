
define('html2rst', function () {
var Parser = function () {
  this.result = ''
  this.currentTags = []
  this.lasttag = ''
  this.ltCharater_re = new RegExp('<', 'g')
  this.gtCharacter_re = new RegExp('>', 'g')
  this.commentCloseTag_re = new RegExp('--\s*>', 'g')
  this.openTag_re = new RegExp('<([a-zA-Z][^\t\n\r\f />\x00]*)(?:[\s/]*.*?>)', 'g')
  this.codeTag = new Set(['pre', 'code', 'blockquote'])
  this.headerTag = {
    'h1': '=',
    'h2': '-',
    'h3': '.',
    'h4': "~",
    'h5': '*',
    'h6': '+',
    'h7': '^',
  };
  this.nothingTag = new Set(['script', 'style', 'noscript', 'meta', 'title', 'link', 'head'])
  this.inCodeBlock = false
  this.needCacheTag = new Set(['p', 'tr', 'table', 'thead', 'h1', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'h7', 'pre', 'code', 'div', 'tt', 'kbd', 'th', 'td', 'blockquote',
    'dd', 'ul', 'ol', 'li'])
  // 数据缓存池 用二维数组表示
  this.cacheList = []
  this.startsNewLine_re = new RegExp('^\n*')
  this.listItem_re = new RegExp('([#\-*+]\\.? +)', 'g')
  this.trimLineBreak_re = new RegExp('^\n+|\n+$', 'g')
}

Parser.prototype = {
  starts_newline_count: function (text) {
    return this.startsNewLine_re.exec(text)[0].length
  },
  ends_newline_count: function () {
    var text = this.result;
    if (this.cacheList.length) {
      var lastCache = this.cacheList[this.cacheList.length -1];
      if (lastCache.length) {
        text = lastCache[lastCache.length - 1];
      }
    }

    if (text.endsWith('\n\n')) {
      return 2
    }
    else if (text.endsWith('\n')) {
      return 1
    }
    else {
      return 0
    }
  },
  byte_length: function (str) {
    // returns the byte length of an utf8 string
    var i, code, l = str.length;
    for (i = str.length - 1; i >= 0; i--) {
        code = str.charCodeAt(i)
        if (code > 0x7f && code <= 0x7ff) {
          l++
        } else if (code > 0x7ff && code <= 0xffff) {
          l += 1
        }
    }
    return l
  },
  write: function (text) {
    // handle_data 函数调用，或tag start end 函数调用
    if (this.cacheList.length) {
      this.cacheList[this.cacheList.length -1].push(text)
    } else {
      this.result += text
    }
  },
  // 判断tag行为，开始标签添加缓存，闭合标签处理数据等
  tag_start_handle: function (tag) {
    // 如果是需缓存标签
    if (this.needCacheTag.has(tag)) {
      this.cacheList.push([])
      if (this.codeTag.has(tag)) {
        this.inCodeBlock = true
      }
    }
    var handle = 'on_' + tag + '_start';
    if (this[handle]) {
      this[handle]()
    }
  },
  tag_end_handle: function (tag) {
    var handle, ctag, data = '';
    // 关闭标签后,最后的tag要取父级的tag,因此,单体tag如<br><hr>等需要立即关闭
    while (ctag = this.currentTags.pop()) {
      if (this.lasttag == ctag) {
        this.lasttag = this.currentTags[this.currentTags.length - 1] || ''
        break
      } else {
        // 自封闭标签， close it
        handle = 'on_' + ctag + '_end'
        if (this[handle]) {
          this[handle]()
        }
      }
    }

    handle = 'on_' + tag + '_end'
    // 如果是需缓存标签
    if (this.needCacheTag.has(tag)) {
      data = this.cacheList.pop() || []
      // h1--h7 tag end handle in once
      if (tag in this.headerTag) {
        this.on_headertag_end(tag, data)
      }
    }
    if (this[handle]) {
      this[handle](data)
    }
    // set false after all endtag function handled data
    if (this.codeTag.has(tag)) {
      this.inCodeBlock = false
    }
  },
  // start and close tag
  tag_dispatch: function (tag, start_end) {
    if (start_end == 'start') {
      this.currentTags.push(tag)
      this.lasttag = tag
      this.tag_start_handle(tag)
    } else {
      this.tag_end_handle(tag)
    }
  },
  reset: function() {
    this.result = ''
    this.currentTags = []
    this.lasttag = ''
    this.inCodeBlock = false
    this.cacheList = []
  },
  parse: function (data) {
    this.reset()
    var i=0, j=0, len=data.length, m, tag;
    while (i < len) {
      // 找html < 标记
      // 有可能跳过实体字符或实体编号 &nbsp; &#160; 有时间再补
      this.ltCharater_re.lastIndex = i
      m = this.ltCharater_re.exec(data)
      if (m) {
        // html开始标记之前的为文本数据
        if (m.index > i) {
          this.handle_data(data.substring(i, m.index))
          i = m.index
        }
      } else {
        // 没有一个<标签
        this.handle_data(data.substring(i, len))
        break
      }
      // 结束标签
      if (data.startsWith('</', i)) {
        // j = data.search('>', i)
        this.gtCharacter_re.lastIndex = i
        m = this.gtCharacter_re.exec(data)
        j = m.index
        tag = data.substring(i + 2, j)
        this.tag_dispatch(tag, 'end')
        i = j + 1
      }
      // 正常tag
      else if (this.openTag_re.lastIndex = i, m = this.openTag_re.exec(data)) {
        tag = m[1]
        i = this.openTag_re.lastIndex
        // 处理正常的tag， 否则略过
        this.tag_dispatch(tag, 'start')
      }
      else if (data.startsWith('<!--', i)) {
        // comment
        this.commentCloseTag_re.lastIndex = i + 3
        m = this.commentCloseTag_re.exec(data)
        i = m.lastIndex
      }
      else if (data.startsWith('<!', i)) {
        // doctype
        this.gtCharacter_re.lastIndex = i + 3
        m = this.gtCharacter_re.exec(data)
        i = m.lastIndex
      }
      else {
        // 如果匹配不到正常的标签，比较奇怪了
        i = i + 1
      }
    }
    return this.result
  },
  on_table_end: function (data) {
    // caption = this.on_caption(data)
    // this.result += '\n\n.. csv-table:: '// + caption + '\n'
    // TODO: caption not new line
    this.write('\n\n.. csv-table:: ' + data.join('') + '\n\n')
  },
  on_thead_end: function (data) {
    if (data && data.length > 0) {
      this.write('\n    :header: ' + data.join(', ').trim())
    }
  },
  on_tbody_start: function () {
    this.write('\n')
  },
  on_tr_end: function (data) {
    this.write('\n    ' + data.join(', '))
  },
  on_code_end: function (data) {
    if (data && data.length > 0) {
      var code = data.join('')
      if (this.inCodeBlock) {
        if (code.indexOf('\n') != -1) {
          this.write('\n\n.. code::\n\n    ' + code + '\n')
        } else {
          this.write(' ``' + code + '`` ')
        }
      } else {
        this.write(data.join(''))
      }
    }
  },
  on_pre_end: function (data) {
    if (data && data.length > 0) {
      if (this.inCodeBlock) {
        var start = this.ends_newline_count() ? '\n' : '\n\n'
        this.write(start + '.. code::\n\n    ' + data.join('') + '\n')
      } else {
        this.write(data.join(''))
      }
    }
  },
  on_div_end: function (data) {
    if (data && data.length > 0) {
      if (this.inCodeBlock) {
        this.write(data.join(''))
      } else {
        var text = data.join('')
        if (text.startsWith('\n') || this.ends_newline_count()) {
          this.write(data.join(''))
        } else {
          this.write('\n' + data.join(''))
        }
      }
    }
  },
  on_headertag_end: function (tag, data) {
    // h1--h7
    var text = data.join('');
    if (this.ends_newline_count()) {
      this.write('\n' + text + '\n')
    } else {
      this.write('\n\n' + text + '\n')
    }
    this.write(this.headerTag[tag].repeat(this.byte_length(text)) + '\n')
  },
  on_p_end: function (data) {
    var text = data.join('')
    if (text.trim() == '') {
      return
    }
    if (this.inCodeBlock) {
      this.write(data.join(''))
      return
    }
    var n = this.ends_newline_count() + this.starts_newline_count(text)
    if (n >= 2) {
      this.write(text + '\n')
    } else {
      this.write('\n'.repeat(2 - n) + text + '\n')
    }
  },
  on_tt_end: function (data) {
    this.write(' ``' + data.join('') + '`` ')
  },
  on_kbd_end: function (data) {
    this.write(' ``' + data.join('') + '`` ')
  },
  on_th_end: function (data) {
    this.write(data.join('').trim().replace(/,/g, '，'))
  },
  on_td_end: function (data) {
    this.write(data.join('').trim().replace(/,/g, '，'))
  },
  on_blockquote_end: function (data) {
    if (!data || data.length == 0) {
      return
    }
    var text = data.join('    ')
    var n = this.ends_newline_count() + this.starts_newline_count(text)
    if (n >= 2) {
      this.write('    ' + text + '\n')
    } else {
      this.write('\n'.repeat(2 - n) + '    ' + text + '\n\n')
    }
    this.inCodeBlock = false
  },
  on_dd_end: function (data) {
    this.write('\n    ' + data.join(' ').split('\n').join('\n    '))
  },
  on_ul_end: function (data) {
    this.write('\n\n- ' + data.join('\n- '))
  },
  on_ol_end: function (data) {
    this.write('\n\n#. ' + data.join('\n#. '))
  },
  on_li_end: function (data) {
    this.write(data.join('').replace(this.trimLineBreak_re, '').replace(this.listItem_re, '    $1'))
  },
  handle_data: function (data) {
    if (this.inCodeBlock) {
      this.write(data.split('\n').join('\n    '))
    }
    else if (this.nothingTag.has(this.lasttag)) {
      // nothing happened
    }
    else {
      data = data.trim()
      if (data == '') {
        return
      }
      this.write(data)
    }
  }
}

return Parser
});
