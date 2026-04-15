/**
 * IQOS LV Stock Indicator Script
 * Adds "In stock" / "Limited stock" / "Out of stock" indicators
 * to homepage product cards and PDP pages
 * Supports Latvian and English locales
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
        'in-stock': 'Ir noliktavā',
        'limited-stock': 'Ierobežots daudzums',
        'out-of-stock': 'Nav noliktavā'
      },
      en: {
        'in-stock': 'In stock',
        'limited-stock': 'Limited stock',
        'out-of-stock': 'Out of stock'
      }
    },

    // Session storage key for product data (from IQOS site)
    SESSION_STORAGE_KEY: 'products',

    // Default stock status (used when no data available)
    DEFAULT_STATUS: 'in-stock',

    // Maximum wait time for session storage data (ms)
    MAX_WAIT_FOR_DATA: 5000,

    // Interval to check for session storage data (ms)
    CHECK_INTERVAL: 100,

    // Map session storage stock values to our status values
    STOCK_VALUE_MAP: {
      'in_stock': 'in-stock',
      'inStock': 'in-stock',
      'limited_stock': 'limited-stock',
      'limitedStock': 'limited-stock',
      'low_stock': 'limited-stock',
      'lowStock': 'limited-stock',
      'out_of_stock': 'out-of-stock',
      'outOfStock': 'out-of-stock'
    },

    // Selectors
    SELECTORS: {
      // Homepage product cards - look for links inside main content
      HOMEPAGE_PRODUCT_CARDS: 'main a[href*="/produktu-katalogs/"]',
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
    if (path.includes('/en/') || path.startsWith('/en')) {
      return 'en';
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
   * Get products array from session storage
   * @returns {Array} Array of product objects
   */
  function getProductsFromStorage() {
    try {
      const data = sessionStorage.getItem(CONFIG.SESSION_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('[Stock Indicator] Error reading session storage:', e);
      return [];
    }
  }

  /**
   * Check if session storage has product data
   * @returns {boolean}
   */
  function hasProductData() {
    const products = getProductsFromStorage();
    return products.length > 0;
  }

  /**
   * Wait for session storage to have product data
   * @returns {Promise<boolean>} Resolves to true if data available, false if timeout
   */
  function waitForProductData() {
    return new Promise((resolve) => {
      // If data already exists, resolve immediately
      if (hasProductData()) {
        resolve(true);
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (hasProductData()) {
          clearInterval(checkInterval);
          console.log('[Stock Indicator] Session storage data available');
          resolve(true);
        } else if (Date.now() - startTime > CONFIG.MAX_WAIT_FOR_DATA) {
          clearInterval(checkInterval);
          console.log('[Stock Indicator] Timeout waiting for session storage data');
          resolve(false);
        }
      }, CONFIG.CHECK_INTERVAL);
    });
  }

  /**
   * Normalize stock value from session storage to our status format
   * @param {string} stockValue - Stock value from session storage
   * @returns {string} Normalized stock status
   */
  function normalizeStockValue(stockValue) {
    if (!stockValue) {
      return CONFIG.DEFAULT_STATUS;
    }
    return CONFIG.STOCK_VALUE_MAP[stockValue] || CONFIG.DEFAULT_STATUS;
  }

  /**
   * Get stock status for a product
   * @param {string} productId - Product identifier (e.g., productCode, URL slug, or product name)
   * @param {string} [variantId] - Optional variant identifier (e.g., variantCode or variantName)
   * @returns {string} Stock status from CONFIG.STOCK_STATUS
   */
  function getStockStatus(productId, variantId = null) {
    const products = getProductsFromStorage();

    if (!products.length) {
      console.log('[Stock Indicator] No products in storage');
      return CONFIG.DEFAULT_STATUS;
    }

    // Normalize productId for comparison (lowercase, handle URL slugs)
    const normalizedProductId = productId?.toLowerCase().replace(/-/g, '');
    const normalizedVariantId = variantId?.toLowerCase().trim();

    console.log('[Stock Indicator] Looking for:', { productId, variantId, normalizedProductId, normalizedVariantId });

    // First pass: try to find EXACT productCode match with variant
    if (normalizedVariantId) {
      for (const product of products) {
        const productCode = product.productCode?.toLowerCase().replace(/-/g, '');
        const variantName = product.variantName?.toLowerCase().trim();

        // EXACT productCode match only
        if (productCode === normalizedProductId) {
          // Check if variant matches (variant name contains the color name)
          if (variantName?.includes(normalizedVariantId)) {
            console.log('[Stock Indicator] Found exact product + variant match:', product);
            return normalizeStockValue(product.stock);
          }
        }
      }
    }

    // Second pass: exact productCode match without variant
    for (const product of products) {
      const productCode = product.productCode?.toLowerCase().replace(/-/g, '');

      if (productCode === normalizedProductId) {
        console.log('[Stock Indicator] Found exact productCode match:', product);
        return normalizeStockValue(product.stock);
      }
    }

    // Third pass: try partial matching (productId contains productCode or vice versa)
    // But prefer longer/more specific matches
    let bestMatch = null;
    let bestMatchLength = 0;

    for (const product of products) {
      const productCode = product.productCode?.toLowerCase().replace(/-/g, '');
      const variantName = product.variantName?.toLowerCase().trim();

      // Check if this product could match
      const isPartialMatch = productCode?.includes(normalizedProductId) ||
                             normalizedProductId?.includes(productCode);

      if (isPartialMatch && productCode) {
        // If we have a variantId, check if it matches too
        if (normalizedVariantId && variantName?.includes(normalizedVariantId)) {
          // Prefer matches with longer productCode (more specific)
          if (productCode.length > bestMatchLength) {
            bestMatch = product;
            bestMatchLength = productCode.length;
          }
        } else if (!normalizedVariantId && productCode.length > bestMatchLength) {
          bestMatch = product;
          bestMatchLength = productCode.length;
        }
      }
    }

    if (bestMatch) {
      console.log('[Stock Indicator] Found best partial match:', bestMatch);
      return normalizeStockValue(bestMatch.stock);
    }

    console.log('[Stock Indicator] No match found, using default');
    return CONFIG.DEFAULT_STATUS;
  }

  /**
   * Set stock status for a product (for testing/demo purposes)
   * Note: This modifies the site's products array in session storage
   * @param {string} productCode - Product code to update
   * @param {string} stockValue - Stock value (in_stock, out_of_stock, limited_stock)
   * @param {string} [variantCode] - Optional variant code to update specific variant
   */
  function setStockStatus(productCode, stockValue, variantCode = null) {
    const products = getProductsFromStorage();

    let updated = false;
    for (const product of products) {
      if (product.productCode === productCode) {
        if (variantCode) {
          if (product.variantCode === variantCode) {
            product.stock = stockValue;
            updated = true;
          }
        } else {
          product.stock = stockValue;
          updated = true;
        }
      }
    }

    if (updated) {
      try {
        sessionStorage.setItem(CONFIG.SESSION_STORAGE_KEY, JSON.stringify(products));
        console.log(`[Stock Indicator] Updated stock for ${productCode}${variantCode ? ` (${variantCode})` : ''} to ${stockValue}`);
      } catch (e) {
        console.warn('[Stock Indicator] Error writing to session storage:', e);
      }
    } else {
      console.warn(`[Stock Indicator] Product not found: ${productCode}${variantCode ? ` (${variantCode})` : ''}`);
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
    // Don't create indicators if no product data available yet
    if (!hasProductData()) {
      console.log('[Stock Indicator] No product data yet, skipping homepage indicators');
      return;
    }

    // Find all product links in main content
    const productCards = document.querySelectorAll('main a[href*="/produktu-katalogs/"]');

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
        const text = el.textContent?.trim();
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
    // Support Latvian (/produktu-katalogs/), English (/shop/, /product-catalog/)
    return (path.includes('/produktu-katalogs/') || path.includes('/shop/') || path.includes('/product-catalog/')) &&
           document.querySelector(CONFIG.SELECTORS.PDP_TITLE) !== null;
  }

  /**
   * Check if current page is homepage
   * @returns {boolean}
   */
  function isHomepage() {
    const path = window.location.pathname;
    // Match /lv, /lv/, /en, /en/, or just /
    return path === '/' ||
           path === '/lv' ||
           path === '/lv/' ||
           path === '/en' ||
           path === '/en/' ||
           path.match(/^\/(lv|en)\/?$/);
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
    const colorList = document.querySelector(CONFIG.SELECTORS.PDP_COLOR_LIST);

    if (colorList) {
      // Method 1: Look for the color name text that appears after the color swatches
      // It's usually a sibling element after the fieldset/group
      let sibling = colorList.nextElementSibling;
      while (sibling) {
        const text = sibling.textContent?.trim();
        if (text && text.length > 2 && text.length < 50 &&
            !text.includes('€') && !text.includes('$') && !text.includes('noliktavā')) {
          console.log('[Stock Indicator] Found color name after swatches:', text);
          return text;
        }
        sibling = sibling.nextElementSibling;
      }

      // Method 2: Look in parent container for color name
      const parent = colorList.parentElement;
      if (parent) {
        // The color name might be a direct child text node or simple element
        for (const child of parent.children) {
          if (child === colorList || child.classList.contains('stock-indicator')) continue;
          const text = child.textContent?.trim();
          if (text && text.length > 2 && text.length < 50 &&
              !text.includes('€') && !text.includes('noliktavā') &&
              !child.querySelector('input')) {
            console.log('[Stock Indicator] Found color name in parent:', text);
            return text;
          }
        }
      }
    }

    // Method 3: Try radio button attributes
    const selectedRadio = document.querySelector(CONFIG.SELECTORS.PDP_SELECTED_COLOR);
    if (selectedRadio) {
      const ariaLabel = selectedRadio.getAttribute('aria-label');
      const radioValue = selectedRadio.value;
      const result = ariaLabel || radioValue;
      console.log('[Stock Indicator] getSelectedColorVariant from radio:', result);
      return result;
    }

    console.log('[Stock Indicator] No selected color found');
    return null;
  }

  /**
   * Add or update stock indicator on PDP
   */
  function updatePDPStockIndicator() {
    // Don't create indicator if no product data available yet
    if (!hasProductData()) {
      console.log('[Stock Indicator] No product data yet, skipping PDP indicator update');
      return;
    }

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
   * Uses MutationObserver to detect when the color name text changes
   */
  function setupPDPColorChangeListener() {
    const colorList = document.querySelector(CONFIG.SELECTORS.PDP_COLOR_LIST);
    if (!colorList) {
      console.log('[Stock Indicator] Color list not found for listener setup');
      return;
    }

    // Find the color name text element (sibling after color list)
    let colorNameElement = colorList.nextElementSibling;

    // Also try parent's children
    if (!colorNameElement || colorNameElement.querySelector('input')) {
      const parent = colorList.parentElement;
      if (parent) {
        for (const child of parent.children) {
          if (child !== colorList &&
              !child.querySelector('input') &&
              !child.classList.contains('stock-indicator') &&
              child.textContent?.trim().length > 0 &&
              child.textContent?.trim().length < 50) {
            colorNameElement = child;
            break;
          }
        }
      }
    }

    if (colorNameElement) {
      console.log('[Stock Indicator] Watching color name element:', colorNameElement.textContent);

      // Watch for text changes in the color name element
      const colorObserver = new MutationObserver((mutations) => {
        console.log('[Stock Indicator] Color name changed, updating...');
        setTimeout(() => {
          updatePDPStockIndicator();
        }, 100);
      });

      colorObserver.observe(colorNameElement, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    // Also use event delegation on document for color clicks
    if (!document.body.dataset.stockColorListener) {
      document.body.dataset.stockColorListener = 'true';

      document.body.addEventListener('click', (e) => {
        // Check if click was on or inside a color option
        const colorOption = e.target.closest('[role="group"] > div, fieldset > div');
        if (colorOption && colorOption.querySelector('input[type="radio"]')) {
          console.log('[Stock Indicator] Color option clicked via delegation');
          setTimeout(() => {
            updatePDPStockIndicator();
          }, 300);
        }
      }, true);
    }
  }

  /**
   * Initialize PDP stock indicator
   */
  function initPDPStockIndicator() {
    if (!isPDPPage()) {
      return;
    }

    const colorList = document.querySelector(CONFIG.SELECTORS.PDP_COLOR_LIST);
    console.log('[Stock Indicator] PDP init - color list found:', !!colorList);

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
  async function init() {
    console.log('[Stock Indicator] Initializing...', {
      pathname: window.location.pathname,
      isHomepage: isHomepage(),
      isPDP: isPDPPage(),
      locale: getCurrentLocale()
    });

    // Wait for session storage data before showing any indicators
    const hasData = await waitForProductData();

    if (!hasData) {
      console.log('[Stock Indicator] No product data available, skipping indicator creation');
      return;
    }

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
          if (node.nodeType === 1 && (
            node.matches?.('main') ||
            node.querySelector?.('main') ||
            node.matches?.('h1') ||
            node.matches?.('h3') ||
            node.matches?.('ul') ||
            node.querySelector?.('input[type="radio"]')
          )) {
            shouldReinit = true;
          }
        });
      }
    });

    if (shouldReinit) {
      // Debounce reinit calls
      clearTimeout(reinitTimeout);
      reinitTimeout = setTimeout(async () => {
        // Wait for data before reinit
        if (!hasProductData()) {
          await waitForProductData();
        }
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
   * List all products in session storage with their stock status
   * Call this from console: iqosListProducts()
   */
  window.iqosListProducts = function() {
    const products = getProductsFromStorage();
    console.log('[Stock Indicator] Products in session storage:');
    console.table(products.map(p => ({
      productCode: p.productCode,
      productName: p.productName,
      variantCode: p.variantCode,
      variantName: p.variantName,
      stock: p.stock
    })));
    return products;
  };

  /**
   * Update stock status for testing
   * Call this from console: iqosSetStock('productCode', 'out_of_stock', 'variantCode')
   */
  window.iqosSetStock = function(productCode, stockValue, variantCode = null) {
    setStockStatus(productCode, stockValue, variantCode);
    init();
  };

  /**
   * Manually reinit
   */
  window.iqosInit = init;

})();
