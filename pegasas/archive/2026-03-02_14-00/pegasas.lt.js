// Free Shipping Progress Bar for Pegasas.lt
// Shows remaining amount needed for free shipping on PDP and Cart pages

(function() {
  'use strict';

  const FREE_SHIPPING_THRESHOLD = 30; // euros
  const CART_ID_KEY = 'M2_VENIA_BROWSER_PERSISTENCE__cartId';
  const SIGNIN_TOKEN_KEY = 'M2_VENIA_BROWSER_PERSISTENCE__signin_token';

  // SVG icons
  const TRUCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <g clip-path="url(#clip0_3379_1958)">
      <path d="M16 3H1V16H16V3Z" stroke="#5E0838" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 8H20L23 11V16H16V8Z" stroke="#5E0838" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5.5 21C6.88071 21 8 19.8807 8 18.5C8 17.1193 6.88071 16 5.5 16C4.11929 16 3 17.1193 3 18.5C3 19.8807 4.11929 21 5.5 21Z" stroke="#5E0838" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18.5 21C19.8807 21 21 19.8807 21 18.5C21 17.1193 19.8807 16 18.5 16C17.1193 16 16 17.1193 16 18.5C16 19.8807 17.1193 21 18.5 21Z" stroke="#5E0838" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <defs>
      <clipPath id="clip0_3379_1958">
        <rect width="24" height="24" fill="white"/>
      </clipPath>
    </defs>
  </svg>`;

  const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
    <mask id="mask0_3379_1941" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="13" height="13">
      <path d="M6.48984 12C7.2109 12.0009 7.92504 11.859 8.59121 11.5826C9.25738 11.3061 9.86247 10.9005 10.3717 10.389C10.8822 9.87887 11.2871 9.27267 11.563 8.60526C11.839 7.93786 11.9806 7.2224 11.9797 6.5C11.9806 5.7776 11.839 5.06214 11.563 4.39474C11.2871 3.72733 10.8822 3.12112 10.3717 2.61095C9.86247 2.0995 9.25738 1.69389 8.59121 1.41743C7.92504 1.14097 7.2109 0.999113 6.48984 1C5.76877 0.999113 5.05464 1.14097 4.38846 1.41743C3.72229 1.69389 3.11721 2.0995 2.60798 2.61095C2.09747 3.12112 1.69261 3.72733 1.41666 4.39474C1.14071 5.06214 0.999115 5.7776 1 6.5C0.999115 7.2224 1.14071 7.93786 1.41666 8.60526C1.69261 9.27267 2.09747 9.87887 2.60798 10.389C3.11721 10.9005 3.72229 11.3061 4.38846 11.5826C5.05464 11.859 5.76877 12.0009 6.48984 12Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>
      <path d="M4.01904 6.49985L5.66599 8.14985L8.95989 4.84985" stroke="black" stroke-linecap="round" stroke-linejoin="round"/>
    </mask>
    <g mask="url(#mask0_3379_1941)">
      <path d="M-0.0976562 -0.100098H13.0779V13.0999H-0.0976562V-0.100098Z" fill="#13AA31"/>
    </g>
  </svg>`;

  /**
   * Get cart ID from localStorage
   */
  function getCartId() {
    try {
      const cartData = localStorage.getItem(CART_ID_KEY);
      if (!cartData) return null;

      const parsed = JSON.parse(cartData);
      // The value is double-escaped JSON string
      const cartId = JSON.parse(parsed.value);
      return cartId;
    } catch (e) {
      console.error('[FreeShipping] Error getting cart ID:', e);
      return null;
    }
  }

  /**
   * Get signin token from localStorage (for logged-in users)
   */
  function getSigninToken() {
    try {
      const tokenData = localStorage.getItem(SIGNIN_TOKEN_KEY);
      if (!tokenData) return null;

      const parsed = JSON.parse(tokenData);
      const token = JSON.parse(parsed.value);
      return token;
    } catch (e) {
      return null;
    }
  }

  /**
   * Fetch cart details from GraphQL API
   * For logged-in users, uses customerCart query (no cart ID needed)
   * For guests, uses cart query with cart ID
   */
  async function fetchCartDetails(cartId) {
    const signinToken = getSigninToken();

    // Different queries for logged-in users vs guests
    const guestQuery = `
      query getCartDetails($cartId: String!) {
        cart(cart_id: $cartId) {
          id
          prices {
            grand_total {
              value
              currency
            }
            subtotal_including_tax {
              value
              currency
            }
          }
        }
      }
    `;

    const customerQuery = `
      query getCustomerCart {
        customerCart {
          id
          prices {
            grand_total {
              value
              currency
            }
            subtotal_including_tax {
              value
              currency
            }
          }
        }
      }
    `;

    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      let query, variables;

      if (signinToken) {
        // Logged-in user: use customerCart query
        headers['Authorization'] = `Bearer ${signinToken}`;
        query = customerQuery;
        variables = {};
      } else {
        // Guest: use cart query with cart ID
        if (!cartId) return null;
        query = guestQuery;
        variables = { cartId };
      }

      const response = await fetch('/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables })
      });

      const data = await response.json();

      // Return the appropriate cart data
      if (signinToken) {
        return data?.data?.customerCart || null;
      }
      return data?.data?.cart || null;
    } catch (e) {
      console.error('[FreeShipping] Error fetching cart:', e);
      return null;
    }
  }

  /**
   * Calculate free shipping progress from cart total
   */
  function calculateProgress(cartTotal) {
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
    const percentage = Math.max(2, Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100));
    const hasFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD;

    return {
      remaining: remaining.toFixed(2),
      percentage,
      hasFreeShipping,
      cartTotal: cartTotal.toFixed(2)
    };
  }

  /**
   * Create the free shipping widget HTML
   */
  function createWidget(progress) {
    const widget = document.createElement('div');
    widget.className = 'pegasas-free-shipping-widget';
    widget.id = 'pegasas-free-shipping-widget';

    const messageText = progress.hasFreeShipping
      ? `Jums priklauso <strong>NEMOKAMAS</strong> pristatymas!`
      : `Iki nemokamo pristatymo Jums trūksta tik <strong>${progress.remaining} €</strong>`;

    const progressBarColor = progress.hasFreeShipping ? '#13aa31' : '#13AA31';

    const checkIconHtml = progress.hasFreeShipping
      ? `<span class="pfs-check">${CHECK_ICON}</span>`
      : '';

    widget.innerHTML = `
      <div class="pfs-icon-wrapper">
        ${checkIconHtml}
        <span class="pfs-truck">${TRUCK_ICON}</span>
      </div>
      <div class="pfs-content">
        <p class="pfs-message">${messageText}</p>
        <div class="pfs-progress-wrapper">
          <div class="pfs-progress-bg">
            <div class="pfs-progress-bar" style="width: 0%; background-color: ${progressBarColor};" data-target-width="${progress.percentage}"></div>
          </div>
        </div>
        <p class="pfs-subtitle">Nemokamas pristatymas nuo ${FREE_SHIPPING_THRESHOLD} €</p>
      </div>
    `;

    return widget;
  }

  /**
   * Update existing widget with new progress data
   */
  function updateWidget(widget, progress) {
    const messageEl = widget.querySelector('.pfs-message');
    const progressBar = widget.querySelector('.pfs-progress-bar');
    const iconWrapper = widget.querySelector('.pfs-icon-wrapper');

    if (messageEl) {
      messageEl.innerHTML = progress.hasFreeShipping
        ? `Jums priklauso <strong>NEMOKAMAS</strong> pristatymas!`
        : `Iki nemokamo pristatymo Jums trūksta tik <strong>${progress.remaining} €</strong>`;
    }

    if (progressBar) {
      progressBar.style.width = `${progress.percentage}%`;
      progressBar.style.backgroundColor = progress.hasFreeShipping ? '#13aa31' : '#13AA31';
    }

    // Update check icon visibility
    if (iconWrapper) {
      let checkEl = iconWrapper.querySelector('.pfs-check');
      if (progress.hasFreeShipping && !checkEl) {
        // Add check icon
        checkEl = document.createElement('span');
        checkEl.className = 'pfs-check';
        checkEl.innerHTML = CHECK_ICON;
        iconWrapper.insertBefore(checkEl, iconWrapper.firstChild);
      } else if (!progress.hasFreeShipping && checkEl) {
        // Remove check icon
        checkEl.remove();
      }
    }
  }

  /**
   * Find insertion point on PDP - after the add to cart button
   */
  function findPDPInsertionPoint() {
    // Find the add to cart button
    const addToCartBtn = document.querySelector('button[class*="addToCart"]') ||
                         Array.from(document.querySelectorAll('button')).find(b =>
                           b.textContent && b.textContent.includes('krepšelį')
                         );

    if (addToCartBtn) {
      const buttonContainer = addToCartBtn.closest('div[class*="actions"]') ||
                             addToCartBtn.parentElement?.parentElement;
      if (buttonContainer && buttonContainer.parentElement) {
        return { parent: buttonContainer.parentElement, insertAfter: buttonContainer };
      }
    }

    // No fallback — only insert after the add-to-cart button to avoid appearing above the product
    return null;
  }

  /**
   * Find the best insertion point on Cart page
   */
  function findCartInsertionPoint() {
    // Insert as first child of CartWrapper-leftSide
    const leftSide = document.querySelector('[class*="CartWrapper-leftSide"]');
    if (leftSide) {
      return { parent: leftSide, insertFirst: true };
    }

    // Fallback selectors
    const selectors = [
      '[class*="cart-summary"]',
      '[class*="CartSummary"]',
      '[class*="order-summary"]',
      '[class*="checkout-cart-summary"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return { parent: el, insertAfter: null };
    }
    return null;
  }

  /**
   * Inject widget into the page
   */
  function injectWidget(progress) {
    // Check if widget already exists
    const existingWidget = document.getElementById('pegasas-free-shipping-widget');
    if (existingWidget) {
      updateWidget(existingWidget, progress);
      return;
    }

    const widget = createWidget(progress);

    // Determine page type and insertion point
    const isPDP = window.location.pathname.match(/\/[^\/]+\-\d+\/?$/);
    const isCart = window.location.pathname.includes('/cart');

    let insertionPoint;

    if (isPDP) {
      insertionPoint = findPDPInsertionPoint();
    } else if (isCart) {
      insertionPoint = findCartInsertionPoint();
    }

    if (!insertionPoint) {
      // No valid insertion point found — don't inject to avoid misplacement
      return;
    }

    if (insertionPoint.insertFirst) {
      insertionPoint.parent.insertBefore(widget, insertionPoint.parent.firstChild);
    } else if (insertionPoint.insertAfter) {
      insertionPoint.parent.insertBefore(widget, insertionPoint.insertAfter.nextSibling);
    } else {
      insertionPoint.parent.appendChild(widget);
    }

    // Fade in the widget and animate the progress bar after insertion
    requestAnimationFrame(() => {
      widget.classList.add('pfs-visible');
      const bar = widget.querySelector('.pfs-progress-bar');
      if (bar) {
        bar.style.width = bar.dataset.targetWidth + '%';
      }
    });
  }

  /**
   * Main initialization function
   * Both PDP and Cart pages use the same GraphQL API source for consistency
   */
  async function init() {
    const cartId = getCartId();
    const signinToken = getSigninToken();
    let cartTotal = 0;

    // Fetch cart data if user is logged in OR has a guest cart
    if (signinToken || cartId) {
      const cartData = await fetchCartDetails(cartId);
      if (cartData?.prices?.subtotal_including_tax?.value != null) {
        cartTotal = cartData.prices.subtotal_including_tax.value;
      }
    }

    const progress = calculateProgress(cartTotal);
    injectWidget(progress);
  }

  /**
   * Watch for cart changes using MutationObserver
   */
  function watchForCartChanges() {
    let updateTimeout = null;
    const isCart = window.location.pathname.includes('/cart');

    // Debounced update function - prevents multiple rapid calls
    function scheduleUpdate(delay = 100) {
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(init, delay);
    }

    // On cart page, watch the parent container for changes and re-fetch via GraphQL
    if (isCart) {
      const watchCartFreeShipping = () => {
        const container = document.querySelector('[class*="CartFreeShipping-cartFreeShipping"]');
        if (container) {
          const containerObserver = new MutationObserver(() => {
            scheduleUpdate(150);
          });
          containerObserver.observe(container, { characterData: true, childList: true, subtree: true });
          return true;
        }
        return false;
      };

      // Try to watch immediately, or wait for element to appear
      if (!watchCartFreeShipping()) {
        const waitObserver = new MutationObserver(() => {
          if (watchCartFreeShipping()) {
            waitObserver.disconnect();
          }
        });
        waitObserver.observe(document.body, { childList: true, subtree: true });
      }
    }

    // Watch for localStorage changes (for PDP page)
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, _value) {
      originalSetItem.apply(this, arguments);
      if (key === CART_ID_KEY || key.includes('cart') || key.includes('Cart')) {
        scheduleUpdate(150);
      }
    };

    // Watch for mini cart indicator changes (triggered when items added to cart)
    const watchMiniCart = () => {
      const miniCartIndicator = document.querySelector('[class*="cartTrigger"] [class*="counter"]') ||
                                document.querySelector('[class*="cart-trigger"] [class*="counter"]') ||
                                document.querySelector('[class*="minicart"] [class*="counter"]');
      if (miniCartIndicator) {
        const miniCartObserver = new MutationObserver(() => {
          scheduleUpdate(200);
        });
        miniCartObserver.observe(miniCartIndicator, { characterData: true, childList: true, subtree: true });
      }
    };
    watchMiniCart();
    // Also try after a delay in case mini cart loads later
    setTimeout(watchMiniCart, 2000);

    // Watch for DOM changes that might indicate cart update (fallback)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasCartUpdate = addedNodes.some(node =>
            node.nodeType === 1 && (
              node.classList?.contains('cart') ||
              node.querySelector?.('[class*="cart"]') ||
              node.textContent?.includes('krepšel')
            )
          );

          if (hasCartUpdate) {
            scheduleUpdate(150);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Wait for page to be ready
   */
  function waitForPage() {
    // Check if it's a PDP or Cart page
    const isPDP = window.location.pathname.match(/\/[^\/]+\-\d+\/?$/);
    const isCart = window.location.pathname.includes('/cart');

    if (!isPDP && !isCart) {
      return; // Don't run on other pages
    }

    // Wait for the correct container to be in the DOM
    let attempts = 0;
    const maxAttempts = 50;

    const checkReady = setInterval(() => {
      attempts++;

      let ready = false;
      if (isPDP) {
        // Wait for topFold, add-to-cart button AND product price to be rendered
        // Price ensures product data is fully loaded, preventing widget from appearing before content
        const topFold = document.querySelector('[class*="ProductFullDetail-topFold"]');
        const addToCartBtn = document.querySelector('button[class*="addToCart"]');
        const productPrice = document.querySelector('[class*="ProductFullDetail"] [class*="price"]') ||
                             document.querySelector('[class*="ProductFullDetail"] [class*="Price"]');
        ready = !!(topFold && addToCartBtn && productPrice);
      } else if (isCart) {
        ready = !!(document.querySelector('[class*="CartWrapper"]') || document.querySelector('main'));
      }

      if (isPDP && attempts >= maxAttempts) {
        // On PDP, don't inject if product hasn't loaded — abort instead of forcing
        clearInterval(checkReady);
        return;
      }

      if (ready || (!isPDP && attempts >= maxAttempts)) {
        clearInterval(checkReady);
        init();
        watchForCartChanges();
      }
    }, 100);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForPage);
  } else {
    waitForPage();
  }

  // Also listen for SPA navigation (Vue/Nuxt route changes)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Remove old widget on navigation
      const oldWidget = document.getElementById('pegasas-free-shipping-widget');
      if (oldWidget) oldWidget.remove();
      // Small delay to let the router start rendering, then waitForPage polls for the actual elements
      setTimeout(waitForPage, 100);
    }
  }).observe(document, { subtree: true, childList: true });

})();
