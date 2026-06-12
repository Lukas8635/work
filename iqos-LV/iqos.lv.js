
// Summer promo homepage enhancement
(function () {
  'use strict';

  var lang = /\/ru(?:\/|$)/.test(location.pathname) ? 'ru' : 'lv';

  var T = {
    lv: {
      labelLightweight: 'Viegls',
      labelBestValue: 'Labākā vērtība',
      tagSingleUnit: 'Viena vienība',
      tagPocketSized: 'Kabatas izmēra',
      tagTouchScreen: 'Skārienjutīgs ekrāns',
      tagPauseMode: 'Pauzes režīms',
      tagSmartResponses: 'Viedās atbildes',
      tagAutoStart: 'Automātiska ieslēgšanās',
      tagFlexPuff: '„FlexPuff"',
      tagCustomLED: 'Custom LED',
      tagFlexBattery: 'FlexBattery',
      learnMore: 'Uzzināt vairāk',
      addToCart: 'Rezervēt'
    },
    ru: {
      labelLightweight: 'Легкий',
      labelBestValue: 'Лучшая ценность',
      tagSingleUnit: 'Однокомпонентное',
      tagPocketSized: 'Карманный размер',
      tagTouchScreen: 'Сенсорный экран',
      tagPauseMode: 'Режим паузы',
      tagSmartResponses: 'Умные функции',
      tagAutoStart: 'Автозапуск',
      tagFlexPuff: '„FlexPuff"',
      tagCustomLED: 'Custom LED',
      tagFlexBattery: 'FlexBattery',
      learnMore: 'Узнать больше',
      addToCart: 'Забронировать'
    }
  };

  var t = T[lang];

  // patterns: substrings that identify a card's href in any language (LV + RU)
  // Ordered most-specific first to avoid partial slug matches
  var DEVICE_CONFIG = [
    {
      patterns: ['karsesanas-komplekti/iluma-i-un', 'nabory-dlia-nagrevaniia/iluma-i-i'],
      productId: 310,
      defaultVariant: 'SP205319',
      tags: [t.tagTouchScreen, t.tagPauseMode, t.tagSmartResponses]
    },
    {
      patterns: ['iqos-iluma-i-prime'],
      productId: 261,
      defaultVariant: 'DK005318',
      tags: [t.tagAutoStart, t.tagPauseMode, t.tagFlexPuff, t.tagSmartResponses]
    },
    {
      patterns: ['iqos-iluma-i-one'],
      productId: 278,
      defaultVariant: 'DK005315',
      tags: [t.tagSingleUnit, t.tagPocketSized]
    },
    {
      patterns: ['iqos-iluma-i'],
      productId: 277,
      defaultVariant: 'DK005319',
      tags: [t.tagTouchScreen, t.tagPauseMode, t.tagSmartResponses]
    }
  ];

  // HS bundles — one entry per possible HS card (LV + RU patterns)
  var HS_BUNDLES = [
    {
      patterns: ['karsesanas-komplekti/iluma-i-one', 'nabory-dlia-nagrevaniia/iluma-i-one'],
      productId: 309,
      defaultVariant: 'SP205315',
      label: t.labelLightweight,
      labelMod: 'light',
      tags: [t.tagSingleUnit, t.tagPocketSized]
    },
    {
      patterns: ['karsesanas-komplekti/iluma-i-un', 'nabory-dlia-nagrevaniia/iluma-i-i'],
      productId: 310,
      defaultVariant: 'SP205319',
      label: t.labelBestValue,
      labelMod: 'teal',
      tags: [t.tagTouchScreen, t.tagPauseMode, t.tagSmartResponses]
    }
  ];

  function matchesPatterns(href, patterns) {
    return patterns.some(function (p) { return href.indexOf(p) !== -1; });
  }

  function buildTags(tags) {
    var wrap = document.createElement('div');
    wrap.className = 'wc-tags';
    tags.forEach(function (tag) {
      var chip = document.createElement('span');
      chip.className = 'wc-tag';
      chip.textContent = tag;
      wrap.appendChild(chip);
    });
    return wrap;
  }

  // Token cache: pre-fetch CSRF tokens at page load so ATC click has no delay
  var tokenCache = {};

  function prefetchToken(productPageUrl) {
    if (tokenCache[productPageUrl]) return;
    tokenCache[productPageUrl] = fetch(productPageUrl, { credentials: 'include' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var input = doc.querySelector('[name="sylius_add_to_cart[_token]"]');
        return input ? input.value : null;
      })
      .catch(function () { return null; });
  }

  function addHoverAnimation(el) {
    el.classList.add('wc-btn-animated');
    el.addEventListener('mouseenter', function () { if (!el.disabled) el.classList.add('wc-btn-hovered'); });
    el.addEventListener('mouseleave', function () { el.classList.remove('wc-btn-hovered'); });
  }

  function doAddToCart(cfg, productPageUrl, btn) {
    btn.disabled = true;
    btn.classList.remove('wc-btn-hovered');

    Promise.resolve(tokenCache[productPageUrl] || prefetchToken(productPageUrl) || tokenCache[productPageUrl])
      .then(function (token) {
        if (!token) throw new Error('no token');
        var fd = new FormData();
        fd.append('sylius_add_to_cart[cartItem][variant]', cfg.defaultVariant);
        fd.append('sylius_add_to_cart[_token]', token);
        return fetch(location.origin + '/' + lang + '/ajax/cart/add?productId=' + cfg.productId, {
          method: 'POST',
          body: fd,
          credentials: 'include'
        });
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        window.location.href = location.origin + (data.redirect || '/' + lang + '/rezervacija');
      })
      .catch(function () {
        btn.disabled = false;
      });
  }

  function makeAtcButton(cfg, productPageUrl) {
    var btn = document.createElement('button');
    btn.className = 'btn btn-dark wc-atc';
    btn.type = 'button';
    btn.textContent = t.addToCart;
    addHoverAnimation(btn);
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      doAddToCart(cfg, productPageUrl, btn);
    });
    return btn;
  }

  function enhanceHS() {
    var section = document.getElementById('summer-promo-products');
    if (!section) return;

    var matchedCards = [];
    section.querySelectorAll('.summer-promo-products-card-link').forEach(function (card) {
      var bundle = null;
      for (var i = 0; i < HS_BUNDLES.length; i++) {
        if (matchesPatterns(card.href, HS_BUNDLES[i].patterns)) { bundle = HS_BUNDLES[i]; break; }
      }
      if (!bundle) return;
      matchedCards.push({ card: card, bundle: bundle });
    });

    var showLabels = matchedCards.length >= 2;

    matchedCards.forEach(function (item) {
      var card = item.card;
      var bundle = item.bundle;

      prefetchToken(card.href);

      card.addEventListener('click', function (e) {
        if (e.target.closest('.wc-atc')) return;
        e.preventDefault();
        window.location.href = card.href;
      });

      if (showLabels) {
        var badge = document.createElement('span');
        badge.className = 'wc-label wc-label--' + bundle.labelMod;
        badge.textContent = bundle.label;
        var inner = card.querySelector('.summer-promo-products-card-inner') || card;
        inner.insertBefore(badge, inner.firstChild);
      }

      var cta = card.querySelector('span.btn');
      if (cta) cta.classList.add('wc-learn-more');

      var cardContent = card.querySelector('.summer-promo-products-card-content');
      if (cardContent) {
        if (bundle.tags && bundle.tags.length) {
          var tagsEl = buildTags(bundle.tags);
          if (cta) tagsEl.appendChild(cta);
          cardContent.appendChild(tagsEl);
        }
        cardContent.appendChild(makeAtcButton(bundle, card.href));
      }
    });
  }

  function enhanceDevices() {
    var section = document.getElementById('summer-promo-products-devices');
    if (!section) return;

    section.querySelectorAll('.summer-promo-products-row-card-link').forEach(function (card) {
      var cfg = null;
      for (var i = 0; i < DEVICE_CONFIG.length; i++) {
        if (matchesPatterns(card.href, DEVICE_CONFIG[i].patterns)) { cfg = DEVICE_CONFIG[i]; break; }
      }
      if (!cfg) return;

      prefetchToken(card.href);

      card.addEventListener('click', function (e) {
        if (e.target.closest('.wc-atc')) return;
        e.preventDefault();
        window.location.href = card.href;
      });

      var content = card.querySelector('.summer-promo-products-row-card-content');
      if (!content) return;

      var firstAction = content.querySelector('.summer-promo-products-row-card-action');

      var tags = buildTags(cfg.tags);
      var lm = document.createElement('span');
      lm.className = 'wc-learn-more';
      lm.textContent = t.learnMore;
      tags.appendChild(lm);
      if (firstAction) {
        content.insertBefore(tags, firstAction);
      } else {
        content.appendChild(tags);
      }

      content.appendChild(makeAtcButton(cfg, card.href));
    });
  }

  function enhanceCtaButtons() {
    document.querySelectorAll('.btn-dark:not(.wc-btn-animated)').forEach(function (btn) {
      addHoverAnimation(btn);
    });
  }

  function run() {
    enhanceHS();
    enhanceDevices();
    enhanceCtaButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
