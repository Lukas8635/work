(function () {
  'use strict';

  var lang = /\/en(?:\/|$)/.test(location.pathname) ? 'en' : 'lt';

  var T = {
    lt: {
      labelLightweight: 'Lengvas',
      labelBestValue: 'Geriausia vertė',
      tagSingleUnit: 'Vienas vienetas',
      tagPocketSized: 'Kompaktiško dydžio',
      tagTouchScreen: 'Jutiklinis ekranas',
      tagPauseMode: 'Pauzės režimas',
      tagSmartResponses: 'Išmanusis reagavimas',
      tagAutoStart: 'Automatinis kaitinimas',
      tagFlexPuff: '„FlexPuff“',
      tagCustomLED: 'Custom LED',
      tagFlexBattery: 'FlexBattery',
      learnMore: 'Sužinoti daugiau',
      addToCart: 'Į Krepšelį'
    },
    en: {
      labelLightweight: 'Lightweight',
      labelBestValue: 'Best value',
      tagSingleUnit: 'Single unit',
      tagPocketSized: 'Pocket-sized',
      tagTouchScreen: 'Touch screen',
      tagPauseMode: 'Pause mode',
      tagSmartResponses: 'Smart Responses',
      tagAutoStart: 'AutoStart',
      tagFlexPuff: 'FlexPuff',
      tagCustomLED: 'Custom LED',
      tagFlexBattery: 'FlexBattery',
      learnMore: 'Learn more',
      addToCart: 'Add to cart'
    }
  };

  var t = T[lang];

  var HS_CONFIG = {
    'discover-iluma-i-one-hs': {
      label: t.labelLightweight,
      labelMod: 'light',
      tags: [t.tagSingleUnit, t.tagPocketSized]
    },
    'discover-iluma-i-hs': {
      label: t.labelBestValue,
      labelMod: 'teal',
      tags: [t.tagTouchScreen, t.tagPauseMode, t.tagSmartResponses],
      productId: 1722
    }
  };

  var DEVICE_CONFIG = {
    'discover-iluma-i-one': {
      productId: 1610,
      optionId: 215,
      optionValue: 1410,
      tags: [t.tagSingleUnit, t.tagPocketSized]
    },
    'discover-iluma-i': {
      productId: 1609,
      optionId: 214,
      optionValue: 1411,
      tags: [t.tagTouchScreen, t.tagPauseMode, t.tagCustomLED]
    },
    'discover-iluma-i-prime': {
      productId: 1594,
      optionId: 213,
      optionValue: 1412,
      tags: [t.tagAutoStart, t.tagPauseMode, t.tagFlexPuff, t.tagFlexBattery]
    }
  };

  function addHoverAnimation(btn) {
    btn.classList.add('wc-btn-animated');
    btn.addEventListener('mouseenter', function () { if (!btn.disabled) btn.classList.add('wc-btn-hovered'); });
    btn.addEventListener('mouseleave', function () { btn.classList.remove('wc-btn-hovered'); });
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

  var RECAPTCHA_SITE_KEY = '6Lcgvx8sAAAAADoQb575bOtmrk8VPlYUl9sGZwD7';
  var RECAPTCHA_ACTION = 'use_for_add_to_cart';

  function getRecaptchaToken() {
    return new Promise(function (resolve) {
      function execute() {
        var rc = window.grecaptcha && (grecaptcha.enterprise || grecaptcha);
        rc.execute(RECAPTCHA_SITE_KEY, { action: RECAPTCHA_ACTION }).then(resolve);
      }

      if (window.grecaptcha && (grecaptcha.enterprise || grecaptcha.execute)) {
        execute();
      } else {
        var script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/enterprise.js?render=' + RECAPTCHA_SITE_KEY;
        script.onload = function () {
          grecaptcha.enterprise.ready(execute);
        };
        document.head.appendChild(script);
      }
    });
  }

  function doAddToCart(cfg, btn) {
    var productId = cfg.productId;
    btn.disabled = true;
    btn.classList.remove('wc-btn-hovered');

    getRecaptchaToken().then(function (token) {
      var form = document.createElement('form');
      form.method = 'POST';
      form.action = location.origin + '/' + lang;

      var fields = {};
      fields['product_data[' + productId + '][product_id]'] = productId;
      fields['product_data[' + productId + '][amount]'] = 1;
      if (cfg.optionId && cfg.optionValue) {
        fields['product_data[' + productId + '][product_options][' + cfg.optionId + ']'] = cfg.optionValue;
      }
      fields['redirect_url'] = 'checkout.cart';
      fields['dispatch[checkout.add]'] = '';
      fields['provider'] = 'recaptcha_v3';
      fields['g-action'] = RECAPTCHA_ACTION;
      fields['g-recaptcha-response'] = token;

      Object.keys(fields).forEach(function (name) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = fields[name];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    }).catch(function () {
      btn.disabled = false;
    });
  }

  function enhanceHS() {
    var ids = Object.keys(HS_CONFIG);
    var cards = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (cards.length === 0) return;

    var dedicatedCards = cards.filter(function (card) {
      var section = card.closest('section');
      return !section || !section.classList.contains('iluma-devices-horizontal');
    });

    var showLabels = dedicatedCards.length >= 2;

    cards.forEach(function (card) {
      var cfg = HS_CONFIG[card.id];
      var section = card.closest('section');
      var isHorizontal = section && section.classList.contains('iluma-devices-horizontal');

      if (showLabels && !isHorizontal) {
        var badge = document.createElement('span');
        badge.className = 'wc-label wc-label--' + cfg.labelMod;
        badge.textContent = cfg.label;
        card.insertBefore(badge, card.firstChild);
      }

      if (isHorizontal) {
        var w2 = card.querySelector('.txt-wrapper-2');
        var w3 = card.querySelector('.txt-wrapper-3');
        if (w2) {
          w2.appendChild(buildTags(cfg.tags));

          if (cfg.productId) {
            var origBtn = w3 && w3.querySelector('.btn');
            var atcBtn = document.createElement('button');
            atcBtn.className = 'btn btn-primary-dark wc-atc';
            atcBtn.type = 'button';
            atcBtn.textContent = origBtn ? origBtn.textContent.trim() : t.learnMore;
            addHoverAnimation(atcBtn);
            atcBtn.addEventListener('click', (function (href) {
              return function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = href;
              };
            })(card.href));
            w2.appendChild(atcBtn);
            if (w3) w3.style.display = 'none';
          }
        }
      } else {
        var txtWrapper = card.querySelector('.txt-wrapper');
        var cta = txtWrapper && txtWrapper.querySelector('.btn');
        if (txtWrapper && cta) {
          cta.classList.add('btn-primary-dark');
          addHoverAnimation(cta);
          txtWrapper.insertBefore(buildTags(cfg.tags), cta);
        }
      }
    });
  }

  function enhanceDevices() {
    Object.keys(DEVICE_CONFIG).forEach(function (id) {
      var cfg = DEVICE_CONFIG[id];
      var card = document.getElementById(id);
      if (!card) return;

      var w2 = card.querySelector('.txt-wrapper-2');
      var w3 = card.querySelector('.txt-wrapper-3');
      if (!w2) return;

      var tags = buildTags(cfg.tags);
      var lm = document.createElement('span');
      lm.className = 'wc-learn-more';
      lm.textContent = t.learnMore;
      tags.appendChild(lm);
      w2.appendChild(tags);

      var atcBtn = document.createElement('button');
      atcBtn.className = 'btn btn-primary-dark wc-atc';
      atcBtn.type = 'button';
      atcBtn.textContent = t.addToCart;
      addHoverAnimation(atcBtn);
      atcBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        doAddToCart(cfg, atcBtn);
      });
      w2.appendChild(atcBtn);

      if (w3) w3.style.display = 'none';
    });
  }

  function run() {
    enhanceHS();
    enhanceDevices();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
