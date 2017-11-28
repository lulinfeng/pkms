window.page = {
	mask: function (isClear) {
		var maskLayer = document.getElementById('rui_mask')
		if (!maskLayer) {
			maskLayer = document.createElement('div')
			maskLayer.id = 'rui_mask'
			maskLayer.className = 'rui-mask'
			maskLayer.style.display = 'none'
			document.body.appendChild(maskLayer)
		}
		if (!!isClear) {
			maskLayer.style.display = 'none'
		} else {
			maskLayer.style.display = 'block'
		}
	}
	,message: function (title, info) {
		var panel = $('#msg')
		if (!panel.lenght) panel = $('<div id="msg"></div>').appendTo($('body'))
		var msg = $('<div class="msg-item"><h6>' + (title || '') + '</h6><p>'
		            + (info || '') + '</p></div>')
		panel.append(msg)
		msg.delay(3000).fadeOut(2000, function(){msg.remove()})
	}
	,alert: function (title, msg) {
		var t = title || '', m = msg || ''
		$('<div class="alert"><button type="button" class="close">'
		+ '<span>&times;</span></button><b>' + t + '</b><p>' + m + '</p></div>'
		).on('click', 'button.close', function(){$(this).parent().remove()}
		).appendTo($('body'))
	}
}
