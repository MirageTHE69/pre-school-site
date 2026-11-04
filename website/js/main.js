/* Little Millennium · Saiyed Vasna — site script (no dependencies) */
(function () {
  'use strict';

  /* ---------- config: edit these ---------- */
  var WHATSAPP_NUMBER = '91XXXXXXXXXX'; // e.g. 919876543210 (country code + number, no +)
  var WA_TEXT = "Hi! I'd like to know about admission at Little Millennium Vasna for my child.";

  var doc = document, root = doc.documentElement, body = doc.body;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  /* ---------- WhatsApp links ---------- */
  var waLink = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(WA_TEXT);
  $$('[data-wa]').forEach(function (a) { a.href = waLink; a.target = '_blank'; a.rel = 'noopener'; });

  /* ---------- splash (home only, once per session) ---------- */
  var splash = $('.splash');
  if (splash) {
    var seen = false;
    try { seen = sessionStorage.getItem('lm-splash') === '1'; } catch (e) {}
    if (seen || reduce) { splash.remove(); }
    else {
      try { sessionStorage.setItem('lm-splash', '1'); } catch (e) {}
      body.classList.add('lock');
      var exit = function () {
        if (!splash || splash.classList.contains('out')) return;
        body.classList.remove('lock');
        splash.classList.add('out');
        setTimeout(function () { splash && splash.remove(); splash = null; }, 850);
      };
      var t = setTimeout(exit, 2600);
      $('.sp-skip', splash).addEventListener('click', function () { clearTimeout(t); exit(); });
    }
  }

  /* ---------- drawer ---------- */
  var drawer = $('.drawer'), dbg = $('.drawer-bg'), burger = $('.burger');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open); dbg.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    burger && burger.setAttribute('aria-expanded', String(open));
    body.classList.toggle('lock', open);
    if (open) { var c = $('.drawer-close', drawer); c && c.focus(); }
  }
  burger && burger.addEventListener('click', function () { setDrawer(true); });
  dbg && dbg.addEventListener('click', function () { setDrawer(false); });
  $$('.drawer-close, .drawer a').forEach(function (el) { el.addEventListener('click', function () { setDrawer(false); }); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });

  /* ---------- reveal on scroll ---------- */
  var reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-reveal'); });
        el.style.setProperty('--d', Math.max(0, sibs.indexOf(el)) * 80 + 'ms');
        el.classList.add('in'); io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
    // safety net: never leave content hidden
    setTimeout(function () { reveals.forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight * 1.2) el.classList.add('in'); }); }, 2500);
  } else { reveals.forEach(function (el) { el.classList.add('in'); }); }

  /* hand-drawn underlines draw when visible */
  var hands = $$('.hand');
  if ('IntersectionObserver' in window) {
    var hio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('drawn'); hio.unobserve(e.target); } }); }, { threshold: 0.6 });
    hands.forEach(function (h) { hio.observe(h); });
  } else hands.forEach(function (h) { h.classList.add('drawn'); });

  /* ---------- counters ---------- */
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, t0 = performance.now(), D = 1600;
        cio.unobserve(el);
        (function step(t) { var p = Math.min(1, (t - t0) / D); el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec); if (p < 1) requestAnimationFrame(step); })(t0);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { el.textContent = (0).toFixed(+el.dataset.dec || 0); cio.observe(el); });
  }

  /* ---------- scroll-driven effects ---------- */
  var header = $('.header'), progress = $('.progress'), mbar = $('.mbar');
  var parallax = $$('[data-parallax]');
  var dayOuter = $('.day'), dayTrack = $('.day-track'), dayBar = $('.day-bar div'), dayHint = $('.day-hint-t');
  var campusCards = $$('.ccard'), campusNav = $$('.campus-nav div');
  var ticking = false;

  function onScroll() {
    ticking = false;
    var y = window.scrollY, H = root.scrollHeight - innerHeight;
    if (progress) progress.style.width = (H > 0 ? (y / H) * 100 : 0) + '%';
    if (header) header.classList.toggle('scrolled', y > 40);
    if (mbar) mbar.classList.toggle('show', y > 300);
    if (!reduce) parallax.forEach(function (el) { el.style.transform = 'translate3d(0,' + (y * parseFloat(el.dataset.parallax)) + 'px,0)'; });

    if (dayOuter && dayTrack) {
      if (innerWidth >= 900) {
        var r = dayOuter.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
        var max = Math.max(0, dayTrack.scrollWidth - innerWidth);
        dayTrack.style.transform = 'translate3d(' + (-p * max) + 'px,0,0)';
        if (dayBar) dayBar.style.width = (12 + p * 88) + '%';
      } else {
        dayTrack.style.transform = '';
      }
    }
    if (campusCards.length) {
      var act = 0;
      campusCards.forEach(function (el, i) { if (el.getBoundingClientRect().top < innerHeight * 0.55) act = i; });
      campusNav.forEach(function (n, i) { n.classList.toggle('on', i === act); });
    }
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', function () { setDayHint(); req(); });
  function setDayHint() { if (dayHint) dayHint.textContent = innerWidth >= 900 ? 'Scroll to walk through the day' : 'Swipe →'; }
  setDayHint(); onScroll();

  /* mobile: day bar follows horizontal swipe */
  var dayScroll = $('.day-scroll');
  dayScroll && dayScroll.addEventListener('scroll', function () {
    if (innerWidth >= 900 || !dayBar) return;
    var m = dayScroll.scrollWidth - dayScroll.clientWidth;
    dayBar.style.width = (12 + (m > 0 ? dayScroll.scrollLeft / m : 0) * 88) + '%';
  }, { passive: true });

  /* ---------- seven petals ---------- */
  var flower = $('.flower');
  if (flower) {
    var chips = $$('.petal-chip'), petals = $$('.flower ellipse'), label = $('.flower-label'), def = label.textContent;
    var setPetal = function (i) {
      petals.forEach(function (p, k) { p.style.opacity = i < 0 || i === k ? 1 : 0.25; });
      chips.forEach(function (c, k) { c.classList.toggle('on', i === k); c.style.borderColor = i === k ? c.dataset.color : ''; });
      label.textContent = i < 0 ? def : chips[i].textContent.trim();
    };
    chips.forEach(function (c, i) {
      c.addEventListener('mouseenter', function () { setPetal(i); });
      c.addEventListener('mouseleave', function () { setPetal(-1); });
      c.addEventListener('focus', function () { setPetal(i); });
      c.addEventListener('blur', function () { setPetal(-1); });
      c.addEventListener('click', function () { setPetal(c.classList.contains('on') ? -1 : i); });
    });
    petals.forEach(function (p, i) {
      p.addEventListener('mouseenter', function () { setPetal(i); });
      p.addEventListener('mouseleave', function () { setPetal(-1); });
    });
  }

  /* ---------- FAQ ---------- */
  $$('.faq-i').forEach(function (item, i, all) {
    var btn = $('.faq-q', item);
    btn.addEventListener('click', function () {
      var open = !item.classList.contains('open');
      all.forEach(function (o) { o.classList.remove('open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- visit form ---------- */
  var form = $('#visit-form');
  if (form) {
    var card = form.closest('.form-card');
    var mobile = form.elements.mobile, age = form.elements.age, prog = form.elements.program, date = form.elements.date;
    if (date) { var d = new Date(); d.setDate(d.getDate() + 1); date.min = d.toISOString().slice(0, 10); }
    mobile.addEventListener('input', function () { mobile.value = mobile.value.replace(/\D/g, '').slice(0, 10); clearErr(mobile); });
    form.elements.name.addEventListener('input', function () { clearErr(form.elements.name); });
    age.addEventListener('change', function () {
      var a = parseFloat(age.value); if (!a) return;
      prog.value = a < 3 ? 'Developing Roots' : a < 4 ? 'Emerging Wings' : a < 5 ? 'Ready To Fly I' : 'Ready To Fly II';
    });
    function wrapOf(inp) { return inp.closest('label'); }
    function setErr(inp) { wrapOf(inp).classList.add('has-err'); inp.setAttribute('aria-invalid', 'true'); }
    function clearErr(inp) { wrapOf(inp).classList.remove('has-err'); inp.removeAttribute('aria-invalid'); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements.company.value) return; // honeypot
      var ok = true, name = form.elements.name;
      if (name.value.trim().length < 2) { setErr(name); ok = false; } else clearErr(name);
      if (!/^[6-9]\d{9}$/.test(mobile.value)) { setErr(mobile); ok = false; } else clearErr(mobile);
      if (!ok) { var f = form.querySelector('[aria-invalid]'); f && f.focus(); return; }
      $('#thanks-name').textContent = name.value.trim().split(' ')[0];
      card.classList.add('sent');
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    $('#again').addEventListener('click', function () { form.reset(); card.classList.remove('sent'); });
  }

  /* ---------- gallery: mouse parallax polaroids ---------- */
  var gh = $('.g-hero');
  if (gh && !reduce) {
    var pols = $$('[data-mouse]', gh);
    gh.addEventListener('mousemove', function (e) {
      var r = gh.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, yy = (e.clientY - r.top) / r.height - .5;
      pols.forEach(function (el) { var k = +el.dataset.mouse; el.style.transform = 'translate3d(' + x * k + 'px,' + yy * k + 'px,0)'; });
    });
  }

  /* ---------- gallery: filter + lightbox ---------- */
  var grid = $('.g-grid');
  if (grid) {
    var items = $$('.g-item', grid), fbtns = $$('.filters button'), lb = $('.lb'), lbImg = $('.lb-ph img'), lbCap = $('.lb-cap'), lbMeta = $('.lb-meta');
    var visible = items.slice(), cur = -1, lastFocus = null;
    fbtns.forEach(function (b) {
      var cat = b.dataset.cat;
      var n = cat === 'All' ? items.length : items.filter(function (i) { return i.dataset.cat === cat; }).length;
      var s = doc.createElement('small'); s.textContent = n; b.appendChild(s);
      b.addEventListener('click', function () {
        fbtns.forEach(function (o) { o.setAttribute('aria-selected', String(o === b)); });
        visible = [];
        items.forEach(function (it) {
          var show = cat === 'All' || it.dataset.cat === cat;
          it.hidden = !show;
          if (show) { visible.push(it); it.style.animation = 'none'; void it.offsetWidth; it.style.animation = ''; it.style.animationDelay = (visible.length - 1) * 50 + 'ms'; }
        });
      });
    });
    items.forEach(function (it, i) {
      it.style.animationDelay = i * 50 + 'ms';
      it.addEventListener('click', function () { lastFocus = it; open(visible.indexOf(it)); });
    });
    function render() {
      var it = visible[cur], img = $('img', it);
      lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt;
      lbCap.textContent = it.dataset.cap; lbMeta.textContent = it.dataset.cat + ' · ' + (cur + 1) + ' of ' + visible.length;
    }
    function open(i) { cur = i; render(); lb.classList.add('open'); body.classList.add('lock'); $('.lb-x', lb).focus(); }
    function close() { lb.classList.remove('open'); body.classList.remove('lock'); cur = -1; lastFocus && lastFocus.focus(); }
    function step(d) { cur = (cur + d + visible.length) % visible.length; render(); }
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    $('.lb-x', lb).addEventListener('click', close);
    $('.lb-nav .pv', lb).addEventListener('click', function () { step(-1); });
    $('.lb-nav .nx', lb).addEventListener('click', function () { step(1); });
    doc.addEventListener('keydown', function (e) {
      if (cur < 0) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1);
    });
    var sx = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
  }

  /* footer year */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
