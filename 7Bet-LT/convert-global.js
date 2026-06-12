(function () {
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;bottom:40px;right:40px;z-index:99999;';

  var inner = document.createElement('div');
  inner.id = 'glow-test';
  inner.textContent = 'Glow test';
  inner.style.cssText = 'background:#1a1a2e;color:#fff;font-family:sans-serif;font-size:16px;padding:200px 400px;border-radius:2px;cursor:default;';

  wrapper.appendChild(inner);
  document.body.appendChild(wrapper);
})();