/* HAZEO — Cinematic edition. Bez zależności poza opcjonalnym GSAP. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Intro: kadr otwiera się ---------- */
  var intro = $('#intro');
  function heroIn() {
    if (!hasGsap || reduce) return;
    gsap.from('.hero h1 .line > span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.09 });
    gsap.from('.hero .slate, .hero-sub', { opacity: 0, y: 24, duration: 1, ease: 'power3.out', delay: 0.35, stagger: 0.1 });
  }
  if (intro) {
    var seen = false;
    try { seen = sessionStorage.getItem('hz-intro') === '1'; } catch (e) {}
    if (!hasGsap || reduce || seen) {
      intro.classList.add('done');
      heroIn();
    } else {
      try { sessionStorage.setItem('hz-intro', '1'); } catch (e) {}
      var tl = gsap.timeline({ onComplete: function () { intro.classList.add('done'); } });
      tl.from('.intro-title', { opacity: 0, letterSpacing: '0.8em', duration: 0.9, ease: 'power2.out' })
        .to('.intro-title', { opacity: 0, duration: 0.35, delay: 0.35 })
        .to('.intro-bar.top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<0.1')
        .to('.intro-bar.bot', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
        .add(heroIn, '<0.35');
    }
  }

  /* ---------- Hero: czerwone smugi światła (canvas) ---------- */
  var canvas = $('#warp');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var vx = 0.72, vy = 0.42, tvx = vx, tvy = vy;
    var streaks = [], N = 0, running = true, speed = reduce ? 0 : 1;

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      N = Math.round(Math.min(220, (W * H) / 6500));
      streaks = [];
      for (var i = 0; i < N; i++) streaks.push(spawn(true));
    }
    function spawn(initial) {
      return {
        a: Math.random() * Math.PI * 2,
        z: initial ? Math.random() : Math.random() * 0.05,
        v: 0.0016 + Math.random() * 0.0042,
        red: Math.random() < 0.38,
        w: 0.6 + Math.random() * 1.6
      };
    }
    function frame() {
      if (!running) return;
      vx += (tvx - vx) * 0.04; vy += (tvy - vy) * 0.04;
      var cx = W * vx, cy = H * vy, maxR = Math.hypot(W, H);
      ctx.fillStyle = 'rgba(17,18,23,0.34)';
      ctx.fillRect(0, 0, W, H);

      // glow in vanishing point
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.55);
      g.addColorStop(0, 'rgba(239,35,60,0.22)');
      g.addColorStop(0.35, 'rgba(239,35,60,0.06)');
      g.addColorStop(1, 'rgba(17,18,23,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.lineCap = 'round';
      for (var i = 0; i < streaks.length; i++) {
        var s = streaks[i];
        var z0 = s.z;
        s.z += s.v * (1 + s.z * 3) * speed;
        if (s.z > 1.05) { streaks[i] = spawn(false); continue; }
        var r0 = Math.pow(z0, 2.2) * maxR, r1 = Math.pow(s.z, 2.2) * maxR + 2;
        var ca = Math.cos(s.a), sa = Math.sin(s.a) * 0.62;
        var alpha = Math.min(1, s.z * 1.6);
        ctx.strokeStyle = s.red ? 'rgba(239,35,60,' + alpha + ')' : 'rgba(223,229,235,' + (alpha * 0.55) + ')';
        ctx.lineWidth = s.w * (0.4 + s.z * 2.2);
        ctx.beginPath();
        ctx.moveTo(cx + ca * r0, cy + sa * r0);
        ctx.lineTo(cx + ca * r1, cy + sa * r1);
        ctx.stroke();
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    resize();
    // warm up so first paint already has streaks
    for (var k = 0; k < 40; k++) { frame(); if (reduce) break; }
    if (!reduce) requestAnimationFrame(frame);

    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    window.addEventListener('pointermove', function (e) {
      tvx = 0.72 + (e.clientX / window.innerWidth - 0.5) * 0.12;
      tvy = 0.42 + (e.clientY / window.innerHeight - 0.5) * 0.1;
    }, { passive: true });
    if ('IntersectionObserver' in window && !reduce) {
      new IntersectionObserver(function (en) {
        var vis = en[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(frame); }
        else if (!vis) running = false;
      }).observe(canvas);
    }
    if (hasGsap && !reduce) {
      // przyspieszenie przy przewijaniu
      window.addEventListener('scroll', function () {
        speed = 1 + Math.min(4, window.scrollY / 250);
      }, { passive: true });
    }
  }

  /* ---------- Timecode ---------- */
  var tc = $('#timecode');
  if (tc && !reduce) {
    var t0 = performance.now();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    setInterval(function () {
      var f = Math.floor((performance.now() - t0) / (1000 / 24));
      var fr = f % 24, s = Math.floor(f / 24) % 60, m = Math.floor(f / 1440) % 60, h = Math.floor(f / 86400);
      tc.textContent = pad(h) + ':' + pad(m) + ':' + pad(s) + ':' + pad(fr);
    }, 1000 / 24);
  }

  /* ---------- Nawigacja ---------- */
  var nav = $('#nav'), lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('hide', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
    lastY = y;
  }, { passive: true });

  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });
  }

  // aktywna sekcja w menu
  var links = $$('.nav-links a');
  if ('IntersectionObserver' in window && links.length) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        var a = map[e.target.id];
        if (a && e.isIntersecting) { links.forEach(function (l) { l.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) so.observe(el); });
  }

  /* ---------- Szkło: odblask za kursorem ---------- */
  if (window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.glass');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- Reveal + liczniki ---------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '';
    var node = el.firstChild; // tekst przed <small>
    if (!node || node.nodeType !== 3 || reduce) return;
    var start = null, dur = 1400;
    function step(t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(to * e) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        $$('[data-count]', e.target).forEach(countUp);
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    $$('.rv').forEach(function (el, i) {
      el.style.transitionDelay = ((i % 3) * 0.08) + 's';
      io.observe(el);
    });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Taśma filmowa: Hazeo Engine ---------- */
  var strip = $('#strip'), bar = $('#strip-bar'), pin = $('#engine-pin');
  var desktop = window.matchMedia('(min-width: 900px)').matches;
  if (strip && bar) {
    if (hasGsap && window.ScrollTrigger && !reduce && desktop) {
      gsap.registerPlugin(ScrollTrigger);
      document.documentElement.classList.add('js-pin');
      var dist = function () { return Math.max(0, strip.scrollWidth - window.innerWidth); };
      gsap.to(strip, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { bar.style.transform = 'scaleX(' + self.progress + ')'; }
        }
      });
    } else {
      strip.addEventListener('scroll', function () {
        var max = strip.scrollWidth - strip.clientWidth;
        bar.style.transform = 'scaleX(' + (max > 0 ? strip.scrollLeft / max : 1) + ')';
      }, { passive: true });
    }
  }

  /* ---------- Formularz zgłoszeń ---------- */
  var form = $('#lead-form');
  if (!form) return;
  var ENDPOINT = 'https://formsubmit.co/ajax/michalmalek@hazeo.pl';
  var statusEl = $('#form-status'), submit = $('#f-submit'), planInput = $('#f-plan');

  $$('[data-plan]').forEach(function (b) {
    b.addEventListener('click', function () { planInput.value = b.getAttribute('data-plan'); });
  });

  function errFor(input) {
    var map = { 'f-name': 'e-name', 'f-email': 'e-email', 'f-company': 'e-company', 'f-budget': 'e-budget', 'f-consent': 'e-consent' };
    return document.getElementById(map[input.id]);
  }
  function check(input) {
    var ok = input.type === 'checkbox' ? input.checked : input.value.trim() !== '' && input.checkValidity();
    if (input.type === 'email' && ok) ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    var err = errFor(input), field = input.closest('.field');
    if (err) err.textContent = ok ? '' : input.getAttribute('data-msg');
    if (field) field.classList.toggle('invalid', !ok);
    input.setAttribute('aria-invalid', String(!ok));
    if (err) input.setAttribute('aria-describedby', err.id);
    return ok;
  }
  var required = $$('[required]', form);
  required.forEach(function (i) {
    i.addEventListener(i.tagName === 'SELECT' || i.type === 'checkbox' ? 'change' : 'blur', function () { check(i); });
    i.addEventListener('input', function () { if (i.closest('.field').classList.contains('invalid')) check(i); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusEl.textContent = ''; statusEl.className = 'form-status';
    var firstBad = null;
    required.forEach(function (i) { if (!check(i) && !firstBad) firstBad = i; });
    if (firstBad) { firstBad.focus(); return; }
    if (form.elements._honey.value) return; // bot

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    data._replyto = data.email;
    data.strona = location.href;

    submit.setAttribute('aria-busy', 'true');
    submit.firstChild.textContent = 'Wysyłanie… ';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.success === false || j.success === 'false') throw new Error(j.message || 'HTTP ' + r.status);
        return j;
      });
    }).then(function () {
      var name = (data.imie || '').trim();
      $('#success-text').textContent = 'Dziękujemy' + (name ? ', ' + name : '') + '. Przeanalizujemy Twoją firmę i odezwiemy się w ciągu 1 dnia roboczego z propozycją krótkiej rozmowy. Sprawdź skrzynkę, łącznie z folderem „Oferty”.';
      form.hidden = true;
      var ok = $('#form-success');
      ok.hidden = false; ok.focus();
      if (hasGsap && !reduce) gsap.from(ok.children, { y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'expo.out' });
      if (window.dataLayer) window.dataLayer.push({ event: 'generate_lead', form: 'hazeo_engine', model: data.model });
    }).catch(function () {
      statusEl.className = 'form-status error';
      statusEl.innerHTML = 'Coś przerwało transmisję. Spróbuj ponownie za chwilę albo napisz do nas bezpośrednio: <a href="mailto:michalmalek@hazeo.pl">michalmalek@hazeo.pl</a>.';
    }).then(function () {
      submit.removeAttribute('aria-busy');
      submit.firstChild.textContent = 'Wyślij i odbierz analizę ';
    });
  });
})();
