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
      rank: 1,
      title: 'A komanda ir kapibaros pabėgimas. Šeštas nuotykis',
      authors: 'Tomas Dirgėla',
      href: '/a-komanda-ir-kapibaros-pabegimas-sestas-nuotykis-1115073/',
      img: 'https://picfit.pegasas.lt/media/catalog/product/0/0/000000000001115073-4-5-6-5-45654c03cc0e24fbc8c291620e3bc59ffaa7c189_a_komanda_ir_kapibaros_pabegimas.jpg?op=resize&q=80&w=160'
    },
    {
      id: 2,
      rank: 2,
      title: 'Nemeilė',
      authors: 'Ilona Skujaitė',
      href: '/nemeile-1114716/',
      img: 'https://picfit.pegasas.lt/media/catalog/product/0/0/000000000001114716-5-3-c-6-53c652f8bed5f8c967bf1169fefcc6c828bda8bf_nemeile.jpg?op=resize&q=80&w=160'
    },
    {
      id: 3,
      rank: 3,
      title: 'Komisaras Letena 7. Pėdsakai miške',
      authors: '',
      href: '/komisaras-letena-7-pedsakai-miske-22086869/',
      img: 'https://picfit.pegasas.lt/media/catalog/product/0/0/000000000022086869-1-0-0-3-1003d2d9370165c4a96c66c86cd83bd0fd9a8083_komisaras_letena_pedsakai_miske.jpg?op=resize&q=80&w=160'
    },
    {
      id: 4,
      rank: 4,
      title: 'Žuviukas Niurzga',
      authors: 'Deborah Diesen',
      href: '/zuviukas-niurzga-1115275/',
      img: 'https://picfit.pegasas.lt/media/catalog/product/0/0/000000000001115275-9-5-e-c-95ec4c333766800196b980446b627464835832d8_zuviukas_niurzga.jpg?op=resize&q=80&w=160'
    },
    {
      id: 5,
      rank: 5,
      title: 'Nevykėlio dienoraštis 20. Pamirštas gimtadienis',
      authors: 'Jeff Kinney',
      href: '/nevykelio-dienorastis-20-pamirstas-gimtadienis-22095656/',
      img: 'https://picfit.pegasas.lt/media/catalog/product/0/0/000000000022095656-8-9-1-7-8917e830e6f3ab3a6293c40b007f0291293ff6e1_9786094834394_nevykelio_dienorastis_20_pamirstas_gimtadienis.jpg?op=resize&q=80&w=160'
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
          '<span class="peg-top5-rank"><span class="peg-top5-rank-hash">#</span>' + b.rank + '</span>' +
          '<span class="peg-top5-author">' + b.authors + '</span>' +
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
          '<div class="peg-top5-books">' + books.map(bookHtml).join('') + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ── SPA-aware link clicks ──
  function attachLinkHandler(strip) {
    strip.addEventListener('click', function (e) {
      var link = e.target.closest('.peg-top5-book');
      if (!link) return;
      e.preventDefault();
      var href = link.getAttribute('href');
      if (!href) return;
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
  }

  function fillStrip(books) {
    var strip = document.getElementById(STRIP_ID);
    if (!strip) return;
    strip.querySelector('.peg-top5-books').innerHTML = books.map(bookHtml).join('');
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
      inject(STATIC_BOOKS);
      // Attach carousel watcher once DOM is settled
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

  // ── SPA navigation ──
  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () {
      orig.apply(this, arguments);
      liveWatcherAttached = false;
      setTimeout(function () {
        if (isHomepage()) {
          if (!document.getElementById(STRIP_ID)) inject(STATIC_BOOKS);
          watchCarousel();
        } else {
          removeStrip();
        }
      }, 300);
    };
  });
  window.addEventListener('popstate', function () {
    liveWatcherAttached = false;
    setTimeout(function () {
      if (isHomepage()) {
        if (!document.getElementById(STRIP_ID)) inject(STATIC_BOOKS);
        watchCarousel();
      } else {
        removeStrip();
      }
    }, 300);
  });
})();