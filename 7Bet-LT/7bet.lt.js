(function () {
  'use strict';

  var CONFIG = {
    maxGamesBar: 5,
    titleRecentlyPlayed: 'Paskutiniai lošti',
    checkInterval: 500,
    maxAttempts: 60,
    barParentSelector: '.casino-page',
    barInsertBeforeSelector: '.live-casino-page__item',
  };

  var CONFIG_FALLBACK_GAMES = [
    {
      name: 'Big Bass Splash',
      url: '/slots-games/pragmatic-play-big-bass-splash/real',
      image:
        'https://1855256537.rsc.cdn77.org/images/games/provider-id-116/PPNBigBassSplash@2x.jpg',
    },
    {
      name: 'Book of Dead',
      url: '/slots-games/play-n-go-book-of-dead/real',
      image:
        'https://1855256537.rsc.cdn77.org/images/games/provider-id-3/PGBookOfDead@2x.jpg',
    },
    {
      name: 'Crazy Time',
      url: '/slots-games/amusnet-fruity-time/real',
      image:
        'https://1855256537.rsc.cdn77.org/images/games/provider-id-95/EGTFruityTime@2x.jpg',
    },
    {
      name: 'Gates of Olympus',
      url: '/slots-games/pragmatic-play-gates-of-olympus/real',
      image:
        'https://1855256537.rsc.cdn77.org/images/games/provider-id-116/PPNGatesofOlympus@2x.jpg',
    },
    {
      name: 'Shinning Crown',
      url: '/slots-games/amusnet-shining-crown/real',
      image:
        'https://1855256537.rsc.cdn77.org/images/games/provider-id-95/EGTShiningCrown@2x.jpg',
    },
  ];

  var isInitialized = false;
  var routeObserver = null;
  var bodyClassObserver = null;
  var cachedBarGames = null;
  var cachedBarElement = null;
  var barProtectionObserver = null;
  var isFetchingBar = false;

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[7bet]');
    console.log.apply(console, args);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // --- Frosmo Helpers ---

  function waitForFrosmo(callback, attempts) {
    attempts = attempts || 0;
    if (attempts >= CONFIG.maxAttempts) {
      log('Frosmo not available after max attempts');
      return;
    }
    if (
      typeof frosmo !== 'undefined' &&
      frosmo.easy &&
      frosmo.easy.strategies &&
      typeof frosmo.easy.strategies.fetch === 'function' &&
      frosmo.site &&
      typeof frosmo.site.recentProducts === 'function'
    ) {
      log('Frosmo ready (attempt ' + attempts + ')');
      callback();
    } else {
      if (attempts === 0) {
        log('Waiting for Frosmo...');
      }
      setTimeout(function () {
        waitForFrosmo(callback, attempts + 1);
      }, CONFIG.checkInterval);
    }
  }

  function getBrowserRecentIds(maxCount) {
    try {
      var recent = frosmo.site.recentProducts();
      if (Array.isArray(recent) && recent.length > 0) {
        return recent.slice(0, maxCount).map(function (item) {
          return typeof item === 'object' && item.id ? item.id : item;
        });
      }
    } catch (e) {}
    return [];
  }

  function fetchGames(maxCount) {
    var recentIds = getBrowserRecentIds(maxCount);
    if (recentIds.length === 0) {
      return Promise.resolve([]);
    }
    return frosmo.site.recommendations
      .getProductApiData(recentIds)
      .catch(function () {
        return [];
      })
      .then(function (games) {
        return games.slice(0, maxCount);
      });
  }

  // --- Inline Last Played Bar (always visible, variation) ---

  function createBarGameCard(product) {
    var name = product.name || 'Unknown Game';
    var image =
      (product.attributes && product.attributes.feedImage) ||
      (product.attributes && product.attributes.image) ||
      '';
    var url = (product.attributes && product.attributes.url) || '#';
    var thumbHtml = image
      ? '<img src="' +
        escapeHtml(image) +
        '" alt="' +
        escapeHtml(name) +
        '" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<div class="last-played-bar__thumb-placeholder"></div>';

    return (
      '<div class="last-played-bar__game">' +
      '<a href="' +
      escapeHtml(url) +
      '" class="last-played-bar__game-link">' +
      '<div class="last-played-bar__thumb">' +
      thumbHtml +
      '<div class="last-played-bar__overlay">' +
      '<span class="last-played-bar__play-btn">Lošti</span>' +
      '</div>' +
      '</div>' +
      '<span class="last-played-bar__name">' +
      escapeHtml(name) +
      '</span>' +
      '</a>' +
      '</div>'
    );
  }

  function createBar(games) {
    var cardsHtml = games.map(createBarGameCard).join('');
    return (
      '<div class="last-played-bar">' +
      '<div class="last-played-bar__inner">' +
      '<span class="last-played-bar__title">' +
      escapeHtml(CONFIG.titleRecentlyPlayed) +
      '</span>' +
      '<div class="last-played-bar__games">' +
      cardsHtml +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function removeBar() {
    if (barProtectionObserver) {
      barProtectionObserver.disconnect();
      barProtectionObserver = null;
    }
    var bar = document.querySelector('.last-played-bar');
    if (bar) bar.remove();
    cachedBarElement = null;
    cachedBarGames = null;
  }

  function startBarProtection() {
    if (barProtectionObserver) return;
    var parent = document.querySelector(CONFIG.barParentSelector);
    if (!parent) return;
    barProtectionObserver = new MutationObserver(function () {
      if (isLoggedOut()) return;
      if (document.querySelector('.last-played-bar')) return;
      if (!cachedBarElement) return;
      var insertBefore =
        parent.querySelector(CONFIG.barInsertBeforeSelector) ||
        document.querySelector(CONFIG.barInsertBeforeSelector);
      if (!insertBefore || insertBefore.parentNode !== parent) return;
      parent.insertBefore(cachedBarElement, insertBefore);
      log('barProtection: bar re-inserted (same element, no image reload)');
    });
    barProtectionObserver.observe(parent, { childList: true });
    log('Bar protection observer active');
  }

  function insertBar(games) {
    if (document.querySelector('.last-played-bar')) {
      log('insertBar: bar already exists');
      return false;
    }
    var parent = document.querySelector(CONFIG.barParentSelector);
    var insertBefore = document.querySelector(CONFIG.barInsertBeforeSelector);
    log(
      'insertBar: parent=' +
        (parent ? parent.className : 'NOT FOUND') +
        ', insertBefore=' +
        (insertBefore ? insertBefore.className : 'NOT FOUND'),
    );
    if (!parent || !insertBefore) {
      return false;
    }

    if (barProtectionObserver) {
      barProtectionObserver.disconnect();
      barProtectionObserver = null;
    }

    var temp = document.createElement('div');
    temp.innerHTML = createBar(games);
    var bar = temp.firstElementChild;
    parent.insertBefore(bar, insertBefore);
    cachedBarElement = bar;
    startBarProtection();
    function startGlow() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bar.classList.add('last-played-bar--animate');
        });
      });
    }
    if (document.readyState === 'complete') {
      requestAnimationFrame(function () {
        requestAnimationFrame(startGlow);
      });
    } else {
      window.addEventListener('load', startGlow, { once: true });
    }
    log('Last played bar inserted');
    return true;
  }

  function staticGames() {
    return CONFIG_FALLBACK_GAMES.map(function (g) {
      return { name: g.name, attributes: { url: g.url, feedImage: g.image } };
    });
  }

  function padWithStatic(games) {
    var needed = CONFIG.maxGamesBar - games.length;
    if (needed <= 0) {
      return games;
    }
    var usedUrls = {};
    games.forEach(function (g) {
      var url = (g.attributes && g.attributes.url) || '';
      if (url) usedUrls[url] = true;
    });
    var available = staticGames().filter(function (s) {
      return !usedUrls[(s.attributes && s.attributes.url) || ''];
    });
    return games.concat(available.slice(0, needed));
  }

  function isLoggedOut() {
    return document.body.classList.contains('is-logged-out');
  }

  function preloadImage(url) {
    return new Promise(function (resolve) {
      if (!url) {
        resolve(false);
        return;
      }
      var img = new Image();
      img.onload = function () {
        resolve(true);
      };
      img.onerror = function () {
        resolve(false);
      };
      img.src = url;
    });
  }

  function gamesKey(list) {
    return list
      .map(function (g) {
        return (g.attributes && g.attributes.url) || g.name || '';
      })
      .join('|');
  }

  function updateBarGamesInPlace(list) {
    var bar = cachedBarElement || document.querySelector('.last-played-bar');
    if (!bar || !document.contains(bar)) return false;
    if (cachedBarGames && gamesKey(list) === gamesKey(cachedBarGames)) return true;
    var gamesEl = bar.querySelector('.last-played-bar__games');
    if (!gamesEl) return false;
    gamesEl.innerHTML = list.map(createBarGameCard).join('');
    return true;
  }

  function fetchAndInsertBar() {
    log('fetchAndInsertBar called, isLoggedOut=' + isLoggedOut());
    if (isLoggedOut()) {
      return;
    }
    if (isFetchingBar) {
      return;
    }
    isFetchingBar = true;

    log('fetchAndInsertBar: fetching games...');
    fetchGames(CONFIG.maxGamesBar)
      .then(function (games) {
        var list = padWithStatic(games);
        var usedUrls = {};
        list.forEach(function (g) {
          var url = (g.attributes && g.attributes.url) || '';
          if (url) usedUrls[url] = true;
        });
        var unusedStatics = staticGames().filter(function (s) {
          return !usedUrls[(s.attributes && s.attributes.url) || ''];
        });
        return Promise.all(
          list.map(function (game, i) {
            var image =
              (game.attributes && game.attributes.feedImage) ||
              (game.attributes && game.attributes.image) ||
              '';
            return preloadImage(image).then(function (ok) {
              if (ok) {
                return game;
              }
              log(
                'fetchAndInsertBar: image failed for slot ' +
                  i +
                  ', replacing with unused static',
              );
              return unusedStatics.shift() || game;
            });
          }),
        );
      })
      .then(function (list) {
        isFetchingBar = false;
        if (isLoggedOut()) return;
        cachedBarGames = list;
        if (!updateBarGamesInPlace(list)) {
          insertBar(list);
        }
        log('fetchAndInsertBar: bar updated');
      })
      .catch(function (err) {
        isFetchingBar = false;
        if (isLoggedOut()) return;
        log('Bar: error fetching games', err);
        var fallback = cachedBarGames || staticGames();
        if (!cachedBarGames) cachedBarGames = fallback;
        if (!updateBarGamesInPlace(fallback)) {
          insertBar(fallback);
        }
      });
  }

  function setupBodyClassObserver() {
    if (bodyClassObserver) return;
    bodyClassObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'class') {
          var oldVal = mutations[i].oldValue || '';
          var hadLoggedOut = oldVal.indexOf('is-logged-out') !== -1;
          var hasLoggedOut = document.body.classList.contains('is-logged-out');
          log(
            'bodyClassObserver: oldVal had is-logged-out=' +
              hadLoggedOut +
              ', now isLoggedOut=' +
              hasLoggedOut,
          );
          if (hadLoggedOut && !hasLoggedOut) {
            log('bodyClassObserver: is-logged-out removed -> fetchAndInsertBar');
            fetchAndInsertBar();
          }
          if (!hadLoggedOut && hasLoggedOut) {
            log('bodyClassObserver: is-logged-out added -> removeBar');
            removeBar();
          }
        }
      }
    });
    bodyClassObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
    log('Body class observer active');
  }

  function setupRouteObserver() {
    if (routeObserver) {
      return;
    }
    routeObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          if (node.nodeType !== 1) {
            continue;
          }
          if (
            (node.classList &&
              node.classList.contains('live-casino-page__item')) ||
            (node.querySelector &&
              node.querySelector(CONFIG.barInsertBeforeSelector))
          ) {
            log(
              'routeObserver: casino page element detected, isLoggedOut=' +
                isLoggedOut(),
            );
            if (!document.querySelector('.last-played-bar')) {
              fetchAndInsertBar();
            }
            return;
          }
        }
      }
    });
    routeObserver.observe(document.body, { childList: true, subtree: true });
  }

  function initBar() {
    log('initBar called, isLoggedOut=' + isLoggedOut());
    setupRouteObserver();
    fetchAndInsertBar();
    waitForFrosmo(function () {
      log('initBar: Frosmo ready, calling fetchAndInsertBar');
      fetchAndInsertBar();
      // retry in case parent selectors weren't ready yet
      setTimeout(function () {
        fetchAndInsertBar();
      }, 600);
    });
  }

  // --- Start ---

  function start() {
    if (isInitialized) return;
    isInitialized = true;
    log('start: isLoggedOut=' + isLoggedOut());

    setupBodyClassObserver();
    initBar();
  }

  start();
})();