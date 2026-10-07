/* Vanilla ports of the React Bits patterns used on the site:
   staggered menu, specular button, magic bento, flowing menu, scroll stack, circular gallery,
   masonry + lightbox, folder, flip card, branched menu, web threads background, image loaders, lite YouTube. */
(() => {
  const NS = window.NS || (window.NS = { ticks: [] });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[' + name + ']', e); } };

  /* ---------- image loaders: shimmer until each photo decodes ---------- */
  safe('loaders', () => {
    const done = ph => ph.classList.add('is-loaded');
    $$('.ld').forEach(ph => {
      const img = $('img', ph);
      if (!img) return done(ph);
      if (img.complete && img.naturalWidth) return done(ph);
      img.addEventListener('load', () => done(ph), { once: true });
      img.addEventListener('error', () => { ph.classList.add('is-error'); done(ph); }, { once: true });
    });
  });

  /* ---------- staggered menu ---------- */
  safe('menu', () => {
    const burger = $('#burger'), menu = $('#smenu');
    if (!burger || !menu) return;
    const items = $$('.smenu__list a', menu);
    const set = open => {
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', !open);
      items.forEach((a, i) => a.style.transitionDelay = open ? 220 + i * 55 + 'ms' : '0ms');
      if (NS.lenis) open ? NS.lenis.stop() : NS.lenis.start();
      document.documentElement.style.overflow = open ? 'hidden' : '';
      if (open) setTimeout(() => items[0] && items[0].focus(), 350);
    };
    burger.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    $('.smenu__scrim', menu).addEventListener('click', () => set(false));
    items.forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { set(false); burger.focus(); } });
  });

  /* ---------- specular buttons: highlight follows the pointer ---------- */
  if (fine) safe('specular', () => {
    document.addEventListener('pointermove', e => {
      const b = e.target.closest && e.target.closest('.btn');
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      b.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  });

  /* ---------- magic bento: spotlight + border glow ---------- */
  if (fine) safe('bento', () => {
    $$('.bento').forEach(grid => {
      const cards = $$('.mb', grid);
      grid.addEventListener('pointermove', e => {
        cards.forEach(c => {
          const r = c.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          const d = Math.hypot(Math.max(r.left - e.clientX, 0, e.clientX - r.right), Math.max(r.top - e.clientY, 0, e.clientY - r.bottom));
          c.style.setProperty('--x', x + 'px'); c.style.setProperty('--y', y + 'px');
          c.style.setProperty('--glow', clamp(1 - d / 260, 0, 1).toFixed(2));
        });
      }, { passive: true });
      grid.addEventListener('pointerleave', () => cards.forEach(c => c.style.setProperty('--glow', 0)));
    });
  });

  /* ---------- flowing menu: band enters from the edge the pointer came in on ---------- */
  if (fine && !reduce) safe('flowing', () => {
    $$('.fmenu__item').forEach(item => {
      const band = $('.fmenu__band', item);
      const edge = e => { const r = item.getBoundingClientRect(); return (e.clientY - r.top) < r.height / 2 ? 'top' : 'bottom'; };
      item.addEventListener('mouseenter', e => { band.className = 'fmenu__band from-' + edge(e); });
      item.addEventListener('mouseleave', e => { band.className = 'fmenu__band out-' + edge(e); });
    });
  });

  /* ---------- scroll stack: earlier cards scale back as later ones arrive ---------- */
  if (!reduce) safe('stack', () => {
    const cards = $$('.stack__card');
    if (!cards.length) return;
    cards.forEach((c, i) => c.style.setProperty('--i', i));
    const inners = cards.map(c => $('.stack__inner', c));
    let vis = false;
    new IntersectionObserver(([e]) => vis = e.isIntersecting, { rootMargin: '200px' }).observe($('.stack'));
    const last = new Array(cards.length).fill(-1);
    NS.ticks.push(() => {
      if (!vis) return;
      for (let i = 0; i < cards.length - 1; i++) {
        const next = cards[i + 1].getBoundingClientRect().top;
        const mine = cards[i].getBoundingClientRect().top;
        const p = clamp(1 - (next - mine) / (innerHeight * .9), 0, 1);
        if (Math.abs(p - last[i]) < .003) continue;
        last[i] = p;
        inners[i].style.transform = `scale(${1 - p * .08})`;
        inners[i].style.filter = `brightness(${1 - p * .35})`;
      }
    });
  });

  /* ---------- circular gallery: 3D ring, drag to spin, slow auto-rotate ---------- */
  safe('cgal', () => {
    $$('.cgal').forEach(g => {
      const ring = $('.cgal__ring', g), items = $$('.cgal__item', g);
      const n = items.length;
      const layout = () => {
        const w = items[0].offsetWidth;
        const radius = Math.round((w + 40) / (2 * Math.tan(Math.PI / n)));
        items.forEach((it, i) => it.style.transform = `rotateY(${i * 360 / n}deg) translateZ(${radius}px)`);
        g._r = radius;
      };
      layout(); addEventListener('resize', layout);
      const auto = reduce ? 0 : -0.06;
      let rot = 0, vel = auto, drag = false, sx = 0, sr = 0, lastX = 0, vis = false;
      new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(g);
      g.addEventListener('pointerdown', e => { drag = true; sx = lastX = e.clientX; sr = rot; g.classList.add('is-drag'); g.setPointerCapture(e.pointerId); });
      g.addEventListener('pointermove', e => { if (!drag) return; rot = sr + (e.clientX - sx) * .25; vel = (e.clientX - lastX) * .25; lastX = e.clientX; });
      const up = () => { drag = false; g.classList.remove('is-drag'); };
      g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      const tick = () => {
        if (!vis) return;
        if (!drag) { rot += vel; vel += (auto - vel) * .03; }
        ring.style.transform = `translateZ(${-g._r}px) rotateY(${rot}deg)`;
      };
      NS.ticks.push(tick); tick();
    });
  });

  /* ---------- masonry reveal + filters ---------- */
  safe('masonry', () => {
    const grid = $('.masonry');
    if (!grid) return;
    const figs = $$('figure', grid);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -5% 0px' });
    figs.forEach((f, i) => { f.style.transitionDelay = (i % 4) * 60 + 'ms'; io.observe(f); });
    $$('.filters button').forEach(b => b.addEventListener('click', () => {
      $$('.filters button').forEach(x => x.setAttribute('aria-pressed', x === b));
      const k = b.dataset.f;
      figs.forEach(f => { const show = k === 'all' || f.dataset.cat === k; f.hidden = !show; if (show) f.classList.add('is-in'); });
      if (NS.lenis) NS.lenis.resize();
    }));
  });

  /* ---------- lightbox for any [data-lb] photo ---------- */
  safe('lightbox', () => {
    const triggers = $$('[data-lb]');
    if (!triggers.length) return;
    const lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<figure><img alt=""><p></p></figure><button class="x" aria-label="Close"><i class="ph ph-x"></i></button><button class="pv" aria-label="Previous photo"><i class="ph ph-caret-left"></i></button><button class="nx" aria-label="Next photo"><i class="ph ph-caret-right"></i></button>';
    document.body.appendChild(lb);
    const img = $('img', lb), cap = $('p', lb);
    let list = [], idx = 0, opener = null;
    const show = i => {
      idx = (i + list.length) % list.length;
      const t = list[idx], im = $('img', t);
      img.src = t.dataset.lb || im.currentSrc || im.src; img.alt = im.alt;
      cap.textContent = t.dataset.caption || im.alt || '';
    };
    const open = t => {
      const group = t.dataset.group;
      list = triggers.filter(x => !x.closest('[hidden]') && (!group || x.dataset.group === group));
      opener = t; show(list.indexOf(t)); lb.classList.add('is-open');
      if (NS.lenis) NS.lenis.stop(); $('.x', lb).focus();
    };
    const close = () => { lb.classList.remove('is-open'); if (NS.lenis) NS.lenis.start(); opener && opener.focus(); };
    triggers.forEach(t => {
      t.tabIndex = 0; t.setAttribute('role', 'button');
      t.addEventListener('click', e => { e.stopPropagation(); open(t); });
      t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(t); } });
    });
    $('.x', lb).addEventListener('click', close);
    $('.pv', lb).addEventListener('click', () => show(idx - 1));
    $('.nx', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
    });
  });

  /* ---------- folder: tap/enter toggles, hover opens on desktop ---------- */
  safe('folder', () => {
    $$('.folder').forEach(f => {
      f.tabIndex = 0; f.setAttribute('role', 'button'); f.setAttribute('aria-expanded', 'false');
      const t = () => { const o = !f.classList.contains('is-open'); f.classList.toggle('is-open', o); f.setAttribute('aria-expanded', o); };
      f.addEventListener('click', t);
      f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } });
    });
  });

  /* ---------- flip cards ---------- */
  safe('flip', () => {
    $$('.flip').forEach(c => {
      c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-pressed', 'false');
      const t = e => { if (e && e.target.closest && e.target.closest('a')) return; const o = !c.classList.contains('is-flipped'); c.classList.toggle('is-flipped', o); c.setAttribute('aria-pressed', o); };
      c.addEventListener('click', t);
      c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } });
    });
  });

  /* ---------- branched menu: region roots grow city leaves ---------- */
  safe('branch', () => {
    $$('.branch').forEach(br => {
      const data = JSON.parse($('script[type="application/json"]', br).textContent);
      const roots = $('.branch__roots', br), tree = $('.branch__tree', br), leaves = $('.branch__leaves', br);
      const keys = Object.keys(data);
      roots.setAttribute('role', 'tablist');
      roots.innerHTML = keys.map((k, i) => `<button role="tab" aria-selected="${i === 0}" data-k="${k}">${k}<small>${data[k].length}</small></button>`).join('');
      const show = k => {
        $$('button', roots).forEach(b => b.setAttribute('aria-selected', b.dataset.k === k));
        tree.style.setProperty('--grow', 0);
        leaves.innerHTML = data[k].map((c, i) => { const [a, b] = c.split('|'); return `<li style="--i:${i}">${a}${b ? `<span>${b}</span>` : ''}</li>`; }).join('');
        requestAnimationFrame(() => requestAnimationFrame(() => tree.style.setProperty('--grow', 1)));
        if (NS.lenis) setTimeout(() => NS.lenis.resize(), 50);
      };
      roots.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.k); });
      show(keys[0]);
    });
  });

  /* ---------- lite YouTube: thumbnail until clicked ---------- */
  safe('yt', () => {
    $$('.yt').forEach(y => y.addEventListener('click', () => {
      if ($('iframe', y)) return;
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${y.dataset.id}?autoplay=1&rel=0`;
      f.title = y.dataset.title || 'Video'; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
      y.appendChild(f);
    }));
  });

  /* ---------- web threads: faint flowing lines behind content after the film ---------- */
  safe('threads', () => {
    const c = $('#threads');
    if (!c || reduce) return;
    const ctx = c.getContext('2d');
    let w = 0, h = 0, on = false, t = 0;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 1.5); w = c.width = innerWidth * d; h = c.height = innerHeight * d; };
    size(); addEventListener('resize', size);
    const LINES = innerWidth < 820 ? 14 : 24;
    const trigger = $('[data-threads]');
    if (trigger) new IntersectionObserver(([e]) => { on = e.isIntersecting || e.boundingClientRect.top < 0; c.classList.toggle('is-on', on); }).observe(trigger);
    else { on = true; c.classList.add('is-on'); }
    let mx = .5, my = .5;
    if (fine) addEventListener('pointermove', e => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; }, { passive: true });
    let frame = 0;
    NS.ticks.push(() => {
      if (!on || (++frame & 1)) return;   // ~30fps is enough for a slow ambient background
      t += .006;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < LINES; i++) {
        const k = i / (LINES - 1);
        const base = h * (.18 + k * .64);
        const amp = h * (.05 + .05 * Math.sin(k * 3 + t));
        ctx.beginPath();
        for (let x = 0; x <= w; x += w / 60) {
          const u = x / w;
          const pull = Math.exp(-Math.pow((u - mx) * 3, 2)) * (my - .5) * h * .12;
          const y = base + Math.sin(u * 6 + t * 2 + k * 4) * amp * Math.sin(u * Math.PI) + pull * Math.sin(u * Math.PI);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        const a = .05 + .06 * Math.sin(k * Math.PI);
        ctx.strokeStyle = i % 3 === 0 ? `rgba(255,75,92,${(a * .8).toFixed(3)})` : `rgba(76,170,255,${a.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  });
})();
