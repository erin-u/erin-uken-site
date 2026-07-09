/* ---------------------------------------------------------------------------
   Site behaviour: mobile menu, year stamp, contact form, testimonial submit,
   and hydration of dynamic content (testimonials, portfolio, media galleries)
   from Supabase when configured — otherwise the page's static markup remains.
--------------------------------------------------------------------------- */
(function () {
  const EU = window.EU || {};

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }
  function stars(n) { n = Math.max(1, Math.min(5, Number(n) || 5)); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  EU.esc = esc;

  ready(function () {
    // Mobile nav (header is injected by partials.js which runs first).
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    // Year stamps
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    hydrateTestimonials();
    hydratePortfolio();
    hydrateGalleries();
    wireContactForm();
    wireTestimonialForm();
  });

  /* ---------------- Testimonials ---------------- */
  async function hydrateTestimonials() {
    const mount = document.querySelector('[data-testimonials]');
    if (!mount || !EU.supabase || !EU.supabase.configured()) return;
    const rows = await EU.supabase.list('testimonials', { order: 'sort_order', filters: { approved: true } });
    if (!rows.length) return;
    const limit = parseInt(mount.getAttribute('data-limit'), 10) || rows.length;
    mount.innerHTML = rows.slice(0, limit).map(cardFor).join('');
    function cardFor(t) {
      return `<article class="quote">
        <div class="stars" aria-label="${t.rating || 5} star rating">${stars(t.rating)}</div>
        <blockquote>“${esc(t.quote)}”</blockquote>
        <div class="who">
          <span class="avatar">${esc(initials(t.author))}</span>
          <span><b>${esc(t.author)}</b><span>${esc(t.role || '')}</span></span>
        </div>
      </article>`;
    }
  }

  /* ---------------- Portfolio ---------------- */
  async function hydratePortfolio() {
    const mount = document.querySelector('[data-portfolio]');
    if (!mount || !EU.supabase || !EU.supabase.configured()) return;
    const filters = {};
    if (mount.getAttribute('data-category')) filters.category = mount.getAttribute('data-category');
    const rows = await EU.supabase.list('portfolio_items', { order: 'sort_order', filters });
    if (!rows.length) return;
    mount.innerHTML = rows.map((it) => `
      <article class="card">
        ${it.image_url ? `<div class="media-frame" style="margin:-.3rem -.3rem 1rem"><img src="${esc(it.image_url)}" alt="${esc(it.title)}" loading="lazy"></div>` : ''}
        ${it.tag ? `<span class="tag">${esc(it.tag)}</span>` : ''}
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.description || '')}</p>
        ${it.link_url ? `<a class="card-link" href="${esc(it.link_url)}" target="_blank" rel="noopener">${it.category === 'academic' ? 'Read' : 'View project'}</a>` : ''}
      </article>`).join('');
  }

  /* ---------------- Media galleries + documents ---------------- */
  async function hydrateGalleries() {
    const galleries = document.querySelectorAll('[data-gallery]');
    const docMounts = document.querySelectorAll('[data-documents]');
    if ((!galleries.length && !docMounts.length) || !EU.supabase || !EU.supabase.configured()) return;
    const media = await EU.supabase.list('media_assets', { order: 'created_at', ascending: false });

    galleries.forEach((mount) => {
      const cat = mount.getAttribute('data-gallery'); // 'image' | 'video' | '' (any)
      const items = media.filter((m) => (m.kind === 'image' || m.kind === 'video') && (!cat || m.kind === cat));
      if (!items.length) return;
      mount.innerHTML = items.map((m) => `
        <figure>
          ${m.kind === 'video'
            ? `<video src="${esc(m.url)}" controls preload="metadata"></video>`
            : `<img src="${esc(m.url)}" alt="${esc(m.title || 'Media')}" loading="lazy">`}
          ${m.title ? `<figcaption>${esc(m.title)}</figcaption>` : ''}
        </figure>`).join('');
    });

    docMounts.forEach((mount) => {
      const docs = media.filter((m) => m.kind === 'document');
      if (!docs.length) return;
      mount.innerHTML = docs.map((m) => `
        <li><a href="${esc(m.url)}" target="_blank" rel="noopener">
          <span class="doc-ic">📄</span>${esc(m.title || m.url.split('/').pop())}
        </a></li>`).join('');
    });
  }

  /* ---------------- Contact form ---------------- */
  function wireContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const status = document.getElementById('form-status');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const row = {
        first_name: val('first_name'), last_name: val('last_name'),
        email: val('email'), phone: val('phone'),
        interest: val('interest'), message: val('message'),
        marketing_email_opt_in: chk('marketing_email_opt_in'),
        marketing_text_opt_in: chk('marketing_text_opt_in'),
        california_opt_in: chk('california_opt_in')
      };
      setStatus(status, 'Sending…', '');
      if (!EU.supabase || !EU.supabase.configured()) {
        setStatus(status, 'Thanks! The form isn’t connected to the database yet — email ' +
          ((window.SITE_CONFIG && window.SITE_CONFIG.contactEmail) || 'erin@riveracedesigns.com') + ' directly for now.', 'err');
        return;
      }
      try {
        await EU.supabase.insert('contact_submissions', row);
        form.reset();
        setStatus(status, 'Thank you! Your message has been received — Erin will be in touch soon.', 'ok');
        showThankYou(row.interest);
      } catch (err) {
        console.error(err);
        setStatus(status, 'Something went wrong sending your message. Please email ' +
          ((window.SITE_CONFIG && window.SITE_CONFIG.contactEmail) || 'erin@riveracedesigns.com') + '.', 'err');
      }
    });
  }

  /* ---------------- Public "leave a testimonial" ---------------- */
  function wireTestimonialForm() {
    const form = document.getElementById('testimonial-form');
    if (!form) return;
    const status = document.getElementById('testimonial-status');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const row = {
        author: val('t_author'), role: val('t_role'),
        rating: Number(val('t_rating')) || 5, quote: val('t_quote'),
        approved: false
      };
      if (!row.author || !row.quote) { setStatus(status, 'Please add your name and a short note.', 'err'); return; }
      setStatus(status, 'Sending…', '');
      if (!EU.supabase || !EU.supabase.configured()) {
        setStatus(status, 'Thank you! Testimonial submissions turn on once the database is connected.', 'err');
        return;
      }
      try {
        await EU.supabase.insert('testimonials', row);
        form.reset();
        setStatus(status, 'Thank you so much! Your testimonial was submitted for review.', 'ok');
      } catch (err) {
        console.error(err);
        setStatus(status, 'Sorry, that didn’t go through. Please try again later.', 'err');
      }
    });
  }

  /* ---------------- Thank-you popup + instant lead magnet ---------------- */
  function showThankYou(interest) {
    const magnets = (window.SITE_CONFIG && window.SITE_CONFIG.leadMagnets) || {};
    const magnet = magnets[interest] || magnets['default'] || null;
    let overlay = document.getElementById('ty-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ty-modal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ty-h">
          <button class="modal-close" aria-label="Close">&times;</button>
          <div class="modal-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <h3 id="ty-h">Thank you!</h3>
          <p>Your information has been received — Erin will be in touch soon.</p>
          <div class="modal-magnet" id="ty-magnet" hidden>
            <b id="ty-title"></b>
            <a id="ty-link" class="btn btn-accent" target="_blank" rel="noopener">Get instant access →</a>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const close = () => overlay.classList.remove('open');
      overlay.querySelector('.modal-close').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
    const magnetBox = overlay.querySelector('#ty-magnet');
    if (magnet && magnet.url && magnet.url !== '#') {
      overlay.querySelector('#ty-title').innerHTML = 'As a thank-you, here’s a resource for you: <br>“' + esc(magnet.title) + '”';
      overlay.querySelector('#ty-link').href = magnet.url;
      magnetBox.hidden = false;
    } else {
      magnetBox.hidden = true;
    }
    overlay.classList.add('open');
  }

  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function chk(id) { const el = document.getElementById(id); return !!(el && el.checked); }
  function setStatus(el, msg, kind) { if (!el) return; el.textContent = msg; el.className = 'status ' + (kind || ''); }
})();
