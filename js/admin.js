/* ---------------------------------------------------------------------------
   Admin dashboard logic — auth gate + media uploads + content management.
   All data lives in Supabase (see supabase/schema.sql). Writes require an
   authenticated admin user; Row Level Security enforces this server-side.
--------------------------------------------------------------------------- */
(function () {
  const EU = window.EU;
  const cfg = window.SITE_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    if (!EU.supabase.configured()) { show('not-configured'); return; }
    const user = await EU.supabase.currentUser();
    if (user) enterDashboard(user); else show('login');

    $('login-form').addEventListener('submit', onLogin);
    $('signout').addEventListener('click', async () => { await EU.supabase.signOut(); location.reload(); });

    // Tabs
    document.querySelectorAll('.admin-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.admin-tabs button').forEach((x) => x.classList.remove('active'));
        document.querySelectorAll('.admin-panel').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        $('tab-' + b.dataset.tab).classList.add('active');
      });
    });

    // Forms
    $('upload-form').addEventListener('submit', onUpload);
    $('testi-form').addEventListener('submit', onSaveTestimonial);
    $('port-form').addEventListener('submit', onSavePortfolio);

    // Dropzone visuals
    const dz = $('dropzone'), fileInput = $('up-file');
    ['dragover', 'dragenter'].forEach((e) => dz.addEventListener(e, (ev) => { ev.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((e) => dz.addEventListener(e, () => dz.classList.remove('drag')));
    dz.addEventListener('drop', (ev) => { ev.preventDefault(); if (ev.dataTransfer.files.length) fileInput.files = ev.dataTransfer.files; });
  }

  function show(id) { ['not-configured', 'login', 'dashboard'].forEach((x) => $(x).classList.toggle('hidden', x !== id)); }

  async function onLogin(e) {
    e.preventDefault();
    const status = $('login-status');
    status.textContent = 'Signing in…'; status.className = 'status';
    try {
      const { user } = await EU.supabase.signIn($('login-email').value.trim(), $('login-password').value);
      enterDashboard(user);
    } catch (err) {
      status.textContent = err.message || 'Sign in failed.'; status.className = 'status err';
    }
  }

  function enterDashboard(user) {
    show('dashboard');
    $('session-bar').classList.remove('hidden');
    $('who').textContent = user && user.email ? user.email : 'Signed in';
    loadMedia(); loadTestimonials(); loadPortfolio(); loadContacts();
  }

  /* ---------------- Media ---------------- */
  async function onUpload(e) {
    e.preventDefault();
    const status = $('upload-status');
    const file = $('up-file').files[0];
    if (!file) { status.textContent = 'Choose a file first.'; status.className = 'status err'; return; }
    const kind = $('up-kind').value;
    const bucket = kind === 'document' ? cfg.storage.documentsBucket : cfg.storage.mediaBucket;
    status.textContent = 'Uploading…'; status.className = 'status';
    try {
      const { path, url } = await EU.supabase.upload(bucket, file);
      await EU.supabase.insert('media_assets', {
        title: $('up-title').value.trim() || file.name,
        kind, bucket, path, url
      });
      $('upload-form').reset();
      status.textContent = 'Uploaded!'; status.className = 'status ok';
      loadMedia();
    } catch (err) {
      status.textContent = err.message || 'Upload failed.'; status.className = 'status err';
    }
  }

  async function loadMedia() {
    const rows = await EU.supabase.list('media_assets', { order: 'created_at', ascending: false });
    const tb = $('media-rows');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">No media yet.</td></tr>'; return; }
    tb.innerHTML = rows.map((m) => `<tr>
      <td>${m.kind === 'image' ? `<img src="${esc(m.url)}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px">`
        : m.kind === 'video' ? '🎬' : '📄'}</td>
      <td>${esc(m.title)}<br><a href="${esc(m.url)}" target="_blank" rel="noopener" class="muted" style="font-size:.8rem">open</a></td>
      <td><span class="badge">${esc(m.kind)}</span></td>
      <td><button class="btn btn-danger btn-sm" data-del-media="${m.id}" data-bucket="${esc(m.bucket)}" data-path="${esc(m.path)}">Delete</button></td>
    </tr>`).join('');
    tb.querySelectorAll('[data-del-media]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this file?')) return;
      await EU.supabase.removeFile(b.dataset.bucket, b.dataset.path);
      await EU.supabase.remove('media_assets', b.dataset.delMedia);
      loadMedia();
    }));
  }

  /* ---------------- Testimonials ---------------- */
  async function onSaveTestimonial(e) {
    e.preventDefault();
    const status = $('testi-status');
    try {
      await EU.supabase.insert('testimonials', {
        author: $('te-author').value.trim(), role: $('te-role').value.trim(),
        rating: Number($('te-rating').value), quote: $('te-quote').value.trim(),
        approved: $('te-approved').checked, sort_order: Number($('te-sort').value) || 0
      });
      $('testi-form').reset();
      status.textContent = 'Saved!'; status.className = 'status ok';
      loadTestimonials();
    } catch (err) { status.textContent = err.message; status.className = 'status err'; }
  }

  async function loadTestimonials() {
    const rows = await EU.supabase.list('testimonials', { order: 'sort_order' });
    const tb = $('testi-rows');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="5" class="muted">No testimonials yet.</td></tr>'; return; }
    tb.innerHTML = rows.map((t) => `<tr>
      <td>${esc(t.author)}<br><span class="muted" style="font-size:.8rem">${esc(t.role || '')}</span></td>
      <td>${esc(t.quote)}</td>
      <td>${'★'.repeat(t.rating || 5)}</td>
      <td>${t.approved ? '<span class="badge">live</span>' : '<span class="muted">pending</span>'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" data-toggle="${t.id}" data-approved="${t.approved ? 1 : 0}">${t.approved ? 'Unpublish' : 'Approve'}</button>
        <button class="btn btn-danger btn-sm" data-del-testi="${t.id}">Delete</button>
      </td></tr>`).join('');
    tb.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
      await EU.supabase.upsert('testimonials', { id: b.dataset.toggle, approved: b.dataset.approved !== '1' });
      loadTestimonials();
    }));
    tb.querySelectorAll('[data-del-testi]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this testimonial?')) return;
      await EU.supabase.remove('testimonials', b.dataset.delTesti); loadTestimonials();
    }));
  }

  /* ---------------- Portfolio ---------------- */
  async function onSavePortfolio(e) {
    e.preventDefault();
    const status = $('port-status');
    try {
      await EU.supabase.insert('portfolio_items', {
        title: $('po-title').value.trim(), tag: $('po-tag').value.trim(),
        description: $('po-desc').value.trim(), image_url: $('po-image').value.trim() || null,
        link_url: $('po-link').value.trim() || null, category: $('po-category').value,
        sort_order: Number($('po-sort').value) || 0
      });
      $('port-form').reset();
      status.textContent = 'Saved!'; status.className = 'status ok';
      loadPortfolio();
    } catch (err) { status.textContent = err.message; status.className = 'status err'; }
  }

  async function loadPortfolio() {
    const rows = await EU.supabase.list('portfolio_items', { order: 'sort_order' });
    const tb = $('port-rows');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">No portfolio items yet.</td></tr>'; return; }
    tb.innerHTML = rows.map((p) => `<tr>
      <td>${esc(p.title)}</td><td>${esc(p.tag || '')}</td><td><span class="badge">${esc(p.category || 'general')}</span></td>
      <td><button class="btn btn-danger btn-sm" data-del-port="${p.id}">Delete</button></td>
    </tr>`).join('');
    tb.querySelectorAll('[data-del-port]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this item?')) return;
      await EU.supabase.remove('portfolio_items', b.dataset.delPort); loadPortfolio();
    }));
  }

  /* ---------------- Contacts ---------------- */
  async function loadContacts() {
    const rows = await EU.supabase.list('contact_submissions', { order: 'created_at', ascending: false });
    const tb = $('contact-rows');
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="5" class="muted">No submissions yet.</td></tr>'; return; }
    tb.innerHTML = rows.map((c) => `<tr>
      <td>${esc(c.first_name)} ${esc(c.last_name)}</td>
      <td><a href="mailto:${esc(c.email)}">${esc(c.email)}</a><br><span class="muted">${esc(c.phone || '')}</span></td>
      <td>${esc(c.interest || '')}</td>
      <td>${esc(c.message || '')}</td>
      <td class="muted" style="font-size:.8rem">${c.marketing_email_opt_in ? '✉️' : ''} ${c.marketing_text_opt_in ? '💬' : ''} ${c.california_opt_in ? 'CA' : ''}</td>
    </tr>`).join('');
  }
})();
