/* HAZEO koncept: ruch i interakcje (GSAP + ScrollTrigger + Lenis, jak na hazeo.pl) */
(function(){
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasG = !!(window.gsap && window.ScrollTrigger);
  var motion = hasG && !RM;
  var root = document.documentElement;
  root.classList.add(motion ? 'js-motion' : 'no-motion');
  if (hasG) gsap.registerPlugin(ScrollTrigger);
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- płynny scroll ---------- */
  var lenis = null;
  if (motion && window.Lenis){
    lenis = new Lenis({duration:1.1, easing:function(t){ return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }});
    root.classList.add('lenis');
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToY(y, immediate){
    if (lenis) lenis.scrollTo(y, {immediate:!!immediate, duration:1.2});
    else window.scrollTo({top:y, behavior:(immediate || RM) ? 'auto' : 'smooth'});
  }
  function yOf(el){ return el.getBoundingClientRect().top + window.scrollY; }

  /* ---------- menu mobilne ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  function setMenu(open){
    if (open){
      menu.hidden = false;
      requestAnimationFrame(function(){ root.classList.add('menu-open'); });
      if (lenis) lenis.stop();
    } else {
      root.classList.remove('menu-open');
      setTimeout(function(){ if (!root.classList.contains('menu-open')) menu.hidden = true; }, RM ? 0 : 450);
      if (lenis) lenis.start();
    }
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
  }
  burger.addEventListener('click', function(){ setMenu(!root.classList.contains('menu-open')); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && root.classList.contains('menu-open')){ setMenu(false); burger.focus(); }
  });
  window.addEventListener('resize', function(){ if (window.innerWidth > 1060 && root.classList.contains('menu-open')) setMenu(false); });

  /* ---------- kurtyna przy przejściu do sekcji ---------- */
  var cur = document.getElementById('curtain');
  function curtain(mid){
    if (!motion){ mid(); return; }
    var logo = cur.querySelector('.curtain-mark');
    gsap.timeline()
      .set(cur, {transformOrigin:'bottom'})
      .to(cur, {scaleY:1, duration:.5, ease:'power4.in'})
      .to(logo, {opacity:1, duration:.15}, '-=.1')
      .add(mid)
      .set(cur, {transformOrigin:'top'})
      .to(logo, {opacity:0, duration:.15}, '+=.15')
      .to(cur, {scaleY:0, duration:.65, ease:'power4.out'});
  }
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href').slice(1);
      var t = id ? document.getElementById(id) : null;
      if (!t) return;
      e.preventDefault();
      var wasOpen = root.classList.contains('menu-open');
      curtain(function(){
        if (wasOpen) setMenu(false);
        scrollToY(id === 'top' ? 0 : yOf(t), true);
        if (hasG) ScrollTrigger.update();
        if (a.classList.contains('skip')){ t.setAttribute('tabindex', '-1'); t.focus({preventScroll:true}); }
      });
    });
  });

  /* ---------- przełącznik poziomów opieki ---------- */
  var seg = document.querySelector('.seg');
  var tabs = seg ? seg.querySelectorAll('[role="tab"]') : [];
  function selectTab(t, focus){
    tabs.forEach(function(x, i){
      var on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      var p = document.getElementById(x.getAttribute('aria-controls'));
      p.hidden = !on;
      if (on){
        seg.dataset.i = i;
        if (motion) gsap.fromTo(p.children, {y:24, autoAlpha:0}, {y:0, autoAlpha:1, duration:.7, stagger:.06, ease:'power3.out'});
      }
    });
    if (focus) t.focus();
    if (hasG) ScrollTrigger.refresh();
  }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){ selectTab(t); });
    t.addEventListener('keydown', function(e){
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i + tabs.length - 1) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n){ e.preventDefault(); selectTab(n, true); }
    });
  });

  if (!hasG) return;

  /* ---------- nawigacja: tło po starcie, chowa się przy scrollu w dół ---------- */
  var nav = document.getElementById('nav');
  ScrollTrigger.create({start:0, end:'max', onUpdate:function(self){
    var y = self.scroll();
    nav.classList.toggle('is-solid', y > 40);
    if (root.classList.contains('menu-open')) return;
    nav.classList.toggle('is-hidden', self.direction === 1 && y > window.innerHeight * .5);
  }});

  /* aktywna pozycja w menu */
  var links = document.querySelectorAll('.nav-links a');
  links.forEach(function(l){
    var s = document.getElementById(l.getAttribute('href').slice(1));
    if (!s) return;
    ScrollTrigger.create({trigger:s, start:'top 50%', end:'bottom 50%', onToggle:function(self){
      if (self.isActive){ links.forEach(function(x){ x.classList.remove('is-active'); x.removeAttribute('aria-current'); }); l.classList.add('is-active'); l.setAttribute('aria-current', 'true'); }
      else { l.classList.remove('is-active'); l.removeAttribute('aria-current'); }
    }});
  });

  if (!motion) return;

  /* ---------- magnetyczne przyciski ---------- */
  if (finePointer){
    document.querySelectorAll('.btn').forEach(function(b){
      var xTo = gsap.quickTo(b, 'x', {duration:.6, ease:'power3.out'});
      var yTo = gsap.quickTo(b, 'y', {duration:.6, ease:'power3.out'});
      b.addEventListener('mousemove', function(e){
        var r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .18);
        yTo((e.clientY - r.top - r.height / 2) * .28);
      });
      b.addEventListener('mouseleave', function(){ xTo(0); yTo(0); });
    });
  }

  /* ---------- wejście hero ---------- */
  gsap.timeline({defaults:{ease:'power3.out'}})
    .from('.hero-bg', {scale:1.1, duration:2.8}, 0)
    .from('.hero .pill', {autoAlpha:0, y:16, filter:'blur(6px)', duration:.9}, .2)
    .from('.hero h1 .mask > span', {yPercent:110, duration:1.25, ease:'power4.out', stagger:.12}, .3)
    .from('.hero-lead, .hero-actions', {autoAlpha:0, y:28, filter:'blur(8px)', duration:1, stagger:.12}, .8)
    .from('.nav-pill', {autoAlpha:0, y:-20, duration:1}, .4);

  gsap.to('.hero-inner', {y:-100, autoAlpha:.15, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:.6}});
  gsap.to('.hero-bg', {yPercent:12, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:.6}});

  /* ---------- nagłówki: odsłonięcie maską ---------- */
  gsap.utils.toArray('.rv-h').forEach(function(h){
    gsap.fromTo(h, {clipPath:'inset(0 0 100% 0)', y:36}, {clipPath:'inset(0 0 -15% 0)', y:0, duration:1.3, ease:'power4.out', scrollTrigger:{trigger:h, start:'top 88%', once:true}});
  });

  /* ---------- bloki: miękki wjazd od dołu ---------- */
  gsap.set('.rv', {autoAlpha:0, y:56});
  ScrollTrigger.batch('.rv', {start:'top 90%', once:true, onEnter:function(els){
    gsap.to(els, {y:0, autoAlpha:1, duration:1.1, ease:'power3.out', stagger:.09, overwrite:true, clearProps:'transform'});
  }});
  gsap.utils.toArray('.ticks, .flow').forEach(function(list){
    gsap.from(list.children, {autoAlpha:0, x:-12, duration:.6, stagger:.045, ease:'power2.out', scrollTrigger:{trigger:list, start:'top 90%', once:true}});
  });

  /* ---------- tekst rozświetlany słowo po słowie ---------- */
  gsap.utils.toArray('.scrub').forEach(function(p){
    p.innerHTML = p.textContent.trim().split(/\s+/).map(function(w){ return '<span class="w">' + w + '</span>'; }).join(' ');
    gsap.to(p.querySelectorAll('.w'), {opacity:1, stagger:.08, ease:'none', scrollTrigger:{trigger:p, start:'top 82%', end:'bottom 50%', scrub:.5}});
  });

  /* ---------- obrazy: skala przy scrollu ---------- */
  gsap.fromTo('.manifesto-image', {scale:1.12}, {scale:1, ease:'none', scrollTrigger:{trigger:'.manifesto', start:'top bottom', end:'bottom top', scrub:.6}});
  gsap.fromTo('.cell-lead', {scale:.94}, {scale:1, ease:'none', scrollTrigger:{trigger:'.cell-lead', start:'top bottom', end:'top 55%', scrub:.6}});

  /* ---------- proces: poprzednie karty cofają się pod nową ---------- */
  var cards = gsap.utils.toArray('.stack-card');
  cards.forEach(function(c, i){
    var next = cards[i + 1];
    if (!next) return;
    gsap.to(c.querySelector('.stack-inner'), {scale:.94, autoAlpha:.55, ease:'none', scrollTrigger:{trigger:next, start:'top 85%', end:'top 25%', scrub:.6}});
  });

  /* ---------- ceny: licznik ---------- */
  document.querySelectorAll('.price[data-count]').forEach(function(el){
    var node = el.firstChild, txt = node.textContent;
    var targets = (txt.match(/\d[\d ]*\d/g) || []).map(function(n){ return parseInt(n.replace(/ /g, ''), 10); });
    if (!targets.length) return;
    var o = {p:0};
    function fmt(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
    ScrollTrigger.create({trigger:el, start:'top 92%', once:true, onEnter:function(){
      gsap.fromTo(o, {p:0}, {p:1, duration:1.8, ease:'power3.out',
        onUpdate:function(){ var i = 0; node.textContent = txt.replace(/\d[\d ]*\d/g, function(){ return fmt(targets[i++] * o.p); }); },
        onComplete:function(){ node.textContent = txt; }});
    }});
  });

  /* ---------- liczby założyciela: licznik ---------- */
  document.querySelectorAll('.founder-stats b[data-to]').forEach(function(el){
    var to = parseFloat(el.dataset.to), suf = el.dataset.suffix || '', o = {v:0};
    ScrollTrigger.create({trigger:el, start:'top 92%', once:true, onEnter:function(){
      gsap.fromTo(o, {v:0}, {v:to, duration:1.8, ease:'power3.out', onUpdate:function(){ el.textContent = Math.round(o.v) + suf; }});
    }});
  });

  /* ---------- CTA ---------- */
  gsap.fromTo('.cta-glow', {scale:.5, autoAlpha:0}, {scale:1, autoAlpha:1, ease:'none', scrollTrigger:{trigger:'.cta', start:'top bottom', end:'center center', scrub:.6}});

  window.addEventListener('load', function(){ ScrollTrigger.refresh(); });
})();
