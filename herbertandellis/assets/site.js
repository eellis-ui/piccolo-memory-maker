/* HERBERT & ELLIS — shared behaviour: nav, giant word, phone carousel, reveals, sticky button */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js'); root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* Nav: hairline once scrolled, highlight the section in view */
  var nav = $('.nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var spy = $$('.nav__links a[href^="#"]');
  if (spy.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) spy.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spy.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) sio.observe(t); });
  }

  /* Giant word: letters rise in one after another on load */
  function fillWord(line, text, base) {
    line.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement('span');
      s.className = 'giant__ch'; s.textContent = text[i] === ' ' ? '\u00A0' : text[i];
      s.style.setProperty('--i', i + (base || 0));
      line.appendChild(s);
    }
  }
  $$('.giant__line').forEach(function (line, li) { line.setAttribute('aria-hidden', 'true'); fillWord(line, line.textContent, li * 7); });

  /* Keep a swapping word on one line: shrink it only if it would run wider than its space */
  function fit(line) {
    line.style.fontSize = '';
    var cw = line.clientWidth, sw = line.scrollWidth;
    if (sw > cw && cw > 0) line.style.fontSize = (cw / sw * 0.98).toFixed(3) + 'em';
  }
  function fitAll() { $$('[data-word-target]').forEach(fit); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  window.addEventListener('resize', fitAll);

  /* Swap a giant word: old letters lift away, new ones rise in */
  function swapWord(line, word) {
    if (!line || line.getAttribute('data-now') === word) return;
    line.setAttribute('data-now', word);
    if (reduce) { fillWord(line, word); fit(line); return; }
    var old = $$('.giant__ch', line);
    old.forEach(function (c, k) { c.style.setProperty('--i', k); c.classList.add('out'); });
    setTimeout(function () { if (line.getAttribute('data-now') === word) { fillWord(line, word); fit(line); } }, 260 + old.length * 22);
  }

  /* Phone carousel: three phones on show, the rest wait behind. Swipe, drag, click, keys or the service pills. */
  $$('[data-carousel]').forEach(function (car) {
    var stage = $('.stage', car), phones = $$('.phone', car), n = phones.length;
    var tabs = $$('.offers button', car), cap = $('.cap', car), capT = $('.cap__t', car), capL = $('.cap__l', car);
    var word = $('[data-word-target]', car);
    if (word) word.setAttribute('data-now', word.textContent.replace(/\u00A0/g, ' '));
    var i = 0, timer = 0, paused = false, lastWheel = 0;
    function off(k) { var d = ((k - i) % n + n) % n; return d > n / 2 ? d - n : d; }
    function render() {
      phones.forEach(function (p, k) {
        var d = off(k); p.setAttribute('data-d', d); p.style.zIndex = 10 - Math.abs(d);
        p.setAttribute('aria-hidden', String(d !== 0));
      });
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      if (word && phones[i].getAttribute('data-word')) swapWord(word, phones[i].getAttribute('data-word'));
      if (cap) {
        capT.textContent = phones[i].getAttribute('data-title'); capL.textContent = phones[i].getAttribute('data-line');
        cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
      }
    }
    function go(k) { i = ((k % n) + n) % n; render(); restart(); }
    function next() { go(i + 1); }
    function prev() { go(i - 1); }
    function restart() { clearInterval(timer); if (!reduce && !paused) timer = setInterval(function () { i = (i + 1) % n; render(); }, 3800); }
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
    var pBtn = $('.stage__arrow--prev', car), nBtn = $('.stage__arrow--next', car);
    if (pBtn) pBtn.addEventListener('click', prev);
    if (nBtn) nBtn.addEventListener('click', next);
    phones.forEach(function (p, k) { p.addEventListener('click', function () { var d = off(k); if (d === -1) prev(); else if (d === 1) next(); }); });
    stage.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); next(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); } });
    // drag / swipe
    var sx = null;
    stage.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    window.addEventListener('pointerup', function (e) { if (sx === null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); } });
    // sideways trackpad scroll spins the phones (vertical scroll is left alone)
    stage.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
      e.preventDefault(); var now = Date.now(); if (now - lastWheel < 450) return; lastWheel = now;
      e.deltaX > 0 ? next() : prev();
    }, { passive: false });
    car.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { paused = true; clearInterval(timer); } });
    car.addEventListener('pointerleave', function () { paused = false; restart(); });
    car.addEventListener('focusin', function () { paused = true; clearInterval(timer); });
    car.addEventListener('focusout', function () { paused = false; restart(); });
    render(); restart();
  });

  /* Reveal on scroll */
  if ('IntersectionObserver' in window && !reduce) {
    var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }); }, { threshold: 0.12 });
    $$('.rv').forEach(function (el) { rio.observe(el); });
  } else $$('.rv').forEach(function (el) { el.classList.add('in'); });

  /* Sticky "Get leads": after the hero, hidden while a contact section is on screen */
  var stick = $('.stick'), heroEl = $('.hero');
  if (stick && heroEl) {
    var seen = {}, hides = $$('[data-hide-stick]');
    if ('IntersectionObserver' in window) {
      var so = new IntersectionObserver(function (es) { es.forEach(function (e) { seen[e.target.id] = e.isIntersecting; }); upd(); }, { threshold: 0.15 });
      hides.forEach(function (h) { so.observe(h); });
    }
    function upd() {
      var hidden = Object.keys(seen).some(function (k) { return seen[k]; });
      stick.classList.toggle('on', window.scrollY > heroEl.offsetHeight * 0.75 && !hidden);
    }
    window.addEventListener('scroll', upd, { passive: true }); upd();
  }

  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
