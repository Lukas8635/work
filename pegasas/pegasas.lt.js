(function () {
  'use strict';

  var STRIP_ID = 'peg-top5-strip';
  var CACHE_KEY = 'peg-top5-data';
  var CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ── Try to load fresh books from localStorage (set by Convert.com pre-script) ──
  function loadCachedBooks() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!Array.isArray(data.books) || !data.ts) return null;
      if (Date.now() - data.ts > CACHE_MAX_AGE_MS) return null;
      return data.books;
    } catch (e) {
      return null;
    }
  }

  // ── Static fallback data (current Savaitės TOP) ──
  // Used only when localStorage cache is absent or stale.
  var FALLBACK_BOOKS = [
    {
      id: 1,
      title: "Futbolo superžvaigždės. Messi",
      authors: "",
      href: "https://www.pegasas.lt/futbolo-superzvaigzdes-messi-1115169/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000001115169-3-8-6-d-386d027f305b8a76a4c82274c9e154034ba8b8ab_futbolo_superzvaigzdes2_messi.jpg?op=resize&q=80&w=188"
    },
    {
      id: 2,
      title: "Bet kuriuo kitu vardu",
      authors: "",
      href: "https://www.pegasas.lt/bet-kuriuo-kitu-vardu-1114782/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000001114782-b-0-d-6-b0d61d25c80b0420d66d69792f0e699ae084fa93_bet_kurio_kitu_vardu.jpg?op=resize&q=80&w=188"
    },
    {
      id: 3,
      title: "Lietuvos futbolo rinktinės marškinėliai, L",
      authors: "",
      href: "https://www.pegasas.lt/lietuvos-futbolo-rinktines-marskineliai-l-5786884/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000005786884-d-7-7-c-d77c3d3cb8f68d4982b2e1053892360a82c423f1_lietuvosrinktinesmarskineliai2024_202.jpeg?op=resize&q=80&w=188"
    },
    {
      id: 4,
      title: "Gertuvė Kuromi, 750 ml",
      authors: "",
      href: "https://www.pegasas.lt/gertuve-kuromi-750-ml-5785835/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000005785835-d-5-b-5-d5b551076958853fc6d2134e67f816f4ee1450c4_5907360015246__1_.png?op=resize&q=80&w=188"
    },
    {
      id: 5,
      title: "Placebo: RE:CREATED 2LP",
      authors: "",
      href: "https://www.pegasas.lt/placebo-re-created-2lp-5785762/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000005785762-6-8-3-4-683455cdd2a314f724b59f438b4fffc469138f25_505616718357.jpeg?op=resize&q=80&w=188"
    }
  ];

  var STATIC_BOOKS = loadCachedBooks() || FALLBACK_BOOKS;

  // ── Extract real image URL from React fiber ──
  function getReactImg(article) {
    var key = Object.keys(article).find(function (k) { return k.startsWith('__reactFiber'); });
    if (!key) return '';
    var fiber = article[key];
    var depth = 0;
    while (fiber && depth < 20) {
      var p = fiber.memoizedProps;
      if (p) {
        if (p.product && p.product.thumbnail && p.product.thumbnail.url) return p.product.thumbnail.url;
        if (p.thumbnail && p.thumbnail.url) return p.thumbnail.url;
      }
      fiber = fiber.return;
      depth++;
    }
    return '';
  }

  function toPickfitUrl(url) {
    if (!url) return '';
    return url.replace('https://www.pegasas.lt', 'https://picfit.pegasas.lt') + '?op=resize&q=80&w=72';
  }

  // ── Read books from loaded carousel panel ──
  function readLiveBooks(panel) {
    var slides = Array.from(panel.querySelectorAll('.slick-slide:not(.slick-cloned)')).slice(0, 5);
    if (!slides.length) return null;
    if (!slides.some(function (s) { return s.querySelector('article[data-title]'); })) return null;

    return slides.map(function (slide, i) {
      var article = slide.querySelector('article[data-title]');
      var link = slide.querySelector('a[href]:not([href="/customer/login"])');
      var rawImg = article ? getReactImg(article) : '';
      return {
        rank: i + 1,
        title: article ? (article.getAttribute('data-title') || '') : '',
        authors: article ? (article.getAttribute('data-authors') || '') : '',
        href: link ? (link.getAttribute('href') || '/') : '/',
        img: toPickfitUrl(rawImg)
      };
    });
  }

  // ── Build HTML ──
  var ICON = '<svg class="peg-top5-label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';

  function bookHtml(b) {
    return (
      '<a class="peg-top5-book" id="' + b.id + '" href="' + b.href + '">' +
        '<img class="peg-top5-img" src="' + b.img + '" alt="' + b.title + '">' +
        '<div class="peg-top5-info">' +
          (b.authors ? '<span class="peg-top5-author">' + b.authors + '</span>' : '') +
          '<span class="peg-top5-title">' + b.title + '</span>' +
        '</div>' +
      '</a>'
    );
  }

  function buildStrip(books) {
    return (
      '<div id="' + STRIP_ID + '">' +
        '<div class="peg-top5-inner">' +
          '<div class="peg-top5-label">' +
            '<div class="peg-top5-label-row">' +
              ICON +
              '<span class="peg-top5-label-top">TOP 5</span>' +
            '</div>' +
            '<span class="peg-top5-label-bottom">Perkamiausios</span>' +
          '</div>' +
          '<div class="peg-top5-books-wrap">' +
            '<div class="peg-top5-books">' + books.map(bookHtml).join('') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Scroll fade: edge gradients on mobile horizontal scroll ──
  function updateScrollFade(scroller) {
    var inner = scroller.parentNode && scroller.parentNode.parentNode;
    if (!inner) return;
    var atStart = scroller.scrollLeft <= 0;
    var atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
    inner.classList.toggle('peg-top5-at-start', atStart);
    inner.classList.toggle('peg-top5-at-end', atEnd);
  }

  function setupScrollFade() {
    var scroller = document.querySelector('#' + STRIP_ID + ' .peg-top5-books');
    if (!scroller || scroller._fadeAttached) return;
    scroller._fadeAttached = true;
    scroller.addEventListener('scroll', function () { updateScrollFade(scroller); }, { passive: true });
    updateScrollFade(scroller);
  }

  // ── SPA-aware link clicks ──
  function attachLinkHandler(strip) {
    strip.addEventListener('click', function (e) {
      var link = e.target.closest('.peg-top5-book');
      if (!link) return;
      e.preventDefault();
      var href = link.getAttribute('href');
      if (!href) return;
      removeStrip();
      history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });
  }

  // ── Inject strip ──
  function inject(books) {
    if (document.getElementById(STRIP_ID)) return;
    var header = document.querySelector('header');
    if (!header) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = buildStrip(books);
    var strip = tmp.firstElementChild;
    header.insertAdjacentElement('afterend', strip);
    attachLinkHandler(strip);
    setupScrollFade();
  }

  function fillStrip(books) {
    var strip = document.getElementById(STRIP_ID);
    if (!strip) return;
    strip.querySelector('.peg-top5-books').innerHTML = books.map(bookHtml).join('');
    var scroller = strip.querySelector('.peg-top5-books');
    if (scroller) updateScrollFade(scroller);
  }

  // ── Watch carousel with IntersectionObserver; update if data changed ──
  var liveWatcherAttached = false;

  function watchCarousel() {
    if (liveWatcherAttached) return;
    var tab = Array.from(document.querySelectorAll('[role="tab"]')).find(function (t) {
      return t.textContent.trim() === 'Savaitės TOP';
    });
    if (!tab) return;
    var panel = document.getElementById(tab.getAttribute('aria-controls'));
    if (!panel) return;

    liveWatcherAttached = true;

    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();

      // Panel is now in viewport — wait briefly for React to render articles
      setTimeout(function () {
        var live = readLiveBooks(panel);
        if (!live) return;

        // Compare hrefs with current strip — update only if different
        var strip = document.getElementById(STRIP_ID);
        if (!strip) return;
        var currentHrefs = Array.from(strip.querySelectorAll('.peg-top5-book')).map(function (a) {
          return a.getAttribute('href');
        }).join(',');
        var liveHrefs = live.map(function (b) { return b.href; }).join(',');

        if (currentHrefs !== liveHrefs) {
          fillStrip(live);
        }
      }, 800);
    }, { threshold: 0.1 });

    io.observe(panel);
  }

  function isHomepage() {
    return window.location.pathname === '/';
  }

  function removeStrip() {
    var strip = document.getElementById(STRIP_ID);
    if (strip) strip.remove();
  }

  // ── Start ──
  function start() {
    var target = document.body || document.documentElement;

    function onReady() {
      if (!isHomepage()) return;
      inject(loadCachedBooks() || STATIC_BOOKS);
      setTimeout(watchCarousel, 500);
    }

    if (document.querySelector('header')) {
      onReady();
    } else {
      var obs = new MutationObserver(function () {
        if (document.querySelector('header')) {
          obs.disconnect();
          onReady();
        }
      });
      obs.observe(target, { childList: true, subtree: true });
    }
  }

  start();

  // ── Watch localStorage for external writes (e.g. Convert.com pre-script) ──
  (function () {
    var _origSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      _origSet(key, value);
      if (key !== CACHE_KEY) return;
      try {
        var data = JSON.parse(value);
        if (!Array.isArray(data.books) || data.books.length < 5) return;
        if (document.getElementById(STRIP_ID)) {
          fillStrip(data.books);
        } else {
          STATIC_BOOKS = data.books;
        }
      } catch (e) {}
    };
  }());

  // ── Background refresh from GitHub (seeds localStorage for next visit) ──
  (function () {
    var CACHE_MAX_AGE = 20 * 60 * 60 * 1000;
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && c.ts && (Date.now() - c.ts) < CACHE_MAX_AGE) {
        return;
      }
    } catch (e) {}

    fetch('https://raw.githubusercontent.com/Lukas8635/work/main/pegasas/top5.json')
      .then(function (r) { return r.json(); })
      .then(function (books) {
        if (!Array.isArray(books) || books.length < 5) return;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), books: books }));
        fillStrip(books);
      })
      .catch(function (e) { console.log('[peg-top5] fetch error:', e.message); });
  }());

  // ── SPA navigation ──
  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () {
      orig.apply(this, arguments);
      liveWatcherAttached = false;
      if (!isHomepage()) {
        removeStrip();
      } else {
        if (!document.getElementById(STRIP_ID)) inject(STATIC_BOOKS);
        watchCarousel();
      }
    };
  });
  window.addEventListener('popstate', function () {
    liveWatcherAttached = false;
    if (!isHomepage()) {
      removeStrip();
    } else {
      setTimeout(function () {
        if (!document.getElementById(STRIP_ID)) inject(STATIC_BOOKS);
        watchCarousel();
      }, 300);
    }
  });
})();