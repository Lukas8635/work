// Hide upsell modal — cart page only (SPA-aware)
(function () {
  console.log('styleeeee')
  const STYLE_ID = 'pegasas-hide-upsell';
  const CSS = `
    [class*="UpsellModal"],
    [class*="CustomerModal-upsellModal"],
    .modal-backdrop.show {
      display: none !important;
    }
  `;

  function applyStyle() {
    const isCart = window.location.pathname === '/cart';
    let el = document.getElementById(STYLE_ID);

    if (isCart && !el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      el.textContent = CSS;
      document.head.appendChild(el);
    } else if (!isCart && el) {
      el.remove();
    }
  }

  // Patch pushState / replaceState to catch SPA navigation
  ['pushState', 'replaceState'].forEach(fn => {
    const original = history[fn];
    history[fn] = function () {
      original.apply(this, arguments);
      applyStyle();
    };
  });

  window.addEventListener('popstate', applyStyle);

  applyStyle();
})();
