// /**
//  * 7bet.lt - Convert Global JS (Project Level)
//  * Shared utilities for Frosmo integration
//  */

// window._7bet = window._7bet || {};

// // Frosmo helper utilities
// window._7bet.frosmo = {

//   // Strategy IDs for per-visitor recommendations
//   strategies: {
//     recentlyPlayed: 'recently-played-by-visitor--no-affinity-',
//     mostViewed: 'most-viewed-by-visitor-no-affinity'
//   },

//   // Wait for Frosmo to be ready (strategies API)
//   waitForFrosmo: function(callback, options) {
//     options = options || {};
//     var maxAttempts = options.maxAttempts || 20;
//     var interval = options.interval || 500;
//     var attempts = 0;

//     function check() {
//       attempts++;

//       if (typeof frosmo !== 'undefined' &&
//           frosmo.easy &&
//           frosmo.easy.strategies &&
//           typeof frosmo.easy.strategies.fetch === 'function' &&
//           frosmo.site &&
//           typeof frosmo.site.recentProducts === 'function' &&
//           frosmo.site.recommendations &&
//           typeof frosmo.site.recommendations.getProductApiData === 'function') {
//         callback();
//         return;
//       }

//       if (attempts < maxAttempts) {
//         setTimeout(check, interval);
//       }
//     }

//     check();
//   },

//   // Fetch products from a Frosmo recommendation strategy
//   fetchStrategy: function(strategyId) {
//     return frosmo.easy.strategies.fetch(strategyId).then(function(result) {
//       return (result && result.data) ? result.data : [];
//     });
//   },

//   // Register Frosmo login with player ID (builds per-user history over time)
//   registerLogin: function() {
//     return fetch('/api/player')
//       .then(function(r) { return r.json(); })
//       .then(function(data) {
//         if (data && data.nickName) {
//           frosmo.easy.api.login(data.nickName);
//         }
//       })
//       .catch(function() {});
//   },

//   // Get recently viewed product IDs (browser-level, kept for backward compat)
//   getRecentlyViewedIds: function(limit) {
//     limit = limit || 4;
//     try {
//       var recentProducts = frosmo.site.recentProducts();
//       if (Array.isArray(recentProducts) && recentProducts.length > 0) {
//         return recentProducts.slice(0, limit).map(function(item) {
//           return (typeof item === 'object' && item.id) ? item.id : item;
//         });
//       }
//     } catch (e) {
//       console.log('7bet: Error getting recent products', e);
//     }
//     return [];
//   },

//   // Get top viewed / popular product IDs (browser-level, kept for backward compat)
//   getTopViewedIds: function(limit) {
//     limit = limit || 4;
//     try {
//       if (typeof frosmo.site.topViewedProducts === 'function') {
//         var topProducts = frosmo.site.topViewedProducts();
//         if (Array.isArray(topProducts) && topProducts.length > 0) {
//           return topProducts.slice(0, limit).map(function(item) {
//             return (typeof item === 'object' && item.id) ? item.id : item;
//           });
//         }
//       }
//     } catch (e) {
//       console.log('7bet: Error getting top viewed products', e);
//     }
//     return [];
//   },

//   // Get product details by IDs
//   getProductDetails: function(productIds) {
//     return frosmo.site.recommendations.getProductApiData(productIds);
//   }
// };

// // User state utilities
// window._7bet.user = {

//   // Check if user is logged in
//   isLoggedIn: function() {
//     var buttons = document.querySelectorAll('button');
//     for (var i = 0; i < buttons.length; i++) {
//       var text = buttons[i].textContent ? buttons[i].textContent.trim() : '';
//       if (text === 'Prisijungti' || text === 'Registruotis') {
//         return false;
//       }
//     }
//     return true;
//   }
// };

// // DOM utilities
// window._7bet.dom = {

//   // Wait for element
//   waitForElement: function(selector, callback, options) {
//     options = options || {};
//     var maxAttempts = options.maxAttempts || 20;
//     var interval = options.interval || 500;
//     var attempts = 0;

//     function check() {
//       attempts++;
//       var element = document.querySelector(selector);

//       if (element) {
//         callback(element);
//         return;
//       }

//       if (attempts < maxAttempts) {
//         setTimeout(check, interval);
//       }
//     }

//     check();
//   },

//   // Check if on homepage
//   isHomepage: function() {
//     return window.location.pathname === '/' || window.location.pathname === '';
//   }
// };

// // SPA navigation utilities
// window._7bet.spa = {
//   _listeners: [],
//   _lastPathname: window.location.pathname,
//   _initialized: false,

//   // Initialize SPA listeners (call once)
//   init: function() {
//     if (this._initialized) return;
//     this._initialized = true;

//     var self = this;

//     // Intercept pushState
//     var originalPushState = history.pushState;
//     history.pushState = function() {
//       originalPushState.apply(this, arguments);
//       self._checkNavigation();
//     };

//     // Intercept replaceState
//     var originalReplaceState = history.replaceState;
//     history.replaceState = function() {
//       originalReplaceState.apply(this, arguments);
//       self._checkNavigation();
//     };

//     // Listen for popstate
//     window.addEventListener('popstate', function() {
//       self._checkNavigation();
//     });

//     // Periodic check as backup
//     setInterval(function() {
//       self._checkNavigation();
//     }, 1000);
//   },

//   _checkNavigation: function() {
//     var currentPathname = window.location.pathname;
//     if (currentPathname !== this._lastPathname) {
//       var oldPath = this._lastPathname;
//       this._lastPathname = currentPathname;
//       this._notifyListeners(oldPath, currentPathname);
//     }
//   },

//   _notifyListeners: function(oldPath, newPath) {
//     for (var i = 0; i < this._listeners.length; i++) {
//       try {
//         this._listeners[i](oldPath, newPath);
//       } catch (e) {
//         console.log('7bet SPA listener error:', e);
//       }
//     }
//   },

//   // Register navigation callback
//   onNavigate: function(callback) {
//     this._listeners.push(callback);
//   }
// };

// // Initialize SPA listeners
// window._7bet.spa.init();

// console.log('7bet Convert Global JS loaded');
