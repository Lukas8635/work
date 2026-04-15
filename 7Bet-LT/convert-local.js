// /**
//  * 7bet.lt - Convert Local JS (Experience Level)
//  * Last Played Games Section with notification banner
//  * Data priority: per-visitor strategies -> browser-level tracking -> popular games.
//  *
//  * Requirements:
//  * - Global JS must be loaded first (convert-global.js)
//  * - CSS must be added separately (convert-styles.css)
//  */

// (function() {
//   'use strict';

//   // Configuration
//   var CONFIG = {
//     maxGames: 4,
//     sectionTitle: 'Paskutiniai lošti',
//     notificationText: 'Įmoka apdorojama. Netrukus ją įskaitysime',
//     insertAfterSelector: '.nav-block',
//     fallbackInsertSelector: '.home-page__content',
//     userCheckInterval: 2000
//   };

//   // State
//   var lastLoginState = null;
//   var isInitialized = false;

//   // --- HTML Escaping ---

//   function escapeHtml(str) {
//     var div = document.createElement('div');
//     div.appendChild(document.createTextNode(str));
//     return div.innerHTML;
//   }

//   // Get 4 games with fallback chain
//   function getGamesData() {
//     var frosmoHelper = window._7bet.frosmo;
//     var strategies = frosmoHelper.strategies;

//     // 1. Try per-visitor strategy: recently played
//     return frosmoHelper.fetchStrategy(strategies.recentlyPlayed).then(function(products) {
//       if (products.length >= CONFIG.maxGames) {
//         return products.slice(0, CONFIG.maxGames);
//       }

//       // 2. Fill with per-visitor strategy: most viewed
//       return frosmoHelper.fetchStrategy(strategies.mostViewed).then(function(mostViewed) {
//         var existingIds = products.map(function(p) { return p.id; });
//         var filtered = mostViewed.filter(function(p) {
//           return existingIds.indexOf(p.id) === -1;
//         });
//         var combined = products.concat(filtered).slice(0, CONFIG.maxGames);

//         if (combined.length >= CONFIG.maxGames) {
//           return combined;
//         }

//         // 3. Fill with browser-level recent products
//         var combinedIds = combined.map(function(p) { return p.id; });
//         var browserRecentIds = frosmoHelper.getRecentlyViewedIds(CONFIG.maxGames).filter(function(id) {
//           return combinedIds.indexOf(id) === -1;
//         }).slice(0, CONFIG.maxGames - combined.length);

//         // 4. Fill with browser-level popular products
//         var allIds = combinedIds.concat(browserRecentIds);
//         var browserPopularIds = frosmoHelper.getTopViewedIds(CONFIG.maxGames + 10).filter(function(id) {
//           return allIds.indexOf(id) === -1;
//         }).slice(0, CONFIG.maxGames - allIds.length);

//         var idsToFetch = browserRecentIds.concat(browserPopularIds);
//         if (idsToFetch.length === 0) {
//           return combined;
//         }

//         return frosmoHelper.getProductDetails(idsToFetch).then(function(extraProducts) {
//           return combined.concat(extraProducts).slice(0, CONFIG.maxGames);
//         });
//       });
//     });
//   }

//   // --- DOM: Build HTML ---

//   function createNotificationBar() {
//     return '<div class="last-played-notification">' +
//       '<div class="last-played-notification-icon">' +
//         '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">' +
//           '<circle cx="15" cy="15" r="14" stroke="white" stroke-width="2" fill="none"/>' +
//           '<path d="M9 15.5L13 19.5L21 11.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
//         '</svg>' +
//       '</div>' +
//       '<div class="last-played-notification-content">' +
//         '<span class="last-played-notification-text">' + CONFIG.notificationText + '</span>' +
//         '<button class="last-played-notification-close" aria-label="Uždaryti">' +
//           '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
//             '<path d="M1 1L13 13M13 1L1 13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>' +
//           '</svg>' +
//         '</button>' +
//       '</div>' +
//     '</div>';
//   }

//   function createGameCard(product) {
//     var name = product.name || 'Unknown Game';
//     var image = (product.attributes && product.attributes.image) ||
//                 (product.attributes && product.attributes.feedImage) || '';
//     var url = (product.attributes && product.attributes.url) || '#';

//     return '<div class="last-played-card">' +
//       '<a href="' + escapeHtml(url) + '" class="last-played-card-link">' +
//         '<div class="last-played-card-thumb">' +
//           '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(name) + '" loading="lazy">' +
//           '<div class="last-played-card-overlay">' +
//             '<span class="last-played-play-btn">Lošti</span>' +
//           '</div>' +
//         '</div>' +
//         '<span class="last-played-card-name">' + escapeHtml(name) + '</span>' +
//       '</a>' +
//     '</div>';
//   }

//   function createSection(products) {
//     var cardsHtml = products.map(createGameCard).join('');
//     var notificationHtml = createNotificationBar();

//     return '<div class="last-played-section">' +
//       notificationHtml +
//       '<div class="last-played-body">' +
//         '<div class="last-played-header">' +
//           '<span class="last-played-title">' + CONFIG.sectionTitle + '</span>' +
//         '</div>' +
//         '<div class="last-played-games">' +
//           cardsHtml +
//         '</div>' +
//       '</div>' +
//     '</div>';
//   }

//   // --- DOM: Insert / Remove ---

//   function removeSection() {
//     var section = document.querySelector('.last-played-section');
//     if (section) {
//       section.remove();
//       return true;
//     }
//     return false;
//   }

//   function bindCloseButton(section) {
//     var closeBtn = section.querySelector('.last-played-notification-close');
//     if (closeBtn) {
//       closeBtn.addEventListener('click', function() {
//         section.remove();
//       });
//     }
//   }

//   function insertSection(html) {
//     if (document.querySelector('.last-played-section')) {
//       return false;
//     }

//     var temp = document.createElement('div');
//     temp.innerHTML = html;
//     var section = temp.firstElementChild;

//     // Primary: insert after .nav-block
//     var navBlock = document.querySelector(CONFIG.insertAfterSelector);
//     if (navBlock && navBlock.parentElement) {
//       navBlock.parentElement.insertBefore(section, navBlock.nextSibling);
//       bindCloseButton(section);
//       return true;
//     }

//     // Fallback: insert at beginning of .home-page__content
//     var content = document.querySelector(CONFIG.fallbackInsertSelector);
//     if (content) {
//       content.insertBefore(section, content.firstChild);
//       bindCloseButton(section);
//       return true;
//     }

//     return false;
//   }

//   // --- Main initialization ---

//   function init() {
//     if (!window._7bet.dom.isHomepage()) {
//       return;
//     }

//     if (!window._7bet.user.isLoggedIn()) {
//       removeSection();
//       return;
//     }

//     // Register login with Frosmo, then fetch games
//     window._7bet.frosmo.registerLogin().then(function() {
//       return getGamesData();
//     }).then(function(products) {
//       if (products && products.length > 0) {
//         var sectionHtml = createSection(products);

//         window._7bet.dom.waitForElement(CONFIG.insertAfterSelector, function() {
//           insertSection(sectionHtml);
//         });
//       }
//     }).catch(function(err) {
//       console.log('7bet: Error fetching game data', err);
//     });
//   }

//   // --- Login state changes ---

//   function checkLoginStateChange() {
//     var currentLoginState = window._7bet.user.isLoggedIn();

//     if (lastLoginState !== null && currentLoginState !== lastLoginState) {
//       if (currentLoginState) {
//         setTimeout(function() {
//           window._7bet.frosmo.waitForFrosmo(init);
//         }, 500);
//       } else {
//         removeSection();
//       }
//     }

//     lastLoginState = currentLoginState;
//   }

//   // --- Navigation listener ---

//   function setupNavigationListener() {
//     window._7bet.spa.onNavigate(function(oldPath, newPath) {
//       if (newPath === '/' || newPath === '') {
//         setTimeout(function() {
//           window._7bet.frosmo.waitForFrosmo(init);
//         }, 500);
//       } else {
//         removeSection();
//       }
//     });

//     setInterval(checkLoginStateChange, CONFIG.userCheckInterval);
//   }

//   // --- Start ---

//   function start() {
//     if (isInitialized) return;
//     isInitialized = true;

//     lastLoginState = window._7bet.user.isLoggedIn();
//     setupNavigationListener();
//     window._7bet.frosmo.waitForFrosmo(init);
//   }

//   // Wait for global JS to be loaded
//   function waitForGlobalJS() {
//     if (window._7bet && window._7bet.frosmo && window._7bet.frosmo.fetchStrategy && window._7bet.user && window._7bet.dom) {
//       start();
//     } else {
//       setTimeout(waitForGlobalJS, 100);
//     }
//   }

//   waitForGlobalJS();

// })();
