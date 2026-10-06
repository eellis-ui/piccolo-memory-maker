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
    line.style.justifyContent = 'flex-start'; // centred overflow hides the left edge from scrollWidth
    var cw = line.clientWidth, sw = line.scrollWidth;
    line.style.justifyContent = '';
    if (sw > cw && cw > 0) line.style.fontSize = (cw / sw * 0.98).toFixed(3) + 'em';
  }
  function fitAll() { $$('[data-word-target] .giant__line').forEach(fit); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitAll);
  window.addEventListener('resize', fitAll);

  /* Swap a giant word by sliding: the new word pushes in from the side you moved towards
     and shoves the old one out the other side. dir 1 = forward (in from the right), -1 = back. */
  function swapWord(box, word, dir) {
    if (!box || box.getAttribute('data-now') === word) return;
    box.setAttribute('data-now', word);
    var lines = $$('.giant__line', box), cur = lines[lines.length - 1];
    lines.slice(0, -1).forEach(function (l) { l.remove(); });   // finish any slide still in flight
    var nl = document.createElement('span');
    nl.className = 'giant__line'; nl.textContent = word;
    if (reduce || !cur) { if (cur) cur.remove(); box.appendChild(nl); fit(nl); return; }
    nl.style.transition = 'none'; nl.style.transform = 'translateX(' + (dir * 100) + '%)';
    box.appendChild(nl); fit(nl);
    void nl.offsetWidth;
    nl.style.transition = ''; nl.style.transform = 'translateX(0)';
    cur.style.transform = 'translateX(' + (-dir * 100) + '%)';
    setTimeout(function () { if (cur.parentNode) cur.remove(); }, 800);
  }

  /* Phone carousel: three phones on show, the rest wait behind. Swipe, drag, click, keys or the progress lines. */
  $$('[data-carousel]').forEach(function (car) {
    var stage = $('.stage', car), phones = $$('.phone', car), n = phones.length;
    var tabs = $$('.offers button', car), ctas = $('.hero__ctas', car), c1 = $('[data-cta="1"]', car), c2 = $('[data-cta="2"]', car);
    var word = $('[data-word-target]', car);
    if (word) word.setAttribute('data-now', word.textContent.replace(/\u00A0/g, ' ').trim());
    var i = 0, timer = 0, paused = false, lastWheel = 0;
    function off(k) { var d = ((k - i) % n + n) % n; return d > n / 2 ? d - n : d; }
    function render(dir) {
      phones.forEach(function (p, k) {
        var d = off(k); p.setAttribute('data-d', d); p.style.zIndex = 10 - Math.abs(d);
        p.setAttribute('aria-hidden', String(d !== 0));
      });
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      if (word && phones[i].getAttribute('data-word')) swapWord(word, phones[i].getAttribute('data-word'), dir || 1);
      // the buttons under the phones follow the phone in the middle
      var ph = phones[i];
      if (c1 && ph.getAttribute('data-c1')) {
        $('span', c1).textContent = ph.getAttribute('data-c1'); c1.setAttribute('href', ph.getAttribute('data-h1'));
        c2.textContent = ph.getAttribute('data-c2'); c2.setAttribute('href', ph.getAttribute('data-h2'));
        if (dir) { ctas.classList.remove('swap'); void ctas.offsetWidth; ctas.classList.add('swap'); }
      }
    }
    function go(k, dir) { var t = ((k % n) + n) % n; if (dir == null) dir = off(t) < 0 ? -1 : 1; i = t; render(dir); restart(); }
    function next() { go(i + 1, 1); }
    function prev() { go(i - 1, -1); }
    function refill() {
      var bar = tabs[i] && $('i', tabs[i]); if (!bar) return;
      bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = ''; bar.style.width = '';
    }
    function restart() {
      clearInterval(timer); car.classList.toggle('is-paused', paused || reduce);
      if (!reduce && !paused) { refill(); timer = setInterval(function () { i = (i + 1) % n; render(1); }, 3800); }
    }
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
    var pBtn = $('.stage__arrow--prev', car), nBtn = $('.stage__arrow--next', car);
    if (pBtn) pBtn.addEventListener('click', prev);
    if (nBtn) nBtn.addEventListener('click', next);
    phones.forEach(function (p, k) { p.addEventListener('click', function () { if (swiped) return; var d = off(k); if (d === -1) prev(); else if (d === 1) next(); }); });
    stage.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); next(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); } });
    // drag / swipe
    var sx = null, swiped = false;
    stage.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    stage.addEventListener('dragstart', function (e) { e.preventDefault(); });
    window.addEventListener('pointerup', function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { swiped = true; setTimeout(function () { swiped = false; }, 50); dx < 0 ? next() : prev(); }
    });
    window.addEventListener('pointercancel', function () { sx = null; });
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
