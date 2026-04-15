/**
 * IQOS LV Stock Indicator Script
 * Adds "In stock" / "Limited stock" / "Out of stock" indicators
 * to homepage product cards and PDP pages
 * Supports Latvian and Russian locales
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  const CONFIG = {
    // Stock status types
    STOCK_STATUS: {
      IN_STOCK: 'in-stock',
      LIMITED_STOCK: 'limited-stock',
      OUT_OF_STOCK: 'out-of-stock'
    },

    // Labels for each status by locale
    LABELS: {
      lv: {
        'in-stock': 'Pieejams',
        'limited-stock': 'Ierobežots daudzums',
        'out-of-stock': 'Nav pieejams'
      },
      ru: {
        'in-stock': 'В наличии',
        'limited-stock': 'Ограниченный запас',
        'out-of-stock': 'Нет в наличии'
      }
    },

    // Session storage key for stock data
    SESSION_STORAGE_KEY: 'iqos_stock_data',

    // Default stock status (used when no data available)
    DEFAULT_STATUS: 'in-stock',

    // Selectors
    SELECTORS: {
      // Homepage product cards - look for links inside main content (LV and RU URLs)
      HOMEPAGE_PRODUCT_CARDS: 'main a[href*="/produktu-katalogs/"], main a[href*="/katalog-tovarov/"]',
      HOMEPAGE_PRODUCT_TITLE: 'h3',

      // PDP selectors
      PDP_TITLE: 'main h1',
      // LV site uses fieldset/group for color selection
      PDP_COLOR_LIST: '[role="group"]:has(input[type="radio"]), fieldset:has(input[type="radio"])',
      PDP_COLOR_RADIO: 'input[type="radio"]',
      PDP_SELECTED_COLOR: 'input[type="radio"]:checked',
    }
  };

  // ============================================
  // LOCALE DETECTION
  // ============================================

  /**
   * Get current locale from URL
   * @returns {string} 'lv' or 'en'
   */
  function getCurrentLocale() {
    const path = window.location.pathname;
    if (path.includes('/ru/') || path.startsWith('/ru')) {
      return 'ru';
    }
    return 'lv';
  }

  /**
   * Get label for stock status in current locale
   * @param {string} status - Stock status
   * @returns {string} Localized label
   */
  function getLocalizedLabel(status) {
    const locale = getCurrentLocale();
    const labels = CONFIG.LABELS[locale] || CONFIG.LABELS.lv;
    return labels[status] || labels[CONFIG.DEFAULT_STATUS];
  }

  // ============================================
  // STOCK DATA MANAGEMENT
  // ============================================

  /**
   * Get stock data from session storage
   * @returns {Object} Stock data object keyed by product identifier
   */
  function getStockDataFromStorage() {
    try {
      const data = sessionStorage.getItem(CONFIG.SESSION_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.warn('[Stock Indicator] Error reading session storage:', e);
      return {};
    }
  }

  /**
   * Get stock status for a product
   * @param {string} productId - Product identifier (e.g., SKU, URL slug, or product name)
   * @param {string} [variantId] - Optional variant identifier (e.g., color)
   * @returns {string} Stock status from CONFIG.STOCK_STATUS
   */
  function getStockStatus(productId, variantId = null) {
    const stockData = getStockDataFromStorage();

    // Try to find stock data with variant
    if (variantId && stockData[`${productId}_${variantId}`]) {
      return stockData[`${productId}_${variantId}`];
    }

    // Try to find stock data without variant
    if (stockData[productId]) {
      return stockData[productId];
    }

    // Return default status
    return CONFIG.DEFAULT_STATUS;
  }

  /**
   * Set stock status for a product (for testing/demo purposes)
   * @param {string} productId - Product identifier
   * @param {string} status - Stock status
   * @param {string} [variantId] - Optional variant identifier
   */
  function setStockStatus(productId, status, variantId = null) {
    const stockData = getStockDataFromStorage();
    const key = variantId ? `${productId}_${variantId}` : productId;
    stockData[key] = status;

    try {
      sessionStorage.setItem(CONFIG.SESSION_STORAGE_KEY, JSON.stringify(stockData));
    } catch (e) {
      console.warn('[Stock Indicator] Error writing to session storage:', e);
    }
  }

  // Expose setStockStatus globally for dynamic updates
  window.iqosSetStockStatus = setStockStatus;

  // ============================================
  // UI COMPONENTS
  // ============================================

  /**
   * Create stock indicator element
   * @param {string} status - Stock status from CONFIG.STOCK_STATUS
   * @param {string[]} [additionalClasses] - Additional CSS classes
   * @returns {HTMLElement} Stock indicator element
   */
  function createStockIndicator(status, additionalClasses = []) {
    const indicator = document.createElement('div');
    indicator.className = `stock-indicator stock-indicator--${status} ${additionalClasses.join(' ')}`.trim();
    indicator.setAttribute('data-stock-status', status);

    const dot = document.createElement('span');
    dot.className = 'stock-indicator__dot';

    const text = document.createElement('span');
    text.className = 'stock-indicator__text';
    text.textContent = getLocalizedLabel(status);

    indicator.appendChild(dot);
    indicator.appendChild(text);

    return indicator;
  }

  /**
   * Update existing stock indicator
   * @param {HTMLElement} indicator - Existing indicator element
   * @param {string} newStatus - New stock status
   */
  function updateStockIndicator(indicator, newStatus) {
    // Remove old status classes
    Object.values(CONFIG.STOCK_STATUS).forEach(status => {
      indicator.classList.remove(`stock-indicator--${status}`);
    });

    // Add new status class
    indicator.classList.add(`stock-indicator--${newStatus}`);
    indicator.setAttribute('data-stock-status', newStatus);

    // Update text
    const textEl = indicator.querySelector('.stock-indicator__text');
    if (textEl) {
      textEl.textContent = getLocalizedLabel(newStatus);
    }

    // Re-trigger animation
    indicator.style.animation = 'none';
    indicator.offsetHeight; // Trigger reflow
    indicator.style.animation = '';
  }

  // ============================================
  // HOMEPAGE FUNCTIONALITY
  // ============================================

  /**
   * Extract product identifier from product card
   * @param {HTMLElement} card - Product card element
   * @returns {string} Product identifier
   */
  function getProductIdFromCard(card) {
    // Try to get from URL
    const href = card.getAttribute('href') || '';
    const urlMatch = href.match(/\/([^\/\?]+)(?:\?|$)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Try to get from product title
    const titleEl = card.querySelector(CONFIG.SELECTORS.HOMEPAGE_PRODUCT_TITLE);
    if (titleEl) {
      return titleEl.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    }

    return 'unknown-product';
  }

  /**
   * Add stock indicators to homepage product cards
   */
  function initHomepageStockIndicators() {
    // Find all product links in main content
    const productCards = document.querySelectorAll('main a[href*="/produktu-katalogs/"], main a[href*="/katalog-tovarov/"]');

    productCards.forEach(card => {
      // Skip if already has stock indicator
      if (card.querySelector('.stock-indicator')) {
        return;
      }

      // Skip footer/navigation links - only process product cards in content area
      if (card.closest('footer') || card.closest('nav')) {
        return;
      }

      // Get product ID and stock status
      const productId = getProductIdFromCard(card);
      const stockStatus = getStockStatus(productId);

      // Create stock indicator
      const indicator = createStockIndicator(stockStatus, ['homepage-product-card']);

      // Find insertion point - look for product name element or price element
      // LV site uses nested divs, find the element containing product name (starts with IQOS)
      const allElements = card.querySelectorAll('*');
      let insertAfter = null;

      for (const el of allElements) {
        const text = el.textContent ? el.textContent.trim() : '';
        // Find element that contains just the product name (IQOS...)
        if (text && text.match(/^IQOS\s+ILUMA/i) && el.children.length === 0) {
          insertAfter = el;
          break;
        }
      }

      if (insertAfter) {
        insertAfter.insertAdjacentElement('afterend', indicator);
      } else {
        // Fallback: insert at the beginning of the card's first child
        const firstChild = card.firstElementChild;
        if (firstChild) {
          firstChild.insertAdjacentElement('afterbegin', indicator);
        }
      }
    });

    console.log('[Stock Indicator] Homepage indicators initialized');
  }

  // ============================================
  // PDP FUNCTIONALITY
  // ============================================

  /**
   * Check if current page is a PDP
   * @returns {boolean}
   */
  function isPDPPage() {
    const path = window.location.pathname;
    // Support Latvian (/produktu-katalogs/), Russian (/katalog-tovarov/)
    return (path.includes('/produktu-katalogs/') || path.includes('/katalog-tovarov/')) &&
           document.querySelector(CONFIG.SELECTORS.PDP_TITLE) !== null;
  }

  /**
   * Check if current page is homepage
   * @returns {boolean}
   */
  function isHomepage() {
    const path = window.location.pathname;
    // Match /lv, /lv/, /ru, /ru/, or just /
    return path === '/' ||
           path === '/lv' ||
           path === '/lv/' ||
           path === '/ru' ||
           path === '/ru/' ||
           path.match(/^\/(lv|ru)\/?$/);
  }

  /**
   * Get product ID from PDP
   * @returns {string} Product identifier
   */
  function getPDPProductId() {
    // Try to get from URL
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || 'unknown-product';
  }

  /**
   * Get currently selected color variant on PDP
   * @returns {string|null} Selected variant ID or null
   */
  function getSelectedColorVariant() {
    const selectedRadio = document.querySelector(CONFIG.SELECTORS.PDP_SELECTED_COLOR);
    if (selectedRadio) {
      // Try multiple ways to get the color name
      // 1. From aria-label on the radio or parent
      // 2. From adjacent sibling element (LV site structure)
      // 3. From parent container's aria-label
      // 4. From radio value
      var closestLabel = selectedRadio.closest('[aria-label]');
      var parentLabel = selectedRadio.parentElement ? selectedRadio.parentElement.querySelector('[aria-label]') : null;
      var sibling = selectedRadio.nextElementSibling;
      return selectedRadio.getAttribute('aria-label') ||
             (closestLabel ? closestLabel.getAttribute('aria-label') : null) ||
             (parentLabel ? parentLabel.getAttribute('aria-label') : null) ||
             (sibling && sibling.textContent ? sibling.textContent.trim() : null) ||
             selectedRadio.value;
    }

    return null;
  }

  /**
   * Add or update stock indicator on PDP
   */
  function updatePDPStockIndicator() {
    const productId = getPDPProductId();
    const variantId = getSelectedColorVariant();
    const stockStatus = getStockStatus(productId, variantId);

    // Find existing indicator
    let indicator = document.querySelector('.pdp-stock-indicator');

    if (indicator) {
      // Update existing indicator
      updateStockIndicator(indicator, stockStatus);
    } else {
      // Create new indicator
      indicator = createStockIndicator(stockStatus, ['pdp-stock-indicator']);

      // Find insertion point - after color list's parent container
      const colorList = document.querySelector(CONFIG.SELECTORS.PDP_COLOR_LIST);
      if (colorList) {
        const colorSection = colorList.parentElement;
        if (colorSection) {
          colorSection.insertAdjacentElement('afterend', indicator);
        } else {
          colorList.insertAdjacentElement('afterend', indicator);
        }
      } else {
        // Fallback: insert after h1 title
        const title = document.querySelector(CONFIG.SELECTORS.PDP_TITLE);
        if (title) {
          title.insertAdjacentElement('afterend', indicator);
        }
      }
    }
  }

  /**
   * Set up color variant change listener on PDP
   */
  function setupPDPColorChangeListener() {
    const colorList = document.querySelector(CONFIG.SELECTORS.PDP_COLOR_LIST);
    if (!colorList) {
      return;
    }

    // Mark as having listener to avoid duplicate listeners
    if (colorList.dataset.stockListener) {
      return;
    }
    colorList.dataset.stockListener = 'true';

    // Listen for clicks on the color list
    colorList.addEventListener('click', () => {
      // Small delay to let the radio state update
      setTimeout(() => {
        updatePDPStockIndicator();
      }, 150);
    });

    // Also listen for change events on radio buttons
    const radios = colorList.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        setTimeout(() => {
          updatePDPStockIndicator();
        }, 150);
      });
    });
  }

  /**
   * Initialize PDP stock indicator
   */
  function initPDPStockIndicator() {
    if (!isPDPPage()) {
      return;
    }

    updatePDPStockIndicator();
    setupPDPColorChangeListener();
    console.log('[Stock Indicator] PDP indicator initialized');
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Main initialization function
   */
  function init() {
    console.log('[Stock Indicator] Initializing...', {
      pathname: window.location.pathname,
      isHomepage: isHomepage(),
      isPDP: isPDPPage(),
      locale: getCurrentLocale()
    });

    if (isHomepage()) {
      initHomepageStockIndicators();
    }

    if (isPDPPage()) {
      initPDPStockIndicator();
    }

    console.log('[Stock Indicator] Initialized successfully');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure page is fully rendered
    setTimeout(init, 500);
  }

  // Also run on dynamic content changes (for SPAs)
  let reinitTimeout = null;
  const observer = new MutationObserver((mutations) => {
    // Check if stock indicator was removed or if important elements were added
    const colorListExists = document.querySelector(CONFIG.SELECTORS.PDP_COLOR_LIST);
    const homepageCardsExist = document.querySelectorAll('main ul li a h3').length > 0;

    let shouldReinit = false;

    // If we're on PDP and indicator is missing but color list exists, reinit
    if (isPDPPage() && !document.querySelector('.pdp-stock-indicator') && colorListExists) {
      shouldReinit = true;
    }

    // If we're on homepage and indicators are missing but cards exist, reinit
    if (isHomepage() && homepageCardsExist && !document.querySelector('.homepage-product-card')) {
      shouldReinit = true;
    }

    // Also check for major DOM changes
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            var matches = node.matches || node.msMatchesSelector || node.webkitMatchesSelector;
            if (matches) {
              matches = matches.bind(node);
              if (
                matches('main') ||
                node.querySelector('main') ||
                matches('h1') ||
                matches('h3') ||
                matches('ul') ||
                node.querySelector('input[type="radio"]')
              ) {
                shouldReinit = true;
              }
            }
          }
        });
      }
    });

    if (shouldReinit) {
      // Debounce reinit calls
      clearTimeout(reinitTimeout);
      reinitTimeout = setTimeout(() => {
        if (isPDPPage()) {
          updatePDPStockIndicator();
          setupPDPColorChangeListener();
        }
        if (isHomepage()) {
          initHomepageStockIndicators();
        }
      }, 200);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // ============================================
  // DEMO/TEST UTILITIES
  // ============================================

  /**
   * Demo function to set up test stock data
   * Call this from console: iqosDemoStockData()
   */
  window.iqosDemoStockData = function() {
    // Set some demo stock statuses
    setStockStatus('iqos-iluma-i-one', CONFIG.STOCK_STATUS.IN_STOCK);
    setStockStatus('iqos-iluma-i-one-ir-2-terea-pakeliai', CONFIG.STOCK_STATUS.IN_STOCK);
    setStockStatus('iqos-iluma-i', CONFIG.STOCK_STATUS.LIMITED_STOCK);
    setStockStatus('iqos-iluma-i-ir-2-terea-pakeliai', CONFIG.STOCK_STATUS.LIMITED_STOCK);
    setStockStatus('iqos-iluma-i-prime', CONFIG.STOCK_STATUS.OUT_OF_STOCK);

    // Variant-specific statuses
    setStockStatus('iqos-iluma-i-prime', CONFIG.STOCK_STATUS.IN_STOCK, 'Breeze Blue');
    setStockStatus('iqos-iluma-i-prime', CONFIG.STOCK_STATUS.OUT_OF_STOCK, 'Midnight Black');
    setStockStatus('iqos-iluma-i-prime', CONFIG.STOCK_STATUS.LIMITED_STOCK, 'Garnet Red');

    console.log('[Stock Indicator] Demo data loaded. Refresh or call init() to see changes.');
    init();
  };

  /**
   * Clear all stock data
   * Call this from console: iqosClearStockData()
   */
  window.iqosClearStockData = function() {
    sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
    console.log('[Stock Indicator] Stock data cleared.');
    init();
  };

  /**
   * Manually reinit
   */
  window.iqosInit = init;

})();
