
define('html2rst', function () {
Parser = function () {
  this.result = '';
  this.currentTags = [];
  this.lasttag = '';
  this.ltCharater_re = new RegExp('<', 'g')
  this.gtCharacter_re = new RegExp('>', 'g')
  this.commentCloseTag_re = new RegExp('--\s*>', 'g')
  this.openTag_re = new RegExp('<([a-zA-Z][^\t\n\r\f />\x00]*)(?:[\s/]*.*?>)', 'g')
  this.rowTag = new Set(['td','th'])
  this.codeTag = new Set(['pre', 'code'])
  this.codeStatus = false
  // tdor th's contents in tr
  this.row_data = []
  this.headerTag = {
    'h1': '=',
    'h2': '-',
    'h3': '.',
    'h4': "~",
    'h5': '*',
    'h6': '+',
    'h7': '^',
  };
  this.blockTag = new Set(['address', 'article', 'aside', 'blockquote',
    'canvas', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
    'footer', 'form', 'header', 'hr', 'li', 'main', 'nav', 'noscript', 'ol',
    'output', 'p', 'pre', 'section', 'table', 'tfoot', 'ul', 'video', 'caption']);
  this.nothingTag = new Set(['script', 'style', 'noscript'])
}

Parser.prototype = {
  // start and close tag
  tag_dispash: function (tag, start_end) {
    var handle, ctag;
    if (start_end == 'start') {
      this.currentTags.push(tag)
      this.lasttag = tag
      if (this.codeTag.has(tag)) {
        this.codeStatus = true
      }
    } else {
      if (this.codeTag.has(tag)) {
        this.codeStatus = false
      }
      // 关闭标签后,最后的tag要取父级的tag,因此,单体tag如<br><hr>等需要立即关闭
      while (ctag = this.currentTags.pop()) {
        if (this.lasttag == ctag) {
          this.lasttag = this.currentTags[this.currentTags.length - 1] || ''
          break
        } else {
          // 自封闭标签， close it
          handle = 'on_' + ctag + '_end'
          if (this[handle]) {
            this[handle](tag)
          }
        }
      }
    }

    handle = 'on_' + tag + '_' + start_end
    if (this[handle]) {
      this[handle](tag)
    }
  },
  parse: function (data) {
    this.result = ''
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
        this.tag_dispash(tag, 'end')
        i = j + 1
      }
      // 正常tag
      else if (this.openTag_re.lastIndex = i, m = this.openTag_re.exec(data)) {
        tag = m[1]
        i = this.openTag_re.lastIndex
        // 处理正常的tag， 否则略过
        this.tag_dispash(tag, 'start')
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
  on_table_start: function (data) {
    // caption = this.on_caption(data)
    this.result += '\n\n.. csv-table:: '// + caption + '\n'
  },
  on_thead_start: function () {
    this.result += '\n    :header: '
    this.row_data = [];
  },
  on_tr_start: function () {
    this.result += '\n    '
    this.row_data = [];
  },
  on_tr_end: function () {
    this.result += this.row_data.join(', ')
  },
  handle_data: function (data) {
    if (this.codeTag.has(this.lasttag)) {
      this.result += data
      return
    }
    data = data.trim()
    if (data == '') {
      return
    }
    if (this.rowTag.has(this.lasttag)) {
      this.row_data.push(data)
    } else if (this.lasttag in this.headerTag) {
      this.result += '\n\n' + data + '\n'
      this.result += this.headerTag[this.lasttag].repeat(data.length) + '\n'
    } else if (this.blockTag.has(this.lasttag)) {
      this.result += data + '\n'
    } else if (this.nothingTag.has(this.lasttag)) {
      // nothing happened
    }
    else {
      this.result += data
    }
  }
}

return Parser
});
