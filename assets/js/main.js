/* ==========================================================================
   Problematica naturii umane — logica site-ului
   --------------------------------------------------------------------------
   Cuprins:
   0.  Utilitare + stare (temă / mișcare / mărime text)
   1.  Scena cosmică din hero (three.js + shadere GLSL)
   2.  Derulare lină (Lenis) + GSAP / ScrollTrigger
   3.  Reveal-uri la derulare
   4.  Galeria orizontală („Perspective tradiționale")
   5.  Scena Pascal (axa nimic–tot, cu orizonturi)
   6.  Orbele EU / TU (alteritate)
   7.  Bara de progres, cuprins, bara superioară
   8.  Quiz-ul de verificare
   ========================================================================== */

import * as THREE from 'three'; // three.js — auto-găzduit, vezi importmap din index.html

/* -------------------------------------------------------------------------
   0. UTILITARE + STARE
   ------------------------------------------------------------------------- */

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const storedMotion = (() => { try { return localStorage.getItem('pnu-motion'); } catch (e) { return null; } })();
let motionOn = storedMotion ? storedMotion === 'on' : !PREFERS_REDUCED;
if (motionOn) document.documentElement.classList.add('js'); // stările inițiale ascunse (CSS), doar când chiar animăm
else document.documentElement.setAttribute('data-motion', 'off');

/* -------------------------------------------------------------------------
   1. SCENA COSMICĂ (hero) — three.js + GLSL
   ------------------------------------------------------------------------- */

const PALETTES = {
  dark: {
    clear: 0x0e0b08,
    starA: 0xede4d3, starB: 0xd9a441,
    nebTop: 0x161209, nebBottom: 0x050403, nebGlow: 0xd9a441,
    starOpacity: 0.9, nebulaOpacity: 0.5,
  },
  light: {
    clear: 0xf4eddc,
    starA: 0x4a3f2b, starB: 0x8a6118,
    nebTop: 0xf8f2e3, nebBottom: 0xe7dcc2, nebGlow: 0x8a6118,
    starOpacity: 0.72, nebulaOpacity: 0.55,
  },
};

function initHero() {
  const canvas = document.getElementById('cosmos');
  if (!canvas) return undefined;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    console.warn('[hero] WebGL indisponibil — rămâne fundalul CSS:', e);
    return undefined;
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 10, 4000);
  camera.position.set(0, 0, 640);

  const themeOf = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  /* --- praf cosmic: puncte cu shader propriu ------------------------------ */
  const COUNT = 2100;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const sizes = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 2600;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1500;
    positions[i * 3 + 2] = -380 - Math.random() * 1250;
    seeds[i] = Math.random();
    sizes[i] = 1.8 + Math.pow(Math.random(), 1.9) * 6.8;
  }
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  pointsGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const pointsUniforms = {
    uTime: { value: 0 },
    uPR: { value: DPR },
    uColorA: { value: new THREE.Color() },
    uColorB: { value: new THREE.Color() },
    uOpacity: { value: 1 },
  };

  const pointsMat = new THREE.ShaderMaterial({
    uniforms: pointsUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uPR;
      varying float vSeed;
      varying float vFade;

      void main() {
        vSeed = aSeed;
        vec3 p = position;
        p.x += sin(uTime * 0.12 + aSeed * 6.2831) * 16.0;
        p.y += cos(uTime * 0.10 + aSeed * 6.2831) * 12.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        vFade = smoothstep(2050.0, 300.0, dist);
        gl_PointSize = aSize * uPR * (760.0 / dist);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uOpacity;
      varying float vSeed;
      varying float vFade;

      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float alpha = smoothstep(0.5, 0.06, d);
        float twinkle = 0.62 + 0.38 * sin(uTime * (0.5 + vSeed * 1.5) + vSeed * 41.0);
        vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 1.0, vSeed));
        gl_FragColor = vec4(col, alpha * twinkle * vFade * uOpacity);
      }
    `,
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  /* --- voal nebular: plan cu FBM (zgomot) --------------------------------- */
  const nebUniforms = {
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uTop: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uAlpha: { value: 0.5 },
  };
  const nebula = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: nebUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform float uAspect;
        uniform vec3 uTop;
        uniform vec3 uBottom;
        uniform vec3 uGlow;
        uniform float uAlpha;
        varying vec2 vUv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 4; i++) {
            v += amp * noise(p);
            p *= 2.03;
            amp *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv;
          float n = fbm(uv * vec2(uAspect * 2.3, 2.3) + vec2(uTime * 0.014, uTime * -0.009));
          vec3 col = mix(uBottom, uTop, uv.y);
          float glow = exp(-length((uv - vec2(0.5, 0.58)) * vec2(uAspect, 1.0)) * 2.1);
          col += uGlow * glow * 0.38;
          float veil = smoothstep(0.18, 0.9, n);
          gl_FragColor = vec4(col, uAlpha * (0.35 + 0.65 * veil));
        }
      `,
    })
  );
  nebula.position.set(0, 0, -1400);
  scene.add(nebula);

  /* --- aplicarea paletei în funcție de temă ------------------------------- */
  function applyPalette() {
    const p = PALETTES[themeOf()];
    pointsUniforms.uColorA.value.setHex(p.starA);
    pointsUniforms.uColorB.value.setHex(p.starB);
    pointsUniforms.uOpacity.value = p.starOpacity;
    pointsMat.blending = themeOf() === 'light' ? THREE.NormalBlending : THREE.AdditiveBlending;
    pointsMat.needsUpdate = true;
    nebUniforms.uTop.value.setHex(p.nebTop);
    nebUniforms.uBottom.value.setHex(p.nebBottom);
    nebUniforms.uGlow.value.setHex(p.nebGlow);
    nebUniforms.uAlpha.value = p.nebulaOpacity;
    renderer.setClearColor(p.clear, 1);
  }
  applyPalette();
  window.addEventListener('pnu:theme', () => { applyPalette(); if (!motionOn) renderOnce(); });

  /* --- dimensiuni ---------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const dist = Math.abs(nebula.position.z - camera.position.z);
    const planeH = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist * 1.25;
    nebula.scale.set(planeH * camera.aspect, planeH, 1);
    nebUniforms.uAspect.value = camera.aspect;
    if (!motionOn) renderOnce();
  }
  window.addEventListener('resize', resize);
  resize();

  /* --- animația ------------------------------------------------------------ */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function renderOnce() { renderer.render(scene, camera); }

  if (motionOn) {
    window.addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });

    let rafId = null;
    let lastT = 0;
    let heroVisible = true;

    const onFrame = (t) => {
      rafId = requestAnimationFrame(onFrame);
      const dt = Math.min((t - lastT) / 1000, 0.05);
      lastT = t;
      pointsUniforms.uTime.value += dt;
      nebUniforms.uTime.value += dt;

      mouse.x += (mouse.tx - mouse.x) * 0.035;
      mouse.y += (mouse.ty - mouse.y) * 0.035;
      camera.position.x = mouse.x * 34;
      camera.position.y = mouse.y * 20;
      camera.lookAt(0, 0, -1400 * 0.55);
      points.rotation.z = Math.sin(t * 0.000035) * 0.05;

      renderer.render(scene, camera);
    };
    const start = () => { if (rafId === null) { lastT = performance.now(); rafId = requestAnimationFrame(onFrame); } };
    const stop  = () => { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } };

    new IntersectionObserver(([en]) => {
      heroVisible = en.isIntersecting;
      heroVisible && !document.hidden ? start() : stop();
    }, { rootMargin: '120px' }).observe(canvas);

    document.addEventListener('visibilitychange', () => {
      document.hidden || !heroVisible ? stop() : start();
    });
    start();
  } else {
    renderOnce();
  }

  return { stopLoop: () => {}, renderOnce };
}

/* -------------------------------------------------------------------------
   Inițializare generală (după ce GSAP/Lenis s-au încărcat)
   ------------------------------------------------------------------------- */

window.addEventListener('DOMContentLoaded', () => {
  try {
  const hasGSAP = !!window.gsap && !!window.ScrollTrigger;
  const hasLenis = !!window.Lenis;

  if (!hasGSAP) {
    // Nu blocăm niciodată conținutul: fără GSAP, totul se vede, doar că static.
    document.documentElement.classList.remove('js');
    document.documentElement.removeAttribute('data-motion');
  } else {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* -----------------------------------------------------------------------
     2. DERULARE LINĂ + SINCRONIZARE SCROLLTRIGGER
     ----------------------------------------------------------------------- */
  let lenis = null;
  if (hasGSAP && hasLenis && motionOn) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* Ancorele interne (cuprins, „sari la conținut”) */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      ev.preventDefault();
      lenis ? lenis.scrollTo(el, { duration: 1.35 }) : el.scrollIntoView({ behavior: motionOn ? 'smooth' : 'auto' });
    });
  });

  /* -----------------------------------------------------------------------
     3. REVEAL-URI LA DERULARE
     ----------------------------------------------------------------------- */
  if (hasGSAP && motionOn) {
    const ease = 'power3.out';

    $$('[data-reveal]').forEach((el) => {
      const kind = el.getAttribute('data-reveal');
      if (kind === 'title') {
        // titlul din hero: fiecare rând urcă din „mască"
        const lines = splitTitle(el);
        gsap.set(el, { autoAlpha: 1 });
        gsap.fromTo(lines,
          { yPercent: 112, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: 1.2, stagger: 0.15, ease: 'power4.out', delay: 0.2 });
        return;
      }
      gsap.fromTo(el,
        { autoAlpha: 0, y: kind === 'fade' ? 0 : 30 },
        { autoAlpha: 1, y: 0, duration: 0.95, ease, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    });

    $$('[data-reveal-stagger]').forEach((wrap) => {
      gsap.fromTo(wrap.children,
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 0.85, ease, stagger: 0.09, scrollTrigger: { trigger: wrap, start: 'top 84%', once: true } });
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* -----------------------------------------------------------------------
     4. GALERIA ORIZONTALĂ — pin + rulare laterală pe desktop
     ----------------------------------------------------------------------- */
  if (hasGSAP && motionOn) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const track = $('.gallery-track');
      const viewport = $('.gallery-viewport');
      const counter = $('#gallery-counter');
      if (!track || !viewport) return;

      const distance = () => Math.max(track.scrollWidth - viewport.clientWidth, 1);
      const panels = $$('.gpanel', track);

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: '.band--gallery',
          start: 'top top',
          end: () => '+=' + (distance() + window.innerHeight * 0.4),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            if (!counter) return;
            const idx = Math.min(panels.length, Math.round(self.progress * (panels.length - 1)) + 1);
            counter.textContent = String(idx);
          },
        },
      });
    });
  }

  /* -----------------------------------------------------------------------
     5. SCENA PASCAL — axa „nimic → tot" cu orizonturi
     ----------------------------------------------------------------------- */
  if (hasGSAP && motionOn) {
    const scene = $('#pascal-scene');
    const horizons = $$('.horizon');
    const list = $('.horizons');
    const axis = $('.pascal-axis');
    if (scene && horizons.length) {
      const mm2 = gsap.matchMedia();
      mm2.add('(min-width: 900px)', () => {
        list && list.classList.add('is-scrub');
        horizons.forEach((h) => h.classList.remove('is-on'));

        gsap.fromTo(axis, { scaleY: 0.08, opacity: 0.25 }, {
          scaleY: 1, opacity: 0.9, ease: 'none',
          scrollTrigger: { trigger: scene, start: 'top 70%', end: 'top 20%', scrub: 1 },
        });

        const thresholds = [0.06, 0.44, 0.8];
        ScrollTrigger.create({
          trigger: scene,
          start: 'top top',
          end: '+=170%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate(self) {
            horizons.forEach((h, i) => h.classList.toggle('is-on', self.progress >= thresholds[i]));
          },
        });

        return () => { list && list.classList.remove('is-scrub'); horizons.forEach((h) => h.classList.add('is-on')); };
      });
      // fără pin (mobil / mișcare oprită): toate orizonturile rămân aprinse implicit prin CSS
    }
  }

  /* -----------------------------------------------------------------------
     6. ORBELE EU / TU — se apropie pe măsură ce derulezi
     ----------------------------------------------------------------------- */
  if (hasGSAP && motionOn) {
    const orbs = $('#orbs');
    if (orbs) {
      gsap.fromTo(orbs, { '--sep': '4.2rem' }, {
        '--sep': '-1.5rem',
        ease: 'power2.inOut',
        scrollTrigger: {
          trigger: orbs, start: 'top 80%', end: 'top 34%', scrub: 1,
          onUpdate(self) { orbs.classList.toggle('is-joint', self.progress > 0.72); },
        },
      });
      const chips = $$('.orbs-chips .chip', orbs);
      gsap.fromTo(chips,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out',
          scrollTrigger: { trigger: orbs, start: 'top 55%', once: true } });
    }
  }

  /* -----------------------------------------------------------------------
     7. PROGRES, BARA SUPERIOARĂ, CUPRINS
     ----------------------------------------------------------------------- */
  const header = $('.head');
  const bar = $('#progress-bar');
  function onScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    header && header.classList.toggle('is-scrolled', y > 10);
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  const navLinks = $$('.dotnav a');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          navLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === en.target.id));
        }
      });
    }, { rootMargin: '-42% 0px -52% 0px', threshold: 0 });
    ['acasa', 'problema', 'perspective', 'contemporane', 'esenta', 'persoana', 'glosar', 'verificare']
      .forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
  }

  /* -----------------------------------------------------------------------
     SETĂRI: temă / mișcare / mărime text
     ----------------------------------------------------------------------- */
  const btnTheme = $('#btn-theme');
  btnTheme && btnTheme.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('pnu-theme', next); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'light' ? '#f4eddc' : '#0e0b08');
    window.dispatchEvent(new CustomEvent('pnu:theme', { detail: next }));
  });

  const btnMotion = $('#btn-motion');
  if (btnMotion) {
    const apply = () => {
      btnMotion.setAttribute('aria-pressed', String(motionOn));
      btnMotion.title = motionOn ? 'Animații: pornite — click pentru a opri' : 'Animații: oprite — click pentru a porni';
    };
    apply();
    btnMotion.addEventListener('click', () => {
      try { localStorage.setItem('pnu-motion', motionOn ? 'off' : 'on'); } catch (e) {}
      window.location.reload(); // reîncărcare curată: fiecare mod are o singură cale de inițializare
    });
  }

  const btnScale = $('#btn-scale');
  if (btnScale) {
    const order = [null, 'l', 's']; // implicit → mare → mic
    btnScale.addEventListener('click', () => {
      let cur = null;
      try { cur = localStorage.getItem('pnu-scale'); } catch (e) {}
      const next = order[(order.indexOf(cur) + 1) % order.length];
      if (next) {
        document.documentElement.setAttribute('data-scale', next);
        try { localStorage.setItem('pnu-scale', next); } catch (e) {}
        btnScale.title = next === 'l' ? 'Text: mare (click pentru mic)' : 'Text: mic (click pentru implicit)';
      } else {
        document.documentElement.removeAttribute('data-scale');
        try { localStorage.removeItem('pnu-scale'); } catch (e) {}
        btnScale.title = 'Text: implicit (click pentru mare)';
      }
      if (hasGSAP) ScrollTrigger.refresh();
    });
  }

  /* -----------------------------------------------------------------------
     8. QUIZ
     ----------------------------------------------------------------------- */
  const quiz = $('#quiz');
  if (quiz) {
    const questions = $$('.q', quiz);
    const scoreEl = $('#quiz-score');
    const resetBtn = $('#quiz-reset');
    const picked = new Array(questions.length).fill(null);

    const EXPLAIN = [
      'Filosofia nu experimentează, ci întreabă: caută natura sau esența omului pentru a putea explica apoi posibilitățile și modalitățile comportamentului uman (p. 6).',
      'Pentru Descartes, esența omului este cugetarea — „gândesc, deci exist”. Afectivitatea și voința îi aparțin lui Hume; sociabilitatea și virtuțile, lui Aristotel (pp. 6, 8).',
      'Este vorba despre «disproporție»: omul este „nimic” în comparație cu infinitul și „tot” prin comparație cu neantul — de aici, deodată, măreția și mizeria condiției umane (p. 8).',
    ];

    function refreshScore() {
      if (!scoreEl) return;
      const n = picked.filter((v) => v === true).length;
      scoreEl.textContent = 'Corecte: ' + n + ' / ' + questions.length;
    }

    questions.forEach((q, qi) => {
      const opts = $$('.q-opt', q);
      const fb = $('.q-feedback', q);
      opts.forEach((opt) => {
        opt.addEventListener('click', () => {
          if (picked[qi] !== null) return;
          const isRight = opt.dataset.correct === 'true';
          picked[qi] = isRight;
          opts.forEach((o) => {
            o.disabled = true;
            if (o.dataset.correct === 'true') o.classList.add('is-correct');
            else if (o === opt) o.classList.add('is-wrong');
          });
          if (fb) {
            fb.innerHTML =
              (isRight
                ? '<span class="fb-head">Corect.</span> '
                : '<span class="fb-head is-err">Nu chiar —</span> răspunsul corect este marcat mai sus. ') +
              EXPLAIN[qi];
            fb.classList.add('is-on');
          }
          refreshScore();
        });
      });
    });

    resetBtn && resetBtn.addEventListener('click', () => {
      picked.fill(null);
      questions.forEach((q) => {
        $$('.q-opt', q).forEach((o) => { o.disabled = false; o.classList.remove('is-correct', 'is-wrong'); });
        const fb = $('.q-feedback', q);
        if (fb) { fb.textContent = ''; fb.classList.remove('is-on'); }
      });
      refreshScore();
      if (lenis) lenis.scrollTo(quiz, { duration: 1.1 });
    });

    refreshScore();
  }

  /* -----------------------------------------------------------------------
     Scena cosmică (doar dacă WebGL e disponibil)
     ----------------------------------------------------------------------- */
  try { initHero(); } catch (e) { /* rămâne fundalul CSS */ }
  } catch (err) {
    // Plasă de siguranță: conținutul nu are voie să rămână ascuns de o eroare de inițializare.
    console.error('Eroare la inițializarea site-ului:', err);
    document.documentElement.classList.remove('js');
    document.documentElement.removeAttribute('data-motion');
  }
});

/* Titlul din hero: împărțit în rânduri, fiecare cu mască proprie */
function splitTitle(el) {
  const parts = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = parts
    .map((p) => '<span class="line"><span class="line-in">' + p + '</span></span>')
    .join('');
  return $$('.line-in', el);
}
