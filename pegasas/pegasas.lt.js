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
      title: "Auksinė Donaldo kolekcija",
      authors: "Nėra Autoriaus",
      href: "https://www.pegasas.lt/auksine-donaldo-kolekcija-22104242/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000022104242-5-2-1-6-521607e4bc76e829d2c71e544c3cc65db607b65f_9786090510506_auksin___donaldo_kolekcija.jpg?op=resize&q=80&w=188"
    },
    {
      id: 2,
      title: "Stalo žaidimas TELELOTO",
      authors: "",
      href: "https://www.pegasas.lt/stalo-zaidimas-teleloto-5781987/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000005781987-3-0-c-2-30c274e4ca7ea7db4f891f02a13f3fa7041eb590_4779054890696_1_.png?op=resize&q=80&w=188"
    },
    {
      id: 3,
      title: "Termo gertuvė su šiaudeliu BURGA Favorite Bikini, 1200 ml",
      authors: "",
      href: "https://www.pegasas.lt/termo-gertuve-su-siaudeliu-burga-favorite-bikini-1200-ml-5786008/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000005786008-3-a-6-b-3a6b6b06e587bb0c17de685965700184ed63110b_4772241530122_1.png?op=resize&q=80&w=188"
    },
    {
      id: 4,
      title: "Futbolo sirgalių marškinėliai, S, poliesteris",
      authors: "",
      href: "https://www.pegasas.lt/futbolo-sirgaliu-marskineliai-s-poliesteris-5787377/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000005787377-2-f-a-1-2fa1c0426a53451c0953db4cb2fca3e81ab91549_poliesteris.jpg?op=resize&q=80&w=188"
    },
    {
      id: 5,
      title: "Madonna: CONFESSIONS II CD",
      authors: "Madonna Madonna",
      href: "https://www.pegasas.lt/madonna-confessions-ii-cd-5785707/",
      img: "https://picfit.pegasas.lt/media/catalog/product/0/0/000000000005785707-9-1-8-2-9182b20c42a93817fae4b547a483ccf9af7278cd_93624821304_1_.jpg?op=resize&q=80&w=188"
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