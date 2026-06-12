(function () {
  'use strict';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  window.addEventListener('pageshow', function () { window.scrollTo(0, 0); });
  window.addEventListener('beforeunload', function () { window.scrollTo(0, 0); });
  document.body.classList.add('loading');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  var lenis = null;
  if (!reduced && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.45, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id === '#top' ? document.body : document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.8 });
      else el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  function splitWords(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (piece) {
          if (!piece) return;
          if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(' ')); return; }
          var mask = document.createElement('span');
          mask.className = 'w-mask';
          var w = document.createElement('span');
          w.className = 'w-word'; w.textContent = piece;
          mask.appendChild(w); frag.appendChild(mask);
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1) splitWords(n);
    });
  }
  function splitChars(el) {
    var words = el.textContent.split(' ');
    el.textContent = '';
    words.forEach(function (word, wi) {
      if (wi) el.appendChild(document.createTextNode(' '));
      if (!word) return;
      var grp = document.createElement('span');
      grp.className = 'w-wgrp';
      word.split('').forEach(function (ch) {
        var mask = document.createElement('span');
        mask.className = 'w-mask';
        var c = document.createElement('span');
        c.className = 'w-char'; c.textContent = ch;
        mask.appendChild(c); grp.appendChild(mask);
      });
      el.appendChild(grp);
    });
  }
  if (!reduced && hasGsap) {
    document.querySelectorAll('[data-split]').forEach(splitWords);
    document.querySelectorAll('[data-split-chars]').forEach(splitChars);
  }

  var loader = document.getElementById('loader');
  var pctEl = document.getElementById('loaderPct');
  var fillEl = document.getElementById('loaderFill');
  var msgEl = document.getElementById('loaderMsg');
  var msgs = ['linking sky…', 'placing sun…', 'displacing terrain…', 'sampling 512/1024…', 'denoising…', 'day ready.'];

  function heroIntro() {
    if (!hasGsap || reduced) { document.querySelectorAll('.hero .reveal').forEach(function (r) { r.style.opacity = 1; r.style.transform = 'none'; }); return; }
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero-last .w-char', { y: 0, duration: 1.3, stagger: 0.045 }, 0.05)
      .to('.hero-first .w-word', { y: 0, duration: 1.1, stagger: 0.08 }, 0.3)
      .to('.hero .reveal', { opacity: 1, y: 0, duration: 1.0, stagger: 0.09 }, 0.6);
  }

  function bootDone() {
    loader.classList.add('done');
    window.scrollTo(0, 0);
    document.body.classList.remove('loading');
    if (lenis) { lenis.scrollTo(0, { immediate: true }); lenis.start(); }
    setTimeout(heroIntro, 350);
    if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 1100);
  }

  if (lenis) lenis.stop();
  if (reduced || !hasGsap) {
    loader.classList.add('done');
    document.body.classList.remove('loading');
    if (lenis) lenis.start();
    heroIntro();
  } else {
    var prog = { v: 0 }, mi = 0;
    var msgTimer = setInterval(function () { mi = Math.min(mi + 1, msgs.length - 1); msgEl.textContent = msgs[mi]; }, 330);
    gsap.to(prog, {
      v: 100, duration: 2.0, ease: 'power2.inOut',
      onUpdate: function () {
        pctEl.textContent = Math.round(prog.v) + '%';
        fillEl.style.transform = 'scaleX(' + prog.v / 100 + ')';
      },
      onComplete: function () { clearInterval(msgTimer); msgEl.textContent = msgs[msgs.length - 1]; setTimeout(bootDone, 220); }
    });
  }

  if (hasGsap && !reduced) {
    gsap.utils.toArray('main section:not(#hero) .reveal').forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });
    gsap.utils.toArray('main section:not(#hero) [data-split]').forEach(function (el) {
      gsap.to(el.querySelectorAll('.w-word'), {
        y: 0, duration: 1.15, ease: 'expo.out', stagger: 0.035,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });
    gsap.utils.toArray('main section:not(#hero) [data-split-chars]').forEach(function (el) {
      if (el.id === 'giant') return;
      gsap.to(el.querySelectorAll('.w-char'), {
        y: 0, duration: 1.05, ease: 'expo.out', stagger: 0.022,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    if (window.matchMedia('(hover:hover)').matches) {
      document.querySelectorAll('[data-wave]').forEach(function (el) {
        var chars = el.querySelectorAll('.w-char');
        var busy = false;
        el.addEventListener('mouseenter', function () {
          if (busy || !chars.length) return; busy = true;
          gsap.to(chars, {
            y: '-14%', duration: 0.22, ease: 'power2.out', stagger: 0.02,
            yoyo: true, repeat: 1,
            onComplete: function () { gsap.set(chars, { y: 0 }); busy = false; }
          });
        });
      });
    }

    var giant = document.getElementById('giant');
    var philo = document.getElementById('philosophy');
    if (giant && philo) {
      gsap.to(giant.querySelectorAll('.w-char'), {
        y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: giant, start: 'top 80%' }
      });
      ScrollTrigger.create({
        trigger: giant, start: 'center 55%', once: true,
        onEnter: function () {
          var seq = [
            [80, true], [110, false], [60, true], [140, false],
            [50, true], [70, false], [40, true], [90, false], [45, true]
          ];
          var t = 0;
          seq.forEach(function (step) {
            t += step[0];
            setTimeout(function () { philo.classList.toggle('flicker', step[1]); }, t);
          });
          setTimeout(function () {
            philo.classList.remove('flicker');
            philo.classList.add('lit');
          }, t + 120);
        }
      });
    }

    gsap.from('#pipeline li', {
      opacity: 0, y: 34, duration: 0.9, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: '#pipeline', start: 'top 82%' }
    });
    gsap.utils.toArray('.frame img, .frame video').forEach(function (m) {
      var f = m.closest('.frame'); if (!f) return;
      gsap.fromTo(m, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });
    gsap.utils.toArray('.frame').forEach(function (f) {
      gsap.fromTo(f,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'power4.out',
          scrollTrigger: { trigger: f, start: 'top 88%' } });
    });

    var velState = { v: 0 };
    if (lenis) lenis.on('scroll', function (e) {
      velState.v = gsap.utils.clamp(-80, 80, e.velocity || 0);
    });
    var skewables = gsap.utils.toArray('.frame, .tile');
    var mqTweens = [];
    gsap.utils.toArray('[data-mq] .mq-track').forEach(function (track) {
      var base = track.innerHTML;
      track.innerHTML = base + base + base + base;
      mqTweens.push(gsap.to(track, { xPercent: -50, repeat: -1, ease: 'none', duration: 26 }));
    });
    var skewCur = 0, skewActive = false;
    gsap.ticker.add(function () {
      var target = gsap.utils.clamp(-3.4, 3.4, velState.v * 0.045);
      skewCur += (target - skewCur) * 0.09;
      velState.v *= 0.94;
      if (Math.abs(skewCur) > 0.02) { gsap.set(skewables, { skewY: skewCur }); skewActive = true; }
      else if (skewActive) { gsap.set(skewables, { skewY: 0 }); skewActive = false; }
      var ts = 1 + Math.min(3.2, Math.abs(velState.v) * 0.05);
      for (var i = 0; i < mqTweens.length; i++) mqTweens[i].timeScale(ts);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (r) { r.style.opacity = 1; r.style.transform = 'none'; });
  }

  (function () {
    var mani = document.getElementById('manifesto');
    var track = document.getElementById('maniTrack');
    if (!mani || !track) return;
    if (reduced || !hasGsap) { mani.style.height = 'auto'; return; }
    function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
    function size() { mani.style.height = (window.innerHeight + dist() + window.innerHeight * 0.35) + 'px'; }
    size();
    window.addEventListener('resize', size);
    gsap.to(track, {
      x: function () { return -dist(); },
      ease: 'none',
      scrollTrigger: {
        trigger: mani, start: 'top top', end: 'bottom bottom',
        scrub: 1, invalidateOnRefresh: true
      }
    });
  })();

  var THEMES = { day: 'theme-day', gold: 'theme-gold' };
  function setTheme(t) {
    document.body.classList.remove('theme-day', 'theme-gold');
    if (THEMES[t]) document.body.classList.add(THEMES[t]);
  }
  var themedSections = Array.prototype.slice.call(document.querySelectorAll('section[data-theme]'));
  if (hasGsap) {
    themedSections.forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onEnter: function () { setTheme(sec.dataset.theme); },
        onEnterBack: function () { setTheme(sec.dataset.theme); }
      });
    });
  }

  var clockEl = document.getElementById('solarClock');
  var dotEl = document.getElementById('solarDot');
  var progressBar = document.getElementById('progressBar');
  var hourSecs = themedSections.filter(function (s) { return s.dataset.hour; });
  var anchors = [];
  function computeAnchors() {
    anchors = hourSecs.map(function (s) {
      var raw = s.dataset.hour.split(':');
      return { el: s, min: (+raw[0]) * 60 + (+raw[1]) };
    });
    for (var i = 1; i < anchors.length; i++) {
      while (anchors[i].min < anchors[i - 1].min) anchors[i].min += 1440;
    }
  }
  computeAnchors();
  window.addEventListener('resize', computeAnchors);

  function fmt(min) {
    min = ((Math.round(min) % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function tickClock() {
    if (anchors.length > 1 && clockEl) {
      var probe = window.scrollY + window.innerHeight * 0.5;
      var cur = anchors[0], next = anchors[0], p = 0;
      for (var i = 0; i < anchors.length; i++) {
        var top = anchors[i].el.getBoundingClientRect().top + window.scrollY;
        if (probe >= top) {
          cur = anchors[i]; next = anchors[Math.min(i + 1, anchors.length - 1)];
          var nTop = next.el.getBoundingClientRect().top + window.scrollY;
          p = nTop > top ? Math.min(1, (probe - top) / (nTop - top)) : 0;
        }
      }
      clockEl.textContent = fmt(cur.min + (next.min - cur.min) * p);
    }
    if (dotEl && typeof window.__dayT === 'number') {
      var t = window.__dayT, a = Math.PI * t;
      dotEl.setAttribute('cx', (22 - 20 * Math.cos(a)).toFixed(2));
      dotEl.setAttribute('cy', (22 - 20 * Math.sin(a)).toFixed(2));
    }
    if (progressBar) {
      var m = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progressBar.style.transform = 'scaleX(' + Math.min(1, window.scrollY / m) + ')';
    }
    requestAnimationFrame(tickClock);
  }
  requestAnimationFrame(tickClock);

  var footLocal = document.getElementById('footLocal');
  if (footLocal) {
    setInterval(function () {
      try {
        footLocal.textContent = 'LOCAL — ' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST';
      } catch (e) {}
    }, 1000);
  }

  var closerClock = document.getElementById('closerClock');
  if (hasGsap && closerClock) {
    ScrollTrigger.create({
      trigger: '#contact', start: 'top 45%',
      onEnter: function () {
        var frames = ['23:59', '23:59', '2#:5#', '#0:0#', '00:00'];
        var fi = 0;
        var iv = setInterval(function () {
          closerClock.textContent = frames[fi];
          if (++fi >= frames.length) clearInterval(iv);
        }, 240);
      }
    });
  }

  var sceneFile = document.getElementById('sceneFile');
  if (sceneFile) {
    var typed = false;
    var typeValues = function () {
      if (typed) return; typed = true;
      var vals = sceneFile.querySelectorAll('.v');
      vals.forEach(function (v, i) {
        var target = v.getAttribute('data-t') || '';
        var ci = 0;
        setTimeout(function () {
          var iv = setInterval(function () {
            ci++;
            v.setAttribute('data-shown', target.slice(0, ci));
            if (ci >= target.length) clearInterval(iv);
          }, 16);
        }, i * 140);
      });
    };
    if (hasGsap && !reduced) {
      ScrollTrigger.create({ trigger: sceneFile, start: 'top 80%', onEnter: typeValues });
    } else {
      sceneFile.querySelectorAll('.v').forEach(function (v) { v.setAttribute('data-shown', v.getAttribute('data-t') || ''); });
    }
  }

  function seq(prefix, from, to, ext) {
    var out = [];
    for (var i = from; i <= to; i++) out.push(prefix + i + ext);
    return out;
  }
  function vseq(prefix, frm, to) {
    var out = [];
    for (var i = frm; i <= to; i++) out.push('assets/videos/' + prefix + i + '.mp4');
    return out;
  }
  function attachMedia(holder, srcPath, isGallery) {
    if (/\.mp4$/i.test(srcPath)) {
      var vid = document.createElement('video');
      vid.muted = true; vid.loop = true; vid.playsInline = true; vid.setAttribute('playsinline', '');
      vid.preload = 'metadata'; vid.draggable = false;
      vid.addEventListener('loadeddata', function () { holder.appendChild(vid); }, { once: true });
      vid.src = srcPath;
      if (!isGallery) {
        holder.addEventListener('mouseenter', function () { vid.play().catch(function () {}); });
        holder.addEventListener('mouseleave', function () { vid.pause(); });
      }
    } else {
      var img = new Image();
      img.draggable = false;
      img.onload = function () { img.alt = ''; holder.appendChild(img); };
      img.src = srcPath;
    }
  }

  var BRANDS = [
    { name: 'Classic Partnership', brand: '#B05B22', group: 'AGENCY', role: 'Visual Design · Calendar Campaigns', files: seq('assets/images/tcp-calendarposts-', 1, 13, '.webp') },
    { name: 'Midea Canada', brand: '#E62D2D', group: 'AGENCY', role: 'Social Overlays · PWHL · Pelonis', files: seq('assets/images/midea-posts-', 1, 6, '.webp').concat(vseq('midea-overlays-', 1, 8), ['assets/images/midea-PWHL-banner.webp', 'assets/images/midea-pelonis-banner-1.webp']) },
    { name: 'Eureka', brand: '#FF6B35', group: 'AGENCY', role: 'Product Social · Reels', files: seq('assets/images/midea-eureka-overlays-', 1, 4, '.webp').concat(vseq('midea-eureka-', 1, 3)) },
    { name: 'Z_Comfee', brand: '#3DA5D9', group: 'AGENCY', role: 'Social Campaign', files: ['assets/images/midea-comfee-post-01.webp', 'assets/images/midea-comfee-post-02.webp'].concat(vseq('midea-comfee-social-', 1, 2)) },
    { name: 'KD Displays', brand: '#0F4C81', group: 'AGENCY', role: 'Display & Retail Content', files: seq('assets/images/kddisplays-posts-', 1, 10, '.webp').concat(['assets/videos/kddisplays-posts-1.mp4']) },
    { name: 'Home Depot Canada', brand: '#F96302', group: 'AGENCY', role: 'RAC Advertisements', files: seq('assets/images/midea-rac-advertisements-0', 1, 8, '.webp') },
    { name: 'GC Burger', brand: '#C8362C', group: 'AGENCY', role: 'Campaign · 5 Locations', files: seq('assets/images/gcburger-campaign-', 1, 28, '.webp') },
    { name: 'Investohome PR', brand: '#2E7A8F', group: 'AGENCY', role: 'Google Ads · Social · Web', files: seq('assets/images/investohome-googleads-banners-', 1, 5, '.webp').concat(seq('assets/images/investohome-socialads-banners-', 1, 5, '.webp'), seq('assets/images/investohome-websitebanner-', 1, 4, '.webp'), ['assets/videos/investohome-outro-1.mp4']) },
    { name: 'Amaya Restaurant', brand: '#8B5A2B', group: 'AGENCY', role: 'Calendar Posts · Reels', files: seq('assets/images/amayarestaurant-calendarposts-', 1, 5, '.webp').concat(['assets/videos/amayarestaurant-reel-1.mp4']) },
    { name: 'VS Design Studio', brand: '#5B4B8A', group: 'STUDIO', role: 'Event & Brand Posts', files: seq('assets/images/vsdesignstudio-posts-', 1, 4, '.webp').concat(['assets/videos/vsdesignstudio-event-1.mp4']) },
    { name: 'AZ Coffee', brand: '#6F4E37', group: 'FREELANCE', role: 'via Coalition Technologies · NDA', files: seq('assets/images/azcoffee-', 1, 3, '.webp') },
    { name: 'LLT Overseas', brand: '#B08D3C', group: 'FREELANCE', role: 'Illustration', files: seq('assets/images/overseas-illustration-', 1, 1, '.webp') },
    { name: 'nxtwave', brand: '#5F2EEA', group: 'FREELANCE', role: 'Slide System', files: seq('assets/images/nxtwave-slide-', 1, 7, '.webp') },
    { name: 'Tamada Media', brand: '#C8362C', group: 'FREELANCE', role: 'Branding', files: ['assets/images/tamadamedia-branding-1.webp', 'assets/videos/tamadamedia-branding-2.mp4'] },
    { name: 'Lakshmi Bakers', brand: '#D9A24C', group: 'FREELANCE', role: 'via Tamada Media', files: seq('assets/images/tamadamedia-laxmibakery-', 1, 3, '.webp') },
    { name: 'Inertia Productions', brand: '#2E7A8F', group: 'FREELANCE', role: 'Motion Graphics', files: ['assets/videos/motiongraphicsmozilla-3.mp4', 'assets/videos/motiongraphicsnews-1.mp4', 'assets/videos/motiongraphicsnews-2.mp4'] }
  ];

  var railsRoot = document.getElementById('rails');
  if (railsRoot) {
    BRANDS.forEach(function (b) {
      var rail = document.createElement('div'); rail.className = 'rail';
      rail.innerHTML =
        '<div class="rail-meta">' +
          '<span class="rail-group mono">' + b.group + '</span>' +
          '<span class="rail-name">' + b.name + '</span>' +
          '<span class="rail-count mono">' + b.files.length + ' PIECES · ' + b.role.toUpperCase() + '</span>' +
        '</div><div class="rail-strip"></div>';
      var strip = rail.querySelector('.rail-strip');
      b.files.forEach(function (f) {
        var card = document.createElement('div');
        card.className = 'rail-card';
        card.style.setProperty('--brand', b.brand);
        var short = f.split('/').pop();
        card.innerHTML = '<span class="rc-ph mono"><i>' + b.name.toUpperCase() + '</i><b>' + short + '</b></span>';
        card.dataset.src = f;
        strip.appendChild(card);
      });
      railsRoot.appendChild(rail);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.querySelectorAll('.rail-card').forEach(function (card) {
          if (card.dataset.done) return;
          card.dataset.done = '1';
          attachMedia(card, card.dataset.src, false);
        });
        io.unobserve(en.target);
      });
    }, { rootMargin: '300px' });
    railsRoot.querySelectorAll('.rail').forEach(function (r) { io.observe(r); });

    document.addEventListener('dragstart', function (e) {
      if (e.target.tagName === 'IMG') e.preventDefault();
    });

    var coarse = window.matchMedia('(hover:none)').matches;
    railsRoot.querySelectorAll('.rail-strip').forEach(function (strip, stripIdx) {
      if (coarse) {
        strip.addEventListener('click', function (e) {
          var card = e.target.closest ? e.target.closest('.rail-card') : null;
          if (card && strip.contains(card)) {
            var idx = Array.prototype.indexOf.call(strip.children, card);
            openGallery(stripIdx, Math.max(0, idx));
          }
        });
        return;
      }
      var down = false, startX = 0, startY = 0, startL = 0, vel = 0, lastX = 0, raf, moved = false;
      strip.addEventListener('pointerdown', function (e) {
        down = true; moved = false;
        startX = e.clientX; startY = e.clientY; startL = strip.scrollLeft; lastX = e.clientX; vel = 0;
        strip.classList.add('dragging'); cancelAnimationFrame(raf);
        document.body.classList.add('cur-drag');
        e.preventDefault();
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 7) moved = true;
        strip.scrollLeft = startL - (e.clientX - startX);
        vel = e.clientX - lastX; lastX = e.clientX;
      });
      window.addEventListener('pointerup', function (e) {
        if (!down) return;
        down = false; strip.classList.remove('dragging');
        document.body.classList.remove('cur-drag');
        if (!moved) {
          var card = document.elementFromPoint(e.clientX, e.clientY);
          card = card && card.closest ? card.closest('.rail-card') : null;
          if (card && strip.contains(card)) {
            var idx = Array.prototype.indexOf.call(strip.children, card);
            openGallery(stripIdx, Math.max(0, idx));
          }
          return;
        }
        (function momentum() {
          if (Math.abs(vel) < 0.4) return;
          strip.scrollLeft -= vel; vel *= 0.94;
          raf = requestAnimationFrame(momentum);
        })();
      });
      strip.addEventListener('mouseenter', function () { document.body.classList.add('cur-drag'); });
      strip.addEventListener('mouseleave', function () { document.body.classList.remove('cur-drag'); });
    });
  }

  var gal = document.getElementById('gallery');
  var galTrack = document.getElementById('galTrack');
  var galViewport = document.getElementById('galViewport');
  var galBrand = document.getElementById('galBrand');
  var galRole = document.getElementById('galRole');
  var galPos = document.getElementById('galPos');
  var gB = 0, gI = 0, galOpen = false;

  function buildGalleryItems(bi) {
    var b = BRANDS[bi];
    galTrack.innerHTML = '';
    b.files.forEach(function (f, i) {
      var it = document.createElement('div');
      it.className = 'gal-item';
      it.style.setProperty('--gal-brandc', b.brand);
      var short = f.split('/').pop();
      it.innerHTML = '<span class="rc-ph mono"><i>' + b.name.toUpperCase() + '</i><b>' + short + '</b></span>';
      attachMedia(it, f, true);
      it.addEventListener('click', function () { if (i !== gI) { gI = i; layoutGallery(true); } });
      galTrack.appendChild(it);
    });
    gal.style.setProperty('--gal-brandc', b.brand);
    galBrand.textContent = b.name;
    galBrand.style.borderColor = b.brand;
    galRole.textContent = b.group + ' · ' + b.role.toUpperCase();
  }

  function layoutGallery(animate) {
    var items = galTrack.children;
    if (!items.length) return;
    gI = Math.max(0, Math.min(gI, items.length - 1));
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('cur', i === gI);
      var v = items[i].querySelector('video');
      if (v) { if (i === gI) v.play().catch(function () {}); else v.pause(); }
    }
    var it = items[gI];
    var x = galViewport.clientWidth / 2 - (it.offsetLeft + it.offsetWidth / 2);
    if (!animate) galTrack.style.transition = 'none';
    galTrack.style.transform = 'translateX(' + x + 'px)';
    if (!animate) { void galTrack.offsetWidth; galTrack.style.transition = ''; }
    galPos.textContent = (gI + 1) + ' / ' + items.length + ' — ' + BRANDS[gB].name.toUpperCase();
  }

  function openGallery(bi, ii) {
    gB = ((bi % BRANDS.length) + BRANDS.length) % BRANDS.length;
    gI = ii || 0;
    buildGalleryItems(gB);
    gal.classList.add('open'); gal.setAttribute('aria-hidden', 'false');
    galOpen = true;
    if (lenis) lenis.stop();
    requestAnimationFrame(function () { layoutGallery(false); });
  }
  function closeGallery() {
    gal.classList.remove('open'); gal.setAttribute('aria-hidden', 'true');
    galOpen = false;
    if (lenis) lenis.start();
  }
  function galStep(d) { gI += d; layoutGallery(true); }
  function galBrandStep(d) {
    var dir = d > 0 ? 1 : -1;
    var doSwitch = function () {
      gB = ((gB + dir) % BRANDS.length + BRANDS.length) % BRANDS.length;
      gI = 0;
      buildGalleryItems(gB);
      layoutGallery(false);
    };
    if (hasGsap && !reduced) {
      gsap.to(galViewport, {
        opacity: 0, y: -dir * 26, duration: 0.24, ease: 'power2.in',
        onComplete: function () {
          doSwitch();
          gsap.fromTo(galViewport, { opacity: 0, y: dir * 26 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' });
        }
      });
    } else doSwitch();
  }

  document.getElementById('galClose').addEventListener('click', closeGallery);
  document.getElementById('galPrev').addEventListener('click', function () { galStep(-1); });
  document.getElementById('galNext').addEventListener('click', function () { galStep(1); });
  window.addEventListener('keydown', function (e) {
    if (!galOpen) return;
    if (e.key === 'Escape') closeGallery();
    else if (e.key === 'ArrowLeft') { e.preventDefault(); galStep(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); galStep(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); galBrandStep(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); galBrandStep(1); }
  });
  (function () {
    var sx = 0, sy = 0, downG = false;
    galViewport.addEventListener('pointerdown', function (e) { downG = true; sx = e.clientX; sy = e.clientY; });
    window.addEventListener('pointerup', function (e) {
      if (!downG || !galOpen) { downG = false; return; }
      downG = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) galStep(dx < 0 ? 1 : -1);
      else if (Math.abs(dy) > 56) galBrandStep(dy < 0 ? 1 : -1);
    });
  })();
  window.addEventListener('resize', function () { if (galOpen) layoutGallery(false); });

  window.__skyHover = false;
  window.addEventListener('pointermove', function (e) {
    var t = e.target;
    window.__skyHover = !(t.closest && t.closest(
      'a, button, figure, img, video, .tile, .rail-card, .tier, .frag, .st-scene, .pill, ' +
      'h1, h2, h3, p, ul, ol, pre, .hud, .gallery, .lightbox, .bento, .rails, .pipeline'
    ));
  }, { passive: true });

  if (window.matchMedia('(hover:hover)').matches) {
    var GLYPHS = 'ABCDEFGHIKLMNOPRSTUVWX#/·';
    document.querySelectorAll('.hud-nav a').forEach(function (link) {
      var orig = link.textContent, run = false;
      link.addEventListener('mouseenter', function () {
        if (run) return; run = true;
        var frame = 0, total = 14;
        var iv = setInterval(function () {
          frame++;
          var fixed = Math.floor((frame / total) * orig.length);
          var out = '';
          for (var i = 0; i < orig.length; i++) {
            out += i < fixed ? orig[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          link.textContent = out;
          if (frame >= total) { clearInterval(iv); link.textContent = orig; run = false; }
        }, 26);
      });
    });
  }

  var dot = document.querySelector('.cur-dot'), ring = document.querySelector('.cur-ring');
  if (dot && window.matchMedia('(hover:hover)').matches) {
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });
    (function curLoop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(curLoop);
    })();
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('a, button, .tile, .pipeline li')) document.body.classList.add('cur-link');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest('a, button, .tile, .pipeline li')) document.body.classList.remove('cur-link');
    });
  }

  if (hasGsap && !reduced && window.matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - r.left - r.width / 2) * 0.25,
          y: (e.clientY - r.top - r.height / 2) * 0.3,
          duration: 0.5, ease: 'power3.out'
        });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  var lb = document.getElementById('lightbox'), lbBody = document.getElementById('lbBody');
  document.querySelectorAll('[data-lb]').forEach(function (tile) {
    tile.addEventListener('click', function () {
      var img = tile.querySelector('img');
      if (!img || !img.naturalWidth) return;
      lbBody.innerHTML = '';
      var big = new Image(); big.src = img.src; lbBody.appendChild(big);
      lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
    });
  });
  function closeLb() { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); }
  document.getElementById('lbClose').addEventListener('click', closeLb);
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });

  (function () {
    var modes = ['clear', 'rain', 'storm'];
    var last = null;
    try { last = sessionStorage.getItem('wxlast'); } catch (e) {}
    var pool = modes.filter(function (m) { return m !== last; });
    var mode = pool[Math.floor(Math.random() * pool.length)];
    try { sessionStorage.setItem('wxlast', mode); } catch (e) {}
    window.__weather = { mode: mode };

    var pill = document.getElementById('wxPill');
    var label = document.getElementById('wxLabel');
    function paint() {
      var icons = { clear: '✦', rain: '☂', storm: '⚡' };
      if (label) label.textContent = icons[window.__weather.mode] + ' ' + window.__weather.mode.toUpperCase();
      document.body.classList.toggle('wx-storm', window.__weather.mode === 'storm');
    }
    window.__stormHue = 200;
    var hueSlide = document.getElementById('hueSlide');
    if (hueSlide) hueSlide.addEventListener('input', function () {
      window.__stormHue = +hueSlide.value;
    });
    if (pill) {
      paint();
      pill.addEventListener('click', function () {
        var idx = (modes.indexOf(window.__weather.mode) + 1) % modes.length;
        window.__weather.mode = modes[idx];
        paint();
      });
    }

    var wx = document.getElementById('wx');
    if (!wx || reduced) return;
    var ctx = wx.getContext('2d');
    var drops = [], DPR2 = Math.min(window.devicePixelRatio || 1, 1.5);
    function sizeWx() {
      wx.width = window.innerWidth * DPR2; wx.height = window.innerHeight * DPR2;
    }
    sizeWx(); window.addEventListener('resize', sizeWx);
    function seedDrops(n) {
      drops = [];
      for (var i = 0; i < n; i++) drops.push({
        x: Math.random(), y: Math.random(),
        v: 0.35 + Math.random() * 0.95,
        l: 7 + Math.random() * 20,
        o: 0.18 + Math.random() * 0.45,
        s: 0.6 + Math.random() * 0.8,
        w: Math.random() * Math.PI * 2
      });
    }
    seedDrops(170);

    var curX = -1, curY = -1, cpx = -9999, cpy = -9999;
    window.addEventListener('pointermove', function (e) {
      curX = e.clientX / window.innerWidth;
      curY = e.clientY / window.innerHeight;
      cpx = e.clientX; cpy = e.clientY;
    }, { passive: true });

    var webPts = [], fine = window.matchMedia('(hover:hover)').matches;
    function seedWeb() {
      webPts = [];
      for (var i = 0; i < 130; i++) webPts.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        len: 0
      });
    }
    seedWeb();
    window.addEventListener('resize', seedWeb);
    function webNoise(x, y) {
      return Math.sin(0.3 * x + 141.4 + 2.5 * Math.sin(0.4 * y - 131.3)) +
             Math.sin(0.2 * y + 151.5 + 2.3 * Math.sin(0.5 * x - 121.2));
    }
    function drawWeb(t) {
      if (!fine || cpx < 0 || !document.body.classList.contains('storm-live')) {
        for (var r = 0; r < webPts.length; r++) webPts[r].len = Math.max(0, webPts[r].len - 0.08);
        return;
      }
      var hue = typeof window.__stormHue === 'number' ? window.__stormHue : 200;
      var R = Math.min(window.innerWidth / 10, 150);
      var grabbed = 0;
      ctx.lineWidth = 1 * DPR2;
      for (var i = 0; i < webPts.length; i++) {
        var p = webPts[i];
        var dx = p.x - cpx, dy = p.y - cpy;
        var len = Math.sqrt(dx * dx + dy * dy);
        var inRange = len < R && grabbed < 8;
        if (inRange) grabbed++;
        p.len = Math.max(0, Math.min(p.len + (inRange ? 0.08 : -0.06), 1));
        if (p.len <= 0.01) continue;
        var e = p.len * p.len;
        var ox = cpx + (dx / (len || 1)) * 9;
        var oy = cpy + (dy / (len || 1)) * 9;
        var ex = ox + (p.x - ox) * e;
        var ey = oy + (p.y - oy) * e;
        ctx.strokeStyle = 'hsla(' + hue + ', 85%, 75%, ' + (0.45 * p.len) + ')';
        ctx.beginPath();
        ctx.moveTo(ox * DPR2, oy * DPR2);
        for (var s = 1; s <= 24; s++) {
          var f = s / 24;
          var lx = ox + (ex - ox) * f;
          var ly = oy + (ey - oy) * f;
          var k = webNoise(lx / 5 + t * 60, ly / 5) * 1.8 * Math.sin(f * Math.PI);
          ctx.lineTo((lx + k) * DPR2, (ly + k) * DPR2);
        }
        ctx.stroke();
        ctx.fillStyle = 'hsla(' + hue + ', 90%, 82%, ' + (0.8 * p.len) + ')';
        ctx.beginPath();
        ctx.arc(ex * DPR2, ey * DPR2, 1.6 * DPR2 * p.len, 0, 7);
        ctx.fill();
      }
    }

    var meteorsArr = [], mNext = 3 + Math.random() * 5, mClock = 0;
    function spawnMeteor() {
      meteorsArr.push({
        x: 0.15 + Math.random() * 0.75, y: Math.random() * 0.3,
        vx: -(0.25 + Math.random() * 0.3), vy: 0.14 + Math.random() * 0.12,
        life: 1, len: 70 + Math.random() * 70
      });
    }

    var last = performance.now();
    (function wxLoop(now) {
      requestAnimationFrame(wxLoop);
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var m = window.__weather.mode;
      var nightF = typeof window.__nightF === 'number' ? window.__nightF : 1;
      ctx.clearRect(0, 0, wx.width, wx.height);

      var rainOn = (m === 'rain' || m === 'storm') ? Math.max(0, (nightF - 0.15) / 0.85) : 0;
      if (rainOn > 0.01) {
        var count = m === 'storm' ? drops.length : (drops.length * 0.6) | 0;
        var slantBase = m === 'storm' ? 0.2 : 0.1;
        var wind = Math.sin(now * 0.0005) * 0.05;
        ctx.lineWidth = 1 * DPR2;
        for (var i = 0; i < count; i++) {
          var d = drops[i];
          var slant = slantBase * d.s + wind + Math.sin(now * 0.001 + d.w) * 0.025;
          d.y += d.v * dt * (m === 'storm' ? 1.5 : 1.0);
          d.x += d.v * dt * slant;
          if (curX >= 0) {
            var ddx = d.x - curX, ddy = d.y - curY;
            var dd = ddx * ddx + ddy * ddy;
            if (dd < 0.012) d.x += (ddx > 0 ? 1 : -1) * dt * (0.012 - dd) * 40;
          }
          if (d.y > 1.05) { d.y = -0.05 - Math.random() * 0.1; d.x = Math.random(); }
          var pxx = d.x * wx.width, pyy = d.y * wx.height;
          ctx.strokeStyle = 'rgba(174,194,224,' + (d.o * rainOn * 0.7) + ')';
          ctx.beginPath();
          ctx.moveTo(pxx, pyy);
          ctx.lineTo(pxx - d.l * slant * 4 * DPR2, pyy - d.l * DPR2);
          ctx.stroke();
        }
      }

      drawWeb(now / 1000);

      var meteorOn = m !== 'storm' && nightF > 0.55;
      if (meteorOn) {
        mClock += dt;
        if (mClock >= mNext) { mClock = 0; mNext = 4 + Math.random() * 6; spawnMeteor(); }
      }
      for (var k = meteorsArr.length - 1; k >= 0; k--) {
        var mt = meteorsArr[k];
        mt.x += mt.vx * dt; mt.y += mt.vy * dt;
        mt.life -= dt * 0.8;
        if (mt.life <= 0) { meteorsArr.splice(k, 1); continue; }
        var hx = mt.x * wx.width, hy = mt.y * wx.height;
        var tx = hx + mt.len * DPR2 * 0.9, ty = hy - mt.len * DPR2 * 0.5;
        var a = mt.life * nightF;
        var g = ctx.createLinearGradient(hx, hy, tx, ty);
        g.addColorStop(0, 'rgba(237,234,226,' + (a * 0.9) + ')');
        g.addColorStop(1, 'rgba(237,234,226,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4 * DPR2;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = 'rgba(255,244,214,' + (a * 0.95) + ')';
        ctx.beginPath(); ctx.arc(hx, hy, 1.6 * DPR2, 0, 7); ctx.fill();
      }
    })(last);
  })();

  var toTop = document.getElementById('toTop');
  if (toTop) {
    toTop.addEventListener('click', function () {
      if (lenis) lenis.scrollTo(0, { duration: 1.8 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    setInterval(function () {
      toTop.classList.toggle('show', window.scrollY > window.innerHeight * 1.2);
    }, 300);
  }

  function sparkTo(cx, cy, fromR, n, dur) {
    if (!hasGsap || reduced) return;
    for (var i = 0; i < n; i++) {
      (function () {
        var s = document.createElement('span');
        s.className = 'star-spark';
        var ang = Math.random() * Math.PI * 2;
        var rad = fromR * (0.6 + Math.random() * 0.8);
        var sx = cx + Math.cos(ang) * rad, sy = cy + Math.sin(ang) * rad;
        s.style.left = sx + 'px'; s.style.top = sy + 'px';
        document.body.appendChild(s);
        gsap.fromTo(s, { opacity: 0, scale: 0.4 }, {
          opacity: 1, scale: 1, duration: 0.18,
          onComplete: function () {
            gsap.to(s, {
              x: cx - sx, y: cy - sy, opacity: 0.9, scale: 0.5,
              duration: dur * (0.7 + Math.random() * 0.6),
              ease: 'power3.in',
              onComplete: function () { s.remove(); }
            });
          }
        });
      })();
    }
  }

  var mailBtn = document.querySelector('.closer-mail');
  if (mailBtn && hasGsap) {
    var chargedFlag = false;
    ScrollTrigger.create({
      trigger: '#contact', start: 'top 55%', once: true,
      onEnter: function () {
        if (chargedFlag || reduced) { mailBtn.classList.add('charged'); return; }
        chargedFlag = true;
        var burst = 3, b = 0;
        var iv = setInterval(function () {
          var r = mailBtn.getBoundingClientRect();
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          sparkTo(cx, cy, Math.min(window.innerWidth, window.innerHeight) * 0.45, 16, 0.9);
          if (++b >= burst) clearInterval(iv);
        }, 420);
        setTimeout(function () {
          mailBtn.classList.add('charged');
          var r = mailBtn.getBoundingClientRect();
          var ringEl = document.createElement('span');
          ringEl.className = 'charge-burst';
          ringEl.style.left = (r.left + r.width / 2) + 'px';
          ringEl.style.top = (r.top + r.height / 2) + 'px';
          document.body.appendChild(ringEl);
          ringEl.addEventListener('animationend', function () { ringEl.remove(); });
        }, 1700);
      }
    });
    if (window.matchMedia('(hover:hover)').matches) {
      mailBtn.addEventListener('mouseenter', function () {
        var r = mailBtn.getBoundingClientRect();
        sparkTo(r.left + r.width / 2, r.top + r.height / 2, 140, 8, 0.5);
      });
    }
  }

  if (window.matchMedia('(hover:hover)').matches && hasGsap && !reduced) {
    document.querySelectorAll('.btn').forEach(function (b) {
      var busy = false;
      b.addEventListener('mouseenter', function () {
        if (busy) return; busy = true;
        var r = b.getBoundingClientRect();
        sparkTo(r.left + r.width / 2, r.top + r.height / 2, 70, 5, 0.4);
        setTimeout(function () { busy = false; }, 600);
      });
    });
  }

  if (window.matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.tile, .tier').forEach(function (card) {
      card.classList.add('glow-card');
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
        card.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
      });
    });
  }

  if (!reduced) {
    document.addEventListener('click', function (e) {
      if (e.clientX === 0 && e.clientY === 0) return;
      var r = document.createElement('span');
      r.className = 'click-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      r.addEventListener('animationend', function () { r.remove(); });
    }, { passive: true });
  }

  document.addEventListener('contextmenu', function (e) {
    if (e.target.closest('img, video, canvas, .frame, .tile, .rail-card, .gal-item, .veil')) e.preventDefault();
  });
  document.querySelectorAll('.frame, .tile').forEach(function (el) {
    var v = document.createElement('span');
    v.className = 'veil';
    el.appendChild(v);
  });
})();
