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
    hydrateBooks();
    hydrateTrainings();
    wireContactForm();
    wireTestimonialForm();
    initInlineEditor();
  });

  /* ---------------- Inline page editor (admin only) ---------------- *
   * Every text element in <main> becomes editable in place when the site
   * owner is logged in. Overrides are stored in the `site_content` table
   * keyed by page + a hash of the original text, and re-applied on load.   */
  const EDIT_SEL = 'h1,h2,h3,h4,p,li,blockquote,.eyebrow,.tagline,.kicker,.price,.stat-label,.stat-num,.book-author,figcaption,.card-link,a.btn,.signature .name,.signature .role,.hero-trust span,.facts span,.value-line .row b,.value-line .row span,.cred b,.cred span';
  const SKIP_INSIDE = '[data-testimonials],[data-portfolio],[data-books],[data-products],[data-gallery],[data-documents],[data-book-filters],#ty-modal,.eu-editbar';

  function pageKey() { return location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/'; }
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  function editableEls() {
    const main = document.getElementById('main') || document.querySelector('main');
    if (!main) return [];
    const seen = {};
    return Array.from(main.querySelectorAll(EDIT_SEL)).filter((el) => {
      if (el.closest(SKIP_INSIDE)) return false;
      if (el.querySelector(EDIT_SEL)) return false;            // skip containers of other editables
      const t = (el.textContent || '').trim();
      if (!t) return false;
      const key = pageKey() + '|' + el.tagName + '|' + hash(t);
      seen[key] = (seen[key] || 0) + 1;
      el.dataset.eukey = seen[key] > 1 ? key + '~' + seen[key] : key;
      el.dataset.euorig = t;
      return true;
    });
  }

  function editableImgs() {
    const main = document.getElementById('main') || document.querySelector('main');
    if (!main) return [];
    return Array.from(main.querySelectorAll('img')).filter((img) => {
      if (img.closest(SKIP_INSIDE)) return false;
      const src = img.getAttribute('src') || '';
      if (!src) return false;
      img.dataset.eukey = pageKey() + '|IMG|' + hash(src);
      img.dataset.euorig = src;
      return true;
    });
  }

  async function initInlineEditor() {
    if (!EU.supabase || !EU.supabase.configured()) return;
    const els = editableEls();
    const imgs = editableImgs();
    if (!els.length && !imgs.length) return;

    // Apply saved overrides for everyone.
    try {
      const rows = await EU.supabase.list('site_content', { order: 'key' });
      const map = {};
      rows.forEach((r) => { map[r.key] = r.value; });
      els.forEach((el) => { if (map[el.dataset.eukey] != null) el.textContent = map[el.dataset.eukey]; });
      imgs.forEach((img) => { if (map[img.dataset.eukey] != null) img.src = map[img.dataset.eukey]; });
    } catch (e) { /* table may not exist yet — ignore */ }

    // Show the edit button only to a logged-in owner.
    if (!hasAuthToken()) return;
    const user = await EU.supabase.currentUser().catch(() => null);
    if (!user) return;
    mountEditFab(els, imgs);
  }

  function hasAuthToken() {
    try { for (let i = 0; i < localStorage.length; i++) { if (/^sb-.*-auth-token$/.test(localStorage.key(i))) return true; } } catch (e) {}
    return false;
  }

  function mountEditFab(els, imgs) {
    const fab = document.createElement('button');
    fab.className = 'eu-edit-fab';
    fab.innerHTML = '✏️ Edit this page';
    document.body.appendChild(fab);
    let editing = false, bar = null;

    // Hidden file picker for swapping photos.
    const picker = document.createElement('input');
    picker.type = 'file'; picker.accept = 'image/*'; picker.style.display = 'none';
    document.body.appendChild(picker);
    let targetImg = null;
    picker.addEventListener('change', async () => {
      const file = picker.files[0]; picker.value = '';
      if (!file || !targetImg) return;
      toast('Uploading photo…');
      try {
        const up = await EU.supabase.upload((window.SITE_CONFIG.storage || {}).mediaBucket || 'media', file);
        targetImg.src = up.url; targetImg.setAttribute('src', up.url);
      } catch (e) { toast('Upload failed: ' + (e.message || 'error')); }
      targetImg = null;
    });

    const guard = (e) => {
      if (!editing) return;
      const img = e.target.closest && e.target.closest('img[data-eukey]');
      if (img) { e.preventDefault(); e.stopPropagation(); targetImg = img; picker.click(); return; }
      if (e.target.closest('a')) e.preventDefault();
    };
    document.addEventListener('click', guard, true);

    fab.addEventListener('click', () => {
      editing = !editing;
      document.body.classList.toggle('eu-editing', editing);
      els.forEach((el) => { el.contentEditable = editing ? 'true' : 'false'; });
      imgs.forEach((img) => img.classList.toggle('eu-img', editing));
      if (editing) {
        fab.style.display = 'none';
        bar = document.createElement('div');
        bar.className = 'eu-editbar';
        bar.innerHTML = '<span>Editing — click text to change it, or click a photo to replace it.</span>' +
          '<button class="btn btn-accent" data-save>Save changes</button>' +
          '<button class="btn btn-ghost" data-cancel>Cancel</button>';
        document.body.appendChild(bar);
        bar.querySelector('[data-save]').addEventListener('click', () => saveEdits(els, imgs, bar, fab));
        bar.querySelector('[data-cancel]').addEventListener('click', () => location.reload());
      }
    });
  }

  async function saveEdits(els, imgs, bar, fab) {
    const btn = bar.querySelector('[data-save]');
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
      for (const el of els) {
        const v = (el.textContent || '').trim();
        if (v !== el.dataset.euorig || el.dataset.eusaved === '1') {
          await EU.supabase.upsert('site_content', { key: el.dataset.eukey, value: v });
          el.dataset.eusaved = '1';
        }
      }
      for (const img of imgs) {
        const v = img.getAttribute('src') || '';
        if (v !== img.dataset.euorig || img.dataset.eusaved === '1') {
          await EU.supabase.upsert('site_content', { key: img.dataset.eukey, value: v });
          img.dataset.eusaved = '1';
        }
      }
      toast('Saved! Your changes are live.');
      els.forEach((el) => { el.contentEditable = 'false'; });
      imgs.forEach((img) => img.classList.remove('eu-img'));
      document.body.classList.remove('eu-editing');
      bar.remove(); fab.style.display = '';
    } catch (e) {
      btn.textContent = 'Save changes'; btn.disabled = false;
      toast('Could not save: ' + (e.message || 'error') + '. Did you run the site_content SQL?');
    }
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'eu-toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  /* ---------------- Book Club (tag-filterable) ---------------- */
  async function hydrateBooks() {
    const bookMount = document.querySelector('[data-books]');
    const prodMount = document.querySelector('[data-products]');
    const filterMount = document.querySelector('[data-book-filters]');
    if ((!bookMount && !prodMount) || !EU.supabase || !EU.supabase.configured()) return;
    const rows = await EU.supabase.list('books', { order: 'sort_order' });
    if (!rows.length) return;
    const books = rows.filter((b) => (b.kind || 'book') === 'book');
    const products = rows.filter((b) => b.kind === 'product');

    function card(b) {
      return `<article class="book">
        <div class="book-cover">${b.image_url ? `<img src="${esc(b.image_url)}" alt="${esc(b.title)}" loading="lazy">` : esc(b.title)}</div>
        <div class="book-body">
          ${b.tag ? `<span class="tag">${esc(b.tag)}</span>` : ''}
          <h3>${esc(b.title)}</h3>
          ${b.author ? `<p class="book-author">by ${esc(b.author)}</p>` : ''}
          ${b.note ? `<p>${esc(b.note)}</p>` : ''}
          ${b.buy_url ? `<a class="btn ${b.kind === 'product' ? 'btn-outline' : 'btn-accent'} btn-sm" href="${esc(b.buy_url)}" target="_blank" rel="noopener sponsored">${b.kind === 'product' ? 'View' : 'Buy'} →</a>` : ''}
        </div>
      </article>`;
    }
    const render = (list) => { bookMount.innerHTML = list.length ? list.map(card).join('') : '<p class="muted">No books in this category yet.</p>'; };

    if (bookMount && books.length) render(books);
    if (prodMount && products.length) prodMount.innerHTML = products.map(card).join('');

    if (filterMount && bookMount && books.length) {
      const tags = Array.from(new Set(books.map((b) => b.tag).filter(Boolean))).sort();
      if (tags.length) {
        filterMount.innerHTML = ['All'].concat(tags).map((t, i) =>
          `<button class="chip${i === 0 ? ' active' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
        filterMount.querySelectorAll('.chip').forEach((ch) => ch.addEventListener('click', () => {
          filterMount.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
          ch.classList.add('active');
          const t = ch.getAttribute('data-tag');
          render(t === 'All' ? books : books.filter((b) => b.tag === t));
        }));
      }
    }
  }

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

  /* ---------------- Training (grouped by topic) ---------------- */
  async function hydrateTrainings() {
    const mount = document.querySelector('[data-trainings]');
    if (!mount || !EU.supabase || !EU.supabase.configured()) return;
    const rows = await EU.supabase.list('trainings', { order: 'sort_order' });
    if (!rows.length) return;

    // group by topic, preserving first-seen order
    const groups = []; const idx = {};
    rows.forEach((t) => {
      const key = (t.topic || 'Training').trim() || 'Training';
      if (idx[key] == null) { idx[key] = groups.length; groups.push({ topic: key, items: [] }); }
      groups[idx[key]].items.push(t);
    });

    mount.innerHTML = groups.map((g) => `
      <div class="training-topic">
        <div class="section-head"><span class="eyebrow">Topic</span><h2>${esc(g.topic)}</h2></div>
        <div class="grid grid-2">
          ${g.items.map(card).join('')}
        </div>
      </div>`).join('');

    function card(t) {
      return `<article class="card" style="padding:0;overflow:hidden">
        ${embedFor(t)}
        <div style="padding:1.2rem">
          <h3>${esc(t.title)}</h3>
          ${t.description ? `<p class="muted">${esc(t.description)}</p>` : ''}
        </div>
      </article>`;
    }
    function embedFor(t) {
      const u = t.video_url || '';
      const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
      const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (t.provider !== 'file' && yt) return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="${esc(t.title)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
      if (t.provider !== 'file' && vm) return `<div class="video-embed"><iframe src="https://player.vimeo.com/video/${vm[1]}" title="${esc(t.title)}" allow="autoplay;fullscreen;picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
      if (u) return `<div class="video-embed"><video src="${esc(u)}" controls preload="metadata"></video></div>`;
      return '';
    }
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
