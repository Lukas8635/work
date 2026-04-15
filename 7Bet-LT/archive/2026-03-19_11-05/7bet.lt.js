(function() {
  'use strict';
  console.log('7bet.lt deposit variation script loaded');

  var CONFIG = {
    presetAmounts: [15, 20, 50, 100, 200, 300],
    defaultAmount: 20,
    kitaSumaText: 'Kita suma?',
    depositPath: '/deposit',
    checkInterval: 300,
    maxAttempts: 60
  };

  var state = {
    selectedAmount: CONFIG.defaultAmount,
    isCustomVisible: false,
    customValue: '',
    hasError: false
  };

  var isFirstInject = true;
  var mainObserver = null;

  // --- Helpers ---

  function log(msg, data) {
    if (data !== undefined) {
      console.log('[7bet DEP]', msg, data);
    } else {
      console.log('[7bet DEP]', msg);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function setNativeValue(input, value) {
    try {
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
    } catch (e) {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // --- Selectors ---

  function getAmountInput() {
    // After injection, original input is marked with data-dep-hidden
    // This prevents accidentally targeting our own injected custom input
    return document.querySelector('main input[data-dep-hidden="true"]') ||
           document.querySelector('main input[type="text"]:not([data-dep-var])');
  }

  function getAmountLabel() {
    var labels = document.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim() === 'Įmokos suma') {
        return labels[i];
      }
    }
    return null;
  }

  function getInputValuesContainer() {
    return document.querySelector('.deposit-form__amount .input-values');
  }

  function isOnDepositPage() {
    return window.location.pathname === CONFIG.depositPath;
  }

  // --- Error detection ---

  function checkLabelError() {
    var field = document.querySelector('.deposit-form__amount');
    return field ? field.classList.contains('field-error') : false;
  }

  // --- Variation UI ---

  function buildHTML() {
    var btnsHtml = CONFIG.presetAmounts.map(function(amount) {
      var selected = (amount === state.selectedAmount && !state.isCustomVisible);
      return '<button class="dep-var-btn' + (selected ? ' dep-var-btn--selected' : '') +
        '" type="button" data-dep-amount="' + amount + '">€' + amount + '</button>';
    }).join('');

    var linkClass = 'dep-var-kita-link' + (state.hasError && state.isCustomVisible ? ' dep-var-kita-link--error' : '');
    var inputClass = 'dep-var-custom-input' +
      (state.isCustomVisible ? ' dep-var-custom-input--visible' : '') +
      (state.hasError && state.isCustomVisible ? ' dep-var-custom-input--error' : '');

    return '<div class="dep-var-wrapper" data-dep-var="injected">' +
      '<div class="dep-var-buttons-row">' + btnsHtml + '</div>' +
      '<div class="dep-var-kita-row">' +
        '<span class="' + linkClass + '" data-dep-var="kita-link">' + escapeHtml(CONFIG.kitaSumaText) + '</span>' +
        '<input class="' + inputClass + '" data-dep-var="custom-input" type="text" autocomplete="off" value="">' +
      '</div>' +
    '</div>';
  }

  function updateUI() {
    var wrapper = document.querySelector('[data-dep-var="injected"]');
    if (!wrapper) return;

    // Buttons
    wrapper.querySelectorAll('.dep-var-btn').forEach(function(btn) {
      var amount = parseInt(btn.getAttribute('data-dep-amount'), 10);
      var selected = (amount === state.selectedAmount && !state.isCustomVisible);
      btn.classList.toggle('dep-var-btn--selected', selected);
    });

    // Kita suma link
    var kitaLink = wrapper.querySelector('[data-dep-var="kita-link"]');
    if (kitaLink) {
      kitaLink.classList.toggle('dep-var-kita-link--error', state.hasError && state.isCustomVisible);
    }

    // Custom input
    var customInput = wrapper.querySelector('[data-dep-var="custom-input"]');
    if (customInput) {
      customInput.classList.toggle('dep-var-custom-input--visible', state.isCustomVisible);
      customInput.classList.toggle('dep-var-custom-input--error', state.hasError && state.isCustomVisible);
    }
  }

  function attachEvents(wrapper) {
    wrapper.querySelectorAll('.dep-var-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        onPresetClick(parseInt(btn.getAttribute('data-dep-amount'), 10));
      });
    });

    var kitaLink = wrapper.querySelector('[data-dep-var="kita-link"]');
    if (kitaLink) {
      kitaLink.addEventListener('click', onKitaSumaClick);
    }

    var customInput = wrapper.querySelector('[data-dep-var="custom-input"]');
    if (customInput) {
      customInput.addEventListener('input', function() {
        onCustomInputChange(customInput.value);
      });
      customInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') onEscape();
      });
    }
  }

  // --- Event handlers ---

  function onPresetClick(amount) {
    log('Preset selected:', amount);
    state.selectedAmount = amount;
    state.isCustomVisible = false;
    state.customValue = '';
    state.hasError = false;

    updateUI();

    // setNativeValue fires React's input event which may trigger re-render.
    // updateUI must run first so selected class is applied before any re-render.
    var origInput = getAmountInput();
    if (origInput) setNativeValue(origInput, String(amount));
  }

  function onKitaSumaClick() {
    if (state.isCustomVisible) {
      onEscape();
      return;
    }
    log('Kita suma opened');
    state.isCustomVisible = true;
    state.selectedAmount = null;
    updateUI();

    setTimeout(function() {
      var customInput = document.querySelector('[data-dep-var="custom-input"]');
      if (customInput) {
        customInput.value = '';
        customInput.focus();
      }
    }, 220);
  }

  function onCustomInputChange(value) {
    state.customValue = value;
    var origInput = getAmountInput();
    if (origInput) setNativeValue(origInput, value);

    // Update error state based on label color after React processes the value
    setTimeout(function() {
      var hasError = checkLabelError();
      if (hasError !== state.hasError) {
        state.hasError = hasError;
        updateUI();
      }
    }, 100);
  }

  function onEscape() {
    log('Custom input closed');
    state.isCustomVisible = false;
    state.customValue = '';
    state.hasError = false;
    state.selectedAmount = CONFIG.defaultAmount;

    updateUI();

    var origInput = getAmountInput();
    if (origInput) setNativeValue(origInput, String(CONFIG.defaultAmount));
  }

  // --- Injection ---

  function injectVariation() {
    if (document.querySelector('[data-dep-var="injected"]')) return false;

    var label = getAmountLabel();
    if (!label) {
      log('Label not found');
      return false;
    }

    var origInput = getAmountInput();
    if (!origInput) {
      log('Input not found');
      return false;
    }

    // Find .input-values container (holds all preset amount buttons)
    var inputValues = getInputValuesContainer();
    if (!inputValues) {
      log('input-values container not found');
      return false;
    }

    // On first inject only: sync the default amount to React's input.
    // On re-inject skip setNativeValue — firing a React event causes another re-render loop.
    if (isFirstInject) {
      isFirstInject = false;
      setNativeValue(origInput, String(state.selectedAmount !== null ? state.selectedAmount : CONFIG.defaultAmount));
    }

    // Hide the original preset buttons container
    inputValues.setAttribute('data-dep-hidden', 'true');
    inputValues.style.setProperty('display', 'none', 'important');

    // Hide original input
    origInput.setAttribute('data-dep-hidden', 'true');
    origInput.style.setProperty('display', 'none', 'important');

    // Insert our wrapper before .input-values inside .deposit-form__amount
    var temp = document.createElement('div');
    temp.innerHTML = buildHTML();
    var wrapper = temp.firstElementChild;
    inputValues.parentNode.insertBefore(wrapper, inputValues);
    attachEvents(wrapper);

    log('Variation injected');
    return true;
  }

  function rehideOriginals() {
    var inputValues = getInputValuesContainer();
    if (inputValues) {
      inputValues.style.setProperty('display', 'none', 'important');
    }
    var origInput = document.querySelector('main input[data-dep-hidden="true"]');
    if (origInput) {
      origInput.style.setProperty('display', 'none', 'important');
    }
  }

  // --- Observer ---

  function setupObserver() {
    if (mainObserver) return;
    var main = document.querySelector('main');
    if (!main) return;

    mainObserver = new MutationObserver(function() {
      if (!isOnDepositPage()) return;

      // Re-inject if our wrapper was removed by React
      if (!document.querySelector('[data-dep-var="injected"]')) {
        log('Wrapper removed, reinjecting');
        injectVariation();
        return;
      }

      // Ensure originals stay hidden
      rehideOriginals();

      // Sync error state when custom input is active
      if (state.isCustomVisible) {
        var hasError = checkLabelError();
        if (hasError !== state.hasError) {
          state.hasError = hasError;
          updateUI();
        }
      }
    });

    // Watch only childList/subtree — attribute watching causes feedback loops.
    mainObserver.observe(main, { childList: true, subtree: true });
    log('Observer active');
  }

  function teardownObserver() {
    if (mainObserver) {
      mainObserver.disconnect();
      mainObserver = null;
    }
  }

  // --- SPA navigation ---

  function onNavigate() {
    if (isOnDepositPage()) {
      log('Navigated to deposit, (re)starting');
      // Reset inject state for this visit
      isFirstInject = true;
      state.selectedAmount = CONFIG.defaultAmount;
      state.isCustomVisible = false;
      state.customValue = '';
      state.hasError = false;
      // Re-setup observer on new main element (React may have replaced it)
      teardownObserver();
      waitForForm(function() {
        injectVariation();
        setupObserver();
      });
    } else {
      // Left deposit page — tear down so state is clean for next visit
      teardownObserver();
      isFirstInject = true;
    }
  }

  function patchHistory() {
    var _push = history.pushState;
    var _replace = history.replaceState;
    history.pushState = function() {
      _push.apply(this, arguments);
      setTimeout(onNavigate, 0);
    };
    history.replaceState = function() {
      _replace.apply(this, arguments);
      setTimeout(onNavigate, 0);
    };
    window.addEventListener('popstate', function() {
      setTimeout(onNavigate, 0);
    });
  }

  // --- Init ---

  function waitForForm(callback, attempts) {
    attempts = attempts || 0;
    if (attempts >= CONFIG.maxAttempts) {
      log('Form not found after max attempts');
      return;
    }
    if (!isOnDepositPage()) return;
    var input = getAmountInput();
    var label = getAmountLabel();
    var inputValues = getInputValuesContainer();
    if (input && label && inputValues) {
      callback();
    } else {
      setTimeout(function() { waitForForm(callback, attempts + 1); }, CONFIG.checkInterval);
    }
  }

  function start() {
    patchHistory();
    if (isOnDepositPage()) {
      waitForForm(function() {
        injectVariation();
        setupObserver();
      });
    }
  }

  start();

})();
