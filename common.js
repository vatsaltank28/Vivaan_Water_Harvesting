/* Shared behaviour for every page: smooth scroll, nav, reveals, counters, tabs, form. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const NS = (window.NS = { reduce, $, $$, clamp, ticks: [] });

  /* ---------- smooth scroll (Lenis), one rAF loop for the whole site ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let lenis = null;
  if (!reduce && window.Lenis) try {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    NS.lenis = lenis;
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: -(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68) - 12, duration: 1.4 });
    }));
  } catch (e) { lenis = null; NS.lenis = null; }
  const frame = time => {
    if (lenis) lenis.raf(time);
    const y = lenis ? lenis.animatedScroll : scrollY;
    for (const fn of NS.ticks) fn(y, time);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* ---------- nav ---------- */
  // the mobile (staggered) menu lives in components.js; here we only manage the bar's solid state
  const nav = $('#nav');
  NS.navSolid = true;
  NS.setNavSolid = v => { if (v === NS.navSolid || !nav) return; NS.navSolid = v; nav.classList.toggle('is-solid', v); };

  /* ---------- count-up numbers ---------- */
  const fmt = (n, sep) => sep ? Math.round(n).toLocaleString('en-IN') : String(Math.round(n));
  const ease = t => 1 - Math.pow(1 - t, 4);
  NS.countUp = el => {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const to = +el.dataset.to, sep = el.hasAttribute('data-sep');
    if (reduce) { el.textContent = fmt(to, sep); return; }
    const t0 = performance.now(), dur = 1100;
    const step = now => {
      const t = clamp((now - t0) / dur, 0, 1);
      el.textContent = fmt(to * ease(t), sep);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- reveal on enter ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    $$('.count', e.target).forEach(NS.countUp);
    io.unobserve(e.target);
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => {
    const sib = [...el.parentNode.children].filter(c => c.classList.contains('reveal'));
    el.style.transitionDelay = Math.min(sib.indexOf(el), 5) * 80 + 'ms';
    io.observe(el);
  });

  /* ---------- scroll-linked water pipeline ---------- */
  const pipe = $('#pipeline');
  if (pipe) {
    const fg = $('#pipeFg'), steps = $$('li', pipe);
    let visible = false, last = -1;
    new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(pipe);
    NS.ticks.push(() => {
      if (!visible && !reduce) return;
      const r = pipe.getBoundingClientRect();
      const p = clamp((innerHeight * .78 - r.top) / r.height, 0, 1);
      if (Math.abs(p - last) < .002) return;
      last = p;
      fg.style.strokeDashoffset = 480 * (1 - p);
      steps.forEach((li, i) => li.classList.toggle('is-on', p >= i / (steps.length - 1) - .03));
    });
  }

  /* ---------- sub-navigation highlight ---------- */
  const sub = $$('.subnav a');
  if (sub.length) {
    const map = new Map(sub.map(a => [document.querySelector(a.getAttribute('href')), a]).filter(([s]) => s));
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      sub.forEach(a => a.classList.remove('is-on'));
      const a = map.get(e.target); a.classList.add('is-on');
      a.parentNode.parentNode.scrollTo({ left: a.offsetLeft - 40, behavior: 'smooth' });
    }), { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, s) => so.observe(s));
  }

  /* ---------- tabs (client groups) ---------- */
  $$('[role=tablist]').forEach(list => {
    const tabs = $$('[role=tab]', list);
    const show = tab => {
      tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length]; show(n); n.focus();
      });
    });
  });

  /* ---------- contact / associate forms: validate, then open the user's mail app ---------- */
  $$('form[data-mailto]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('.field', form).forEach(f => {
        const inp = $('input,textarea,select', f), err = $('.err', f);
        if (!inp || !inp.required) return;
        let msg = '';
        if (!inp.value.trim()) msg = 'This field is required.';
        else if (inp.type === 'email' && !/^\S+@\S+\.\S+$/.test(inp.value)) msg = 'Enter a valid email address.';
        else if (inp.type === 'tel' && inp.value.replace(/\D/g, '').length < 10) msg = 'Enter a 10-digit phone number.';
        f.classList.toggle('is-bad', !!msg);
        inp.setAttribute('aria-invalid', !!msg);
        err.textContent = msg;
        if (msg && ok) { ok = false; inp.focus(); }
      });
      if (!ok) return;
      const data = new FormData(form);
      const subject = data.get('subject') || form.dataset.subject || 'Enquiry from website';
      const body = [...data.entries()].filter(([k]) => k !== 'subject').map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}`).join('\n');
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      $('.form__ok', form).hidden = false;
    });
  });

  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
