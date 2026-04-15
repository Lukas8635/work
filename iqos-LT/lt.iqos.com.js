/**
 * IQOS LT Stock Indicator Script
 * Adds "In stock" / "Limited stock" / "Out of stock" indicators
 * to homepage product cards and PDP pages
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Detect current locale from URL path
   * @returns {string} Locale code ('lt' or 'en')
   */
  function detectLocale() {
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    var locale = pathParts[0] || 'lt';
    return (locale === 'en') ? 'en' : 'lt';
  }

  var currentLocale = detectLocale();

  const CONFIG = {
    // Stock status types
    STOCK_STATUS: {
      IN_STOCK: 'in-stock',
      LIMITED_STOCK: 'limited-stock',
      OUT_OF_STOCK: 'out-of-stock'
    },

    // Labels for each status by locale
    LABELS_BY_LOCALE: {
      'lt': {
        'in-stock': 'Turime',
        'limited-stock': 'Liko nedaug',
        'out-of-stock': 'Išparduota'
      },
      'en': {
        'in-stock': 'In stock',
        'limited-stock': 'Limited stock',
        'out-of-stock': 'Out of stock'
      }
    },

    // Get labels for current locale
    get LABELS() {
      return this.LABELS_BY_LOCALE[currentLocale] || this.LABELS_BY_LOCALE['lt'];
    },

    // ============================================
    // HARDCODED STOCK DATA - Edit this section to set stock status manually
    // ============================================
    // Format: 'product-slug': 'status' or 'product-slug_variant': 'status'
    // Product slug is the last part of the URL (e.g., 'iqos-iluma-i-prime')
    // Status can be: 'in-stock', 'limited-stock', 'out-of-stock'
    // For variants, use: 'product-slug_Color Name': 'status'
    HARDCODED_STOCK: {
      // Homepage products (by URL slug)
      'iqos-iluma-i-one': 'in-stock',
      'iqos-iluma-i-one-ir-2-terea-pakeliai': 'in-stock',
      'iqos-iluma-i': 'in-stock',
      'iqos-iluma-i-ir-2-terea-pakeliai': 'in-stock',
      'iqos-iluma-i-prime': 'in-stock',

      // Product variants (product-slug_color)
      // Example: 'iqos-iluma-i-prime_Midnight Black': 'out-of-stock',
      // Example: 'iqos-iluma-i-prime_Breeze Blue': 'in-stock',
      // Example: 'iqos-iluma-i-prime_Garnet Red': 'limited-stock',
    },

    // Session storage key for stock data (can override hardcoded via console)
    SESSION_STORAGE_KEY: 'iqos_stock_data',

    // Default stock status (used when no hardcoded or session data available)
    DEFAULT_STATUS: 'in-stock',

    // Selectors
    SELECTORS: {
      // Homepage product cards (supports both /parduotuve and /shop paths)
      HOMEPAGE_PRODUCT_CARDS: 'main ul li a[href*="/parduotuve"], main ul li a[href*="/shop"]',
      HOMEPAGE_PRODUCT_TITLE: 'h3',

      // PDP selectors
      PDP_TITLE: 'main h1',
      PDP_COLOR_LIST: 'ul:has(li[aria-label] input[type="radio"])',
      PDP_COLOR_RADIO: 'input[type="radio"]',
      PDP_SELECTED_COLOR: 'li[aria-label] input[type="radio"]:checked',
    }
  };

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
    var variantKey = variantId ? productId + '_' + variantId : null;

    // 1. First check HARDCODED_STOCK (highest priority)
    if (variantKey && CONFIG.HARDCODED_STOCK[variantKey]) {
      return CONFIG.HARDCODED_STOCK[variantKey];
    }
    if (CONFIG.HARDCODED_STOCK[productId]) {
      return CONFIG.HARDCODED_STOCK[productId];
    }

    // 2. Then check session storage (for dynamic overrides)
    var stockData = getStockDataFromStorage();
    if (variantKey && stockData[variantKey]) {
      return stockData[variantKey];
    }
    if (stockData[productId]) {
      return stockData[productId];
    }

    // 3. Return default status
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
    text.textContent = CONFIG.LABELS[status] || CONFIG.LABELS[CONFIG.DEFAULT_STATUS];

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
      textEl.textContent = CONFIG.LABELS[newStatus] || CONFIG.LABELS[CONFIG.DEFAULT_STATUS];
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
    const urlMatch = href.match(/\/([^\/]+)(?:\?|$)/);
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
    const productCards = document.querySelectorAll(CONFIG.SELECTORS.HOMEPAGE_PRODUCT_CARDS);

    productCards.forEach(card => {
      // Skip if already has stock indicator
      if (card.querySelector('.stock-indicator')) {
        return;
      }

      // Find the title element
      const titleEl = card.querySelector(CONFIG.SELECTORS.HOMEPAGE_PRODUCT_TITLE);
      if (!titleEl) {
        return;
      }

      // Get product ID and stock status
      const productId = getProductIdFromCard(card);
      const stockStatus = getStockStatus(productId);

      // Create and insert stock indicator after the title
      const indicator = createStockIndicator(stockStatus, ['homepage-product-card']);

      // Insert after the title's parent container or after title
      const titleParent = titleEl.parentElement;
      if (titleParent) {
        // Insert after the title
        titleEl.insertAdjacentElement('afterend', indicator);
      }
    });
  }

  // ============================================
  // PDP FUNCTIONALITY
  // ============================================

  /**
   * Check if current page is a PDP
   * @returns {boolean}
   */
  function isPDPPage() {
    var path = window.location.pathname;
    return (path.includes('/parduotuve/') || path.includes('/shop/')) &&
           document.querySelector(CONFIG.SELECTORS.PDP_TITLE) !== null;
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
      var closestLi = selectedRadio.closest('li');
      return (closestLi ? closestLi.getAttribute('aria-label') : null) ||
             selectedRadio.getAttribute('aria-label') ||
             selectedRadio.value;
    }

    return null;
  }

  /**
   * Add or update stock indicator on PDP
   */
  function updatePDPStockIndicator() {
    var productId = getPDPProductId();
    var variantId = getSelectedColorVariant();
    var stockStatus = getStockStatus(productId, variantId);

    // Find existing indicator
    var indicator = document.querySelector('.pdp-stock-indicator');

    if (indicator) {
      // Update existing indicator (no flicker - just update in place)
      updateStockIndicator(indicator, stockStatus);
    } else {
      // Create new indicator
      indicator = createStockIndicator(stockStatus, ['pdp-stock-indicator']);

      // Insert BEFORE the price container (outside cm-reload containers)
      // This ensures the indicator persists when color options are replaced
      var priceContainer = document.querySelector('.product-price');
      if (priceContainer) {
        priceContainer.insertAdjacentElement('beforebegin', indicator);
      } else {
        // Fallback: insert after low_stock container
        var lowStockContainer = document.querySelector('[id^="low_stock_"]');
        if (lowStockContainer) {
          lowStockContainer.insertAdjacentElement('afterend', indicator);
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
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Main initialization function
   */
  function init() {
    console.log('[Stock Indicator] Initializing...');

    // Check if we're on homepage or PDP
    var path = window.location.pathname;
    var isHomepage = path === '/lt' || path === '/lt/' ||
                     path === '/en' || path === '/en/' ||
                     path.endsWith('/lt') || path.endsWith('/en');

    if (isHomepage) {
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
  var reinitTimeout = null;
  var lastColorListId = null;

  var observer = new MutationObserver(function(mutations) {
    if (!isPDPPage()) return;

    var indicatorExists = document.querySelector('.pdp-stock-indicator');
    var colorList = document.querySelector(CONFIG.SELECTORS.PDP_COLOR_LIST);
    var currentColorListId = colorList ? colorList.parentElement.id : null;

    var shouldReinit = false;

    // If color list was replaced (different parent ID), need to re-attach listeners
    if (colorList && currentColorListId !== lastColorListId) {
      lastColorListId = currentColorListId;
      shouldReinit = true;
    }

    // If indicator is missing, create it
    if (!indicatorExists && colorList) {
      shouldReinit = true;
    }

    // Check if color options were updated (radio inputs added)
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length > 0) {
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var addedNode = mutation.addedNodes[j];
          if (addedNode.nodeType === 1 && addedNode.querySelector) {
            if (addedNode.querySelector('input[type="radio"]')) {
              shouldReinit = true;
            }
          }
        }
      }
    });

    if (shouldReinit) {
      // Immediate update - no delay to prevent flicker
      clearTimeout(reinitTimeout);
      reinitTimeout = setTimeout(function() {
        updatePDPStockIndicator();
        setupPDPColorChangeListener();
      }, 10);
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
    setStockStatus('iqos-iluma-i', CONFIG.STOCK_STATUS.LIMITED_STOCK);
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

})();
