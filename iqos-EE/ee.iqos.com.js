(function() {
  'use strict';

  // ── PDP step strip ───────────────────────────────────────────────────────

  var STRIP_ID = 'iqos-steps-strip';

  var LABELS = {
    et: {
      step1: 'Seade',
      step2: 'Värvus',
      step3: 'Broneering'
    },
    ru: {
      step1: 'Устройство',
      step2: 'Цвет',
      step3: 'Бронирования'
    }
  };

  var SELECTORS = {
    PRODUCT_LABELS: '.product-labels',
    COLOR_GROUP: '[role="group"]:has(input[type="radio"]), fieldset:has(input[type="radio"])',
    RATING_SUMMARY: '.rating_summary',
    PDP_FORM: 'form[data-category]'
  };

  var DEVICE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3327 4L5.99935 11.3333L2.66602 8" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function getLocale() {
    var path = window.location.pathname;
    return (path.indexOf('/ru/') !== -1 || path.indexOf('/ru') === 0) ? 'ru' : 'et';
  }

  function isPDP() {
    var path = window.location.pathname;
    return (path.indexOf('/kataloog/') !== -1 || path.indexOf('/katalog/') !== -1) &&
           !!document.querySelector(SELECTORS.PDP_FORM);
  }

  function createStrip() {
    var locale = getLocale();
    var labels = LABELS[locale];
    var step3Label = labels.step3;

    var strip = document.createElement('div');
    strip.id = STRIP_ID;
    strip.innerHTML =
      '<div class="iqos-steps">' +
        '<div class="iqos-step">' +
          '<div class="iqos-step__icon iqos-step__icon--done">' + DEVICE_SVG + '</div>' +
          '<span class="iqos-step__label iqos-step__label--done">' + labels.step1 + '</span>' +
        '</div>' +
        '<div class="iqos-step__line iqos-step__line--done"></div>' +
        '<div class="iqos-step">' +
          '<div class="iqos-step__icon iqos-step__icon--active">2</div>' +
          '<span class="iqos-step__label iqos-step__label--active">' + labels.step2 + '</span>' +
        '</div>' +
        '<div class="iqos-step__line"></div>' +
        '<div class="iqos-step">' +
          '<div class="iqos-step__icon iqos-step__icon--next">3</div>' +
          '<span class="iqos-step__label">' + step3Label + '</span>' +
        '</div>' +
      '</div>';

    return strip;
  }

  function insertStrip() {
    if (document.getElementById(STRIP_ID) || !isPDP()) return;

    var strip = createStrip();

    var productLabels = document.querySelector(SELECTORS.PRODUCT_LABELS);
    if (productLabels) {
      productLabels.insertAdjacentElement('afterend', strip);
      return;
    }

    var colorGroup = document.querySelector(SELECTORS.COLOR_GROUP);
    if (colorGroup) {
      colorGroup.insertAdjacentElement('beforebegin', strip);
      return;
    }

    var ratingSummary = document.querySelector(SELECTORS.RATING_SUMMARY);
    if (ratingSummary) {
      ratingSummary.insertAdjacentElement('afterend', strip);
    }
  }

  var reinitTimeout = null;

  function setupObserver() {
    new MutationObserver(function(mutations) {
      if (document.getElementById(STRIP_ID)) return;
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          clearTimeout(reinitTimeout);
          reinitTimeout = setTimeout(insertStrip, 200);
          break;
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ── Homepage card enhancement ────────────────────────────────────────────

  var T = {
    et: { learnMore: 'Uuri lähemalt', addToCart: 'Broneerima', badge: 'Uus' },
    ru: { learnMore: 'Узнать больше', addToCart: 'Забронировать', badge: 'Новый' }
  };

  // Ordered most-specific first to avoid slug substring collisions
  // ET uses /kataloog/ (double-o), RU uses /katalog/ (single-o)
  var DEVICE_CONFIG = [
    {
      slug: 'iqos-iluma-i-prime',
      productId: 303,
      defaultVariant: 'DK005318',
      radioName: 'iqos-iluma-i-prime',
      pdpPath: { et: '/kataloog/iluma-i/iqos-iluma-i-prime', ru: '/katalog/iluma-i/iqos-iluma-i-prime' }
    },
    {
      slug: 'iqos-iluma-i-one',
      productId: 301,
      defaultVariant: 'DK005315',
      radioName: 'iqos-iluma-i-one',
      pdpPath: { et: '/kataloog/iluma-i/iqos-iluma-i-one', ru: '/katalog/iluma-i/iqos-iluma-i-one' }
    },
    {
      slug: 'iqos-iluma-i',
      productId: 302,
      defaultVariant: 'DK005319',
      radioName: 'iqos-iluma-i',
      pdpPath: { et: '/kataloog/iluma-i/iqos-iluma-i', ru: '/katalog/iluma-i/iqos-iluma-i' }
    }
  ];

  var tokenCache = {};

  function prefetchToken(pdpUrl) {
    if (tokenCache[pdpUrl]) return;
    tokenCache[pdpUrl] = fetch(pdpUrl, { credentials: 'include' })
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var input = doc.querySelector('[name="sylius_add_to_cart[_token]"]');
        return input ? input.value : null;
      })
      .catch(function() { return null; });
  }

  function addHoverAnimation(el) {
    el.classList.add('wc-btn-animated');
    el.addEventListener('mouseenter', function() { if (!el.disabled) el.classList.add('wc-btn-hovered'); });
    el.addEventListener('mouseleave', function() { el.classList.remove('wc-btn-hovered'); });
  }

  function doAddToCart(cfg, originalCard, btn) {
    var locale = getLocale();
    var selectedRadio = originalCard.querySelector('input[name="' + cfg.radioName + '"]:checked');
    var variant = selectedRadio ? selectedRadio.value : cfg.defaultVariant;
    var pdpUrl = location.origin + '/' + locale + cfg.pdpPath[locale];

    btn.disabled = true;
    btn.classList.remove('wc-btn-hovered');

    prefetchToken(pdpUrl);
    Promise.resolve(tokenCache[pdpUrl])
      .then(function(token) {
        if (!token) throw new Error('no token');
        var fd = new FormData();
        fd.append('sylius_add_to_cart[cartItem][variant]', variant);
        fd.append('sylius_add_to_cart[_token]', token);
        return fetch(location.origin + '/' + locale + '/ajax/cart/add?productId=' + cfg.productId, {
          method: 'POST',
          body: fd,
          credentials: 'include'
        });
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        window.location.href = location.origin + (data.redirect || '/' + locale + '/valikud');
      })
      .catch(function() { btn.disabled = false; });
  }

  function getImageSrc(card) {
    var img = card.querySelector('.js__product-first-image');
    if (!img) return '';
    var dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy');
    if (dataSrc) return dataSrc;
    // Fall back to src only if it's not a placeholder
    var src = img.src || '';
    return src.indexOf('data:') === 0 ? '' : src;
  }

  function getProductName(card) {
    var legend = card.querySelector('legend');
    if (!legend) return '';
    return legend.textContent.trim()
      .replace(/\s*Valige värv\s*$/, '')
      .replace(/\s*Выберите цвет\s*$/, '');
  }

  function getPrice(card) {
    var el = card.querySelector('.h2');
    return el ? el.textContent.trim() : '';
  }

  function buildCard(data, t) {
    // Parse "€89.00" -> "89"
    var priceMatch = data.price.match(/(\d+)/);
    var priceNum = priceMatch ? priceMatch[1] : data.price;

    var card = document.createElement('div');
    card.className = 'wc-card';
    card.innerHTML =
      '<div class="wc-card__badge">' + t.badge + '</div>' +
      '<div class="wc-card__img-wrap">' +
        '<img class="wc-card__img" src="' + data.imgSrc + '" alt="' + data.productName + '">' +
      '</div>' +
      '<div class="wc-card__content">' +
        '<div class="wc-card__text">' +
          '<p class="wc-card__name">' + data.productName + '</p>' +
          '<div class="wc-card__price">' +
            '<span class="wc-card__price-num">' + priceNum + '</span>' +
            '<span class="wc-card__price-cur">EUR</span>' +
          '</div>' +
        '</div>' +
        '<a class="wc-learn-more" href="' + data.pdpHref + '">' + t.learnMore + '</a>' +
      '</div>';

    var atcBtn = document.createElement('button');
    atcBtn.className = 'wc-atc';
    atcBtn.type = 'button';
    atcBtn.textContent = t.addToCart;
    addHoverAnimation(atcBtn);
    atcBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      doAddToCart(data.cfg, data.originalCard, atcBtn);
    });

    card.querySelector('.wc-card__content').appendChild(atcBtn);

    card.style.cursor = 'pointer';
    card.addEventListener('click', function() {
      window.location.href = data.pdpHref;
    });

    return card;
  }

  function enhanceHomepageCards() {
    var locale = getLocale();
    var t = T[locale];
    var cards = document.querySelectorAll('.js__product-color-select-wrapper');
    if (!cards.length) return;

    var row = cards[0].closest('.row');
    if (!row || row.dataset.wcDone) return;
    row.dataset.wcDone = '1';

    var cardDataList = [];

    cards.forEach(function(card) {
      var existingBtn = card.querySelector('.btn-electric-purple');
      if (!existingBtn) return;

      var href = existingBtn.getAttribute('href') || '';
      var cfg = null;
      for (var i = 0; i < DEVICE_CONFIG.length; i++) {
        if (href.indexOf(DEVICE_CONFIG[i].slug) !== -1) { cfg = DEVICE_CONFIG[i]; break; }
      }
      if (!cfg) return;

      prefetchToken(location.origin + '/' + locale + cfg.pdpPath[locale]);

      cardDataList.push({
        cfg: cfg,
        imgSrc: getImageSrc(card),
        productName: getProductName(card),
        price: getPrice(card),
        pdpHref: '/' + locale + cfg.pdpPath[locale],
        originalCard: card
      });
    });

    if (!cardDataList.length) return;

    var container = document.createElement('div');
    container.className = 'wc-cards-container';

    cardDataList.forEach(function(data) {
      container.appendChild(buildCard(data, t));
    });

    var section = document.createElement('div');
    section.className = 'wc-section wc-section--' + locale;
    section.appendChild(container);

    var heroSlider = document.querySelector('.hero-slider.position-relative.smaller-slider-on-mobile');
    if (heroSlider) {
      heroSlider.classList.add('wc-hero-replaced');
      heroSlider.appendChild(section);
    } else {
      row.parentElement.insertBefore(section, row);
    }
    row.style.display = 'none';
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      insertStrip();
      setupObserver();
      enhanceHomepageCards();
    });
  } else {
    setTimeout(insertStrip, 300);
    setupObserver();
    enhanceHomepageCards();
  }

})();
