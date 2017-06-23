; (function () {
  var body = document.getElementsByTagName('body')[0];
  var randStr = function (len) {
    var x = 'abcdefhijkmnprstwxyz2345678';
    var maxPos = x.length;
    var pwd = '';
    for (var i = 0; i < len; i += 1) {
      pwd += x.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
  };

  // 获取表单项目列表
  var getList = function (form) {
    var items = [].slice.call(form.querySelectorAll('input'));
    var selctor = form.querySelectorAll('select');
    if (selctor.length > 0) {
      items.push(selctor[0]);
    }
    return items;
  };

  // 触发 react onchange 事件并赋值
  var setValue = function (element, value) {
    if (!element) {
      return;
    }
    element.value = value;
    if ('createEvent' in document) {
      var event = new Event('input', { bubbles: true });
      element.dispatchEvent(event);
    }
    else {
      element.fireEvent('onchange');
    }
  };
  
  // 插入 ak/sk 输入框
  document.getElementById('swagger-ui').addEventListener('DOMNodeInserted', function (e) {
    var checkNode = document.getElementsByClassName('description');
    var destNode = document.getElementsByClassName('secretForm');
    if (checkNode.length > 0 && destNode.length === 0) {
      var SecretId = localStorage.getItem('SecretId') || '';
      var SecretKey = authcode.decode(localStorage.getItem('SecretKey') || '', 'willin');
      checkNode[0].innerHTML += '<div class="secretForm"><p><label for="SecretId">SecretId</label> <input type="text" id="SecretId" placeholder="SecretId" value="' + SecretId + '"></p><p><label for="SecretKey">SecretKey</label> <input type="password" id="SecretKey" placeholder="SecretKey" value="' + SecretKey + '"></p><p><button class="btn secretShow">显示/隐藏SecretKey</button> <button class="btn secretSave">保存</button></p></div>';
    }
    var schemes = document.getElementsByClassName('schemes');
    if (schemes.length > 0) {
      schemes[0].querySelector('select').value = location.protocol.replace(':', '');
    }
  });

  var sign = function (items) {
    var method = items[0].parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.getElementsByClassName('opblock-summary-method')[0].innerText;
    var host = document.getElementsByClassName('base-url')[0].innerText.replace('[ Base url: ', '').replace(/\/?\]/, '');
    var path = items[0].parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.getElementsByClassName('opblock-summary-path')[0].childNodes[0].innerText;
    var signMethod = 'HmacSHA1';

    var params = {};
    for (var i = 0; i < items.length; i++) {
      var key = items[i].parentNode.previousSibling.childNodes[0].innerText;
      if (key) { key = key.replace(' *', ''); }
      var value = items[i].value;
      if (value === 'HmacSHA256') {
        signMethod = value;
      }
      params[key] = value;
    }
    var toCheck = Object.keys(params).sort();
    var toSign = [];
    for (var i = 0; i < toCheck.length; i++) {
      var key = toCheck[i];
      var value = params[toCheck[i]];
      if (key !== 'Signature' && value !== '') {
        var str = key.indexOf('_') ? key.replace(/_/g, '.') : key;
        str += '=' + value;
        toSign.push(str);
      }
    }
    toSign = method + host + path + '?' + toSign.join('&');
    var shaObj = new jsSHA(signMethod === 'HmacSHA256' ? 'SHA-256' : 'SHA-1', 'TEXT');
    shaObj.setHMACKey(document.getElementById('SecretKey').value, 'TEXT');
    shaObj.update(toSign);
    return shaObj.getHMAC('B64');
  };

  var fillIn = function (items) {
    var signItem;
      for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var placeholder = item.placeholder || '';
      if (/Timestamp|Nonce|SecretId|Signature|key/.test(placeholder) && !item.hasAttribute('readonly')) {
        item.setAttribute('readonly', true);
      }
      if (/Timestamp/.test(placeholder)) {
        setValue(item, parseInt(new Date() / 1000, 10));
      } else if (/Nonce/.test(placeholder)) {
        setValue(item, parseInt(Math.random() * 65535, 10));
      } else if (/SecretId/.test(placeholder)) {
        setValue(item, document.getElementById('SecretId').value);
      } else if (/Signature/.test(placeholder)) {
        signItem = item;
      }
    }
    setValue(signItem, sign(items));
  };

  body.addEventListener('click', function (e) {
    if (e.target && e.target.nodeName.toLowerCase() === 'button') {
      var button = e.target;
      // try out 按钮点击事件
      if (button.className.indexOf('try-out__btn') !== -1) {
        if (button.className.indexOf('cancel') !== -1) {
          return;
        }
        if (document.getElementById('SecretKey').value === '') {  
          window.scrollTo(0, 0);
          alert('请先填入SecretId/SecretKey信息');
          return;
        }
        var form = button.parentNode.parentNode.nextSibling.childNodes[0].childNodes[1];
        (function (f) {
          setTimeout(function () {
            var items = getList(f);
            // 插入加密按钮
            for (var i = 0; i < items.length; i += 1) {
              var key = items[i].parentNode.previousSibling.childNodes[0].innerText;
              if (key) { key = key.replace(' *', ''); }
              if (key === 'password' && items[i].nextSibling === null) {
                items[i].insertAdjacentHTML('afterend', '<button class="btn authcode">加密</button>');
              }
            }
            fillIn(items);
          }, 200);
        })(form);
      }
      // 保存按钮事件
      else if (button.className.indexOf('secretSave') !== -1) {
        localStorage.setItem('SecretId', document.getElementById('SecretId').value);
        localStorage.setItem('SecretKey', authcode.encode(document.getElementById('SecretKey').value, 'willin'));
        button.style = 'display:none';
        (function (x) { setTimeout(function () { x.style = 'display:inline-block' }, 1000) })(button);
      }
      // 显示/隐藏SecretKey按钮事件  
      else if (button.className.indexOf('secretShow') !== -1) {
        var SecretKey = document.getElementById('SecretKey');
        if (SecretKey.type === 'text') {
          SecretKey.type = 'password';
        } else {
          SecretKey.type = 'text';
        }
      }
      // 加密按钮事件
      else if (button.className.indexOf('authcode') !== -1) {
        var password = button.previousSibling;
        var form = button.parentNode.parentNode.parentNode;
        var key = form.querySelector('[placeholder^=key]');
        var rndKey = randStr(6);
        setValue(key, rndKey);
        setValue(password, authcode.encode(password.value, rndKey));
        fillIn(getList(form));
      }
    }
  });

  // 侦听键盘操作
  body.addEventListener('keyup', function (e) {
    if (e.target.parentNode.nodeName === 'TD') {
      var form = e.target.parentNode.parentNode.parentNode;
      fillIn(getList(form));
    }
  });
})();