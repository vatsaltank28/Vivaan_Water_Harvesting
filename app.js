/* Landing: scroll-scrubbed frame sequence + chapter overlays.
   Perf: frames are pre-decoded (ImageBitmap), layout is measured only on load/resize,
   the canvas redraws only when the frame index changes, and DOM classes change only on chapter change.
   Robustness: the first chapter is visible in the markup, and if frames cannot be drawn the poster stays visible. */
(() => {
  const NS = window.NS || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countUp = NS.countUp || (el => { el.textContent = el.hasAttribute('data-sep') ? (+el.dataset.to).toLocaleString('en-IN') : el.dataset.to; });
  const setNavSolid = NS.setNavSolid || (v => $('#nav') && $('#nav').classList.toggle('is-solid', v));
  const getY = () => (NS.lenis ? NS.lenis.animatedScroll : window.scrollY);

  const FRAMES = 240;
  const story = $('.story'), stage = $('#stage'), canvas = $('#film');
  if (!story || !stage || !canvas) return;

  const scenes = $$('.scene', stage).map(el => ({ el, from: +el.dataset.from, to: +el.dataset.to, side: el.dataset.side || 'left' }));
  const rail = $('.rail'), railFill = $('#railFill'), railBtns = $$('.rail__list button');
  const flash = $('#flash'), loaderBar = $('#loaderBar');

  $$('.cloud li, .flow li', stage).forEach(el => el.style.transitionDelay = 260 + [...el.parentNode.children].indexOf(el) * 70 + 'ms');

  /* ---------- layout cache ---------- */
  let storyTop = 0, storyLen = 1, vh = innerHeight;
  const measure = () => {
    vh = innerHeight;
    storyTop = story.getBoundingClientRect().top + window.scrollY;
    storyLen = Math.max(1, story.offsetHeight - vh);
  };
  measure();
  addEventListener('load', measure);

  railBtns.forEach(b => b.addEventListener('click', () => {
    const y = storyTop + (+b.dataset.at + .01) * storyLen;
    NS.lenis ? NS.lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: 'smooth' });
  }));

  /* ---------- chapter state ---------- */
  let activeIdx = -2, railIdx = -1, lastP = -1, navSolid = null;
  function updateUI(p, y) {
    let idx = scenes.findIndex(s => p >= s.from && p < s.to);
    if (idx < 0) idx = p >= 1 ? scenes.length - 1 : 0;
    if (idx !== activeIdx) {
      scenes.forEach((s, i) => { if (i !== idx) s.el.classList.remove('is-on'); });
      const el = scenes[idx].el;
      el.classList.add('is-on');
      $$('.count', el).forEach(countUp);
      stage.dataset.side = scenes[idx].side;
      activeIdx = idx;
    }
    if (Math.abs(p - lastP) > .0005) {
      if (railFill) railFill.style.transform = `scaleY(${p})`;
      if (flash) flash.style.opacity = (clamp((p - .965) / .035, 0, 1) * .9).toFixed(3);
      lastP = p;
    }
    let r = 0; railBtns.forEach((b, i) => { if (p >= +b.dataset.at) r = i; });
    if (r !== railIdx) { railBtns.forEach((b, i) => { b.classList.toggle('is-on', i === r); b.classList.toggle('is-past', i < r); }); railIdx = r; }
    const past = y > storyTop + storyLen - vh * .1;
    if (past !== navSolid) { navSolid = past; setNavSolid(past); if (rail) rail.classList.toggle('is-off', past); }
  }
  const progress = y => clamp((y - storyTop) / storyLen, 0, 1);

  if (reduce) {
    setNavSolid(true);
    scenes.forEach(s => s.el.classList.add('is-on'));
    $$('.count', stage).forEach(countUp);
    return;
  }
  updateUI(progress(getY()), getY());

  /* ---------- frames ---------- */
  // phones (portrait, narrow) get the vertical film; everything else gets the landscape film
  const small = innerWidth < 820 && innerHeight > innerWidth;
  const set = small ? 'm' : 'd';
  const bmp = new Array(FRAMES);
  const ctx = canvas.getContext('2d');
  let loaded = 0, dirty = true, drewOnce = false;
  const src = i => `frames/${set}/${String(i + 1).padStart(3, '0')}.webp`;

  async function decode(i) {
    // fetch+createImageBitmap decodes off the main thread; <img>.decode() is the fallback (file://, old browsers)
    if (location.protocol !== 'file:' && window.createImageBitmap) {
      try { const r = await fetch(src(i)); if (r.ok) return await createImageBitmap(await r.blob()); } catch (e) {}
    }
    const im = new Image(); im.decoding = 'async'; im.src = src(i);
    await im.decode();
    // turn it into a GPU-ready bitmap now, so the first draw during scroll doesn't stall
    if (window.createImageBitmap) { try { return await createImageBitmap(im); } catch (e) {} }
    return im;
  }

  // coarse-to-fine: every 24th, 12th, 6th, 3rd, then all, so the whole film scrubs early
  const order = [], seen = new Set();
  [24, 12, 6, 3, 1].forEach(st => { for (let i = 0; i < FRAMES; i += st) if (!seen.has(i)) { seen.add(i); order.push(i); } });
  let q = 0;
  const worker = async () => {
    while (q < order.length) {
      const i = order[q++];
      try { bmp[i] = await decode(i); } catch (e) {}
      loaded++;
      if (loaderBar) loaderBar.style.transform = `scaleX(${loaded / FRAMES})`;
      if (loaded === FRAMES && loaderBar) loaderBar.style.opacity = 0;
      dirty = true;
    }
  };
  for (let k = 0; k < 6; k++) worker();

  /* ---------- canvas ---------- */
  let cw = 0, ch = 0, portrait = false;
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    portrait = h > w * 1.05;
    const dpr = Math.min(devicePixelRatio || 1, small ? 2 : 1.5);
    const srcW = small ? 720 : 1600;                               // phone set is the vertical 720x1280 film
    const need = small ? Math.max(w, h * 9 / 16) : Math.max(w, h * 16 / 9);
    const scale = clamp(srcW / need, 1, dpr);                      // never upscale past the source resolution
    cw = Math.round(w * scale); ch = Math.round(h * scale);
    canvas.width = cw; canvas.height = ch;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    dirty = true;
    measure();
  }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();

  function nearest(i) {
    if (bmp[i]) return bmp[i];
    for (let d = 1; d < FRAMES; d++) {
      if (bmp[i - d]) return bmp[i - d];
      if (bmp[i + d]) return bmp[i + d];
    }
    return null;
  }

  let drawnIdx = -1, drawnImg = null;
  function draw(idx) {
    const im = nearest(idx);
    if (!im) return;
    if (idx === drawnIdx && im === drawnImg && !dirty) return;
    const iw = im.width, ih = im.height;
    if (portrait && ih <= iw) {
      // phone: show the WHOLE frame (no cropping) in the upper part of the screen,
      // over a washed-out cover copy so there are no hard bars
      const sc = Math.max(cw / iw, ch / ih);
      ctx.drawImage(im, (cw - iw * sc) / 2, (ch - ih * sc) / 2, iw * sc, ih * sc);
      ctx.fillStyle = 'rgba(238,240,242,.82)';
      ctx.fillRect(0, 0, cw, ch);
      const s = Math.min(cw / iw, (ch * .56) / ih);
      const w = iw * s, h = ih * s;
      const top = Math.max(ch * .085, ch * .29 - h / 2);
      ctx.drawImage(im, (cw - w) / 2, top, w, h);
    } else {
      const s = Math.max(cw / iw, ch / ih);
      const w = iw * s, h = ih * s;
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    drawnIdx = idx; drawnImg = im; dirty = false;
    if (!drewOnce) { drewOnce = true; stage.classList.add('has-film'); }
  }

  /* ---------- per-frame tick (driven by the single rAF loop in common.js, or our own) ---------- */
  let cur = 0;
  const tick = y => {
    const p = progress(y);
    const target = p * (FRAMES - 1);
    cur += (target - cur) * 0.5;
    if (Math.abs(target - cur) < .05) cur = target;
    if (y < storyTop + storyLen + vh) draw(Math.round(cur));
    updateUI(p, y);
  };
  if (NS.ticks) NS.ticks.push(tick);
  else { const loop = () => { tick(window.scrollY); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
})();
