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

  // Editing state + row caches (so an existing item can be loaded into its form).
  const editingId = { port: null, book: null, testi: null, train: null };
  let portCache = [], bookCache = [], testiCache = [], trainCache = [];
  const submitBtn = (formId) => document.querySelector('#' + formId + ' button[type="submit"]');
  function setMode(key, formId, on) {
    editingId[key] = on || null;
    const b = submitBtn(formId); if (b) b.textContent = on ? 'Update' : 'Save';
  }

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
    $('book-form').addEventListener('submit', onSaveBook);
    $('train-form').addEventListener('submit', onSaveTraining);

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
    loadMedia(); loadTestimonials(); loadPortfolio(); loadBooks(); loadTrainings(); loadContacts();
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
      <td>
        <button class="btn btn-ghost btn-sm" data-rename-media="${m.id}" data-title="${esc(m.title || '')}">Rename</button>
        <button class="btn btn-danger btn-sm" data-del-media="${m.id}" data-bucket="${esc(m.bucket)}" data-path="${esc(m.path)}">Delete</button>
      </td>
    </tr>`).join('');
    tb.querySelectorAll('[data-rename-media]').forEach((b) => b.addEventListener('click', async () => {
      const next = prompt('Edit the title / caption:', b.dataset.title);
      if (next == null) return;
      await EU.supabase.upsert('media_assets', { id: b.dataset.renameMedia, title: next.trim() });
      loadMedia();
    }));
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
      const row = {
        author: $('te-author').value.trim(), role: $('te-role').value.trim(),
        rating: Number($('te-rating').value), quote: $('te-quote').value.trim(),
        approved: $('te-approved').checked, sort_order: Number($('te-sort').value) || 0
      };
      if (editingId.testi) row.id = editingId.testi;
      await EU.supabase.upsert('testimonials', row);
      $('testi-form').reset(); setMode('testi', 'testi-form', null);
      status.textContent = 'Saved!'; status.className = 'status ok';
      loadTestimonials();
    } catch (err) { status.textContent = err.message; status.className = 'status err'; }
  }

  async function loadTestimonials() {
    testiCache = await EU.supabase.list('testimonials', { order: 'sort_order' });
    const tb = $('testi-rows');
    if (!testiCache.length) { tb.innerHTML = '<tr><td colspan="5" class="muted">No testimonials yet.</td></tr>'; return; }
    tb.innerHTML = testiCache.map((t) => `<tr>
      <td>${esc(t.author)}<br><span class="muted" style="font-size:.8rem">${esc(t.role || '')}</span></td>
      <td>${esc(t.quote)}</td>
      <td>${'★'.repeat(t.rating || 5)}</td>
      <td>${t.approved ? '<span class="badge">live</span>' : '<span class="muted">pending</span>'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" data-edit-testi="${t.id}">Edit</button>
        <button class="btn btn-ghost btn-sm" data-toggle="${t.id}" data-approved="${t.approved ? 1 : 0}">${t.approved ? 'Unpublish' : 'Approve'}</button>
        <button class="btn btn-danger btn-sm" data-del-testi="${t.id}">Delete</button>
      </td></tr>`).join('');
    tb.querySelectorAll('[data-edit-testi]').forEach((b) => b.addEventListener('click', () => {
      const t = testiCache.find((x) => x.id === b.dataset.editTesti); if (!t) return;
      $('te-author').value = t.author || ''; $('te-role').value = t.role || '';
      $('te-rating').value = String(t.rating || 5); $('te-quote').value = t.quote || '';
      $('te-approved').checked = !!t.approved; $('te-sort').value = t.sort_order || 0;
      setMode('testi', 'testi-form', t.id);
      $('testi-status').textContent = 'Editing “' + (t.author || 'testimonial') + '” — change fields and click Update.';
      $('testi-status').className = 'status';
      $('testi-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
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
    status.textContent = 'Saving…'; status.className = 'status';
    try {
      let image_url = $('po-image').value.trim() || null;
      let link_url = $('po-link').value.trim() || null;
      const imgFile = $('po-image-file').files[0];
      const docFile = $('po-doc-file').files[0];

      if (imgFile) {
        status.textContent = 'Uploading image…';
        image_url = (await EU.supabase.upload(cfg.storage.mediaBucket, imgFile)).url;
      }
      if (docFile) {
        status.textContent = 'Uploading attachment…';
        const bucket = docFile.type.startsWith('image/') ? cfg.storage.mediaBucket : cfg.storage.documentsBucket;
        link_url = (await EU.supabase.upload(bucket, docFile)).url;
      }

      const row = {
        title: $('po-title').value.trim(), tag: $('po-tag').value.trim(),
        description: $('po-desc').value.trim(), image_url, link_url,
        category: $('po-category').value, sort_order: Number($('po-sort').value) || 0
      };
      if (editingId.port) row.id = editingId.port;
      await EU.supabase.upsert('portfolio_items', row);
      $('port-form').reset(); setMode('port', 'port-form', null);
      status.textContent = 'Saved!'; status.className = 'status ok';
      loadPortfolio();
    } catch (err) { status.textContent = err.message || 'Save failed.'; status.className = 'status err'; }
  }

  async function loadPortfolio() {
    portCache = await EU.supabase.list('portfolio_items', { order: 'sort_order' });
    const tb = $('port-rows');
    if (!portCache.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">No portfolio items yet.</td></tr>'; return; }
    tb.innerHTML = portCache.map((p) => `<tr>
      <td>${esc(p.title)}</td><td>${esc(p.tag || '')}</td><td><span class="badge">${esc(p.category || 'general')}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" data-edit-port="${p.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del-port="${p.id}">Delete</button>
      </td>
    </tr>`).join('');
    tb.querySelectorAll('[data-edit-port]').forEach((b) => b.addEventListener('click', () => {
      const p = portCache.find((x) => x.id === b.dataset.editPort); if (!p) return;
      $('po-title').value = p.title || ''; $('po-tag').value = p.tag || '';
      $('po-desc').value = p.description || ''; $('po-image').value = p.image_url || '';
      $('po-link').value = p.link_url || ''; $('po-category').value = p.category || 'general';
      $('po-sort').value = p.sort_order || 0;
      setMode('port', 'port-form', p.id);
      $('port-status').textContent = 'Editing “' + (p.title || 'item') + '” — change fields and click Update.';
      $('port-status').className = 'status';
      $('port-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    tb.querySelectorAll('[data-del-port]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this item?')) return;
      await EU.supabase.remove('portfolio_items', b.dataset.delPort); loadPortfolio();
    }));
  }

  /* ---------------- Book Club ---------------- */
  async function onSaveBook(e) {
    e.preventDefault();
    const status = $('book-status');
    status.textContent = 'Saving…'; status.className = 'status';
    try {
      let image_url = $('bk-image').value.trim() || null;
      const imgFile = $('bk-image-file').files[0];
      if (imgFile) {
        status.textContent = 'Uploading cover…';
        image_url = (await EU.supabase.upload(cfg.storage.mediaBucket, imgFile)).url;
      }
      const row = {
        title: $('bk-title').value.trim(), author: $('bk-author').value.trim() || null,
        note: $('bk-note').value.trim() || null, tag: $('bk-tag').value.trim() || null,
        kind: $('bk-kind').value, image_url, buy_url: $('bk-buy').value.trim() || null,
        sort_order: Number($('bk-sort').value) || 0
      };
      if (editingId.book) row.id = editingId.book;
      await EU.supabase.upsert('books', row);
      $('book-form').reset(); setMode('book', 'book-form', null);
      status.textContent = 'Saved!'; status.className = 'status ok';
      loadBooks();
    } catch (err) { status.textContent = err.message || 'Save failed.'; status.className = 'status err'; }
  }

  async function loadBooks() {
    bookCache = await EU.supabase.list('books', { order: 'sort_order' });
    const tb = $('book-rows');
    if (!bookCache.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">No books yet.</td></tr>'; return; }
    tb.innerHTML = bookCache.map((b) => `<tr>
      <td>${esc(b.title)}${b.author ? `<br><span class="muted" style="font-size:.8rem">by ${esc(b.author)}</span>` : ''}</td>
      <td>${b.tag ? `<span class="badge">${esc(b.tag)}</span>` : ''}</td>
      <td>${esc(b.kind || 'book')}</td>
      <td>
        <button class="btn btn-ghost btn-sm" data-edit-book="${b.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del-book="${b.id}">Delete</button>
      </td>
    </tr>`).join('');
    tb.querySelectorAll('[data-edit-book]').forEach((btn) => btn.addEventListener('click', () => {
      const b = bookCache.find((x) => x.id === btn.dataset.editBook); if (!b) return;
      $('bk-title').value = b.title || ''; $('bk-author').value = b.author || '';
      $('bk-note').value = b.note || ''; $('bk-tag').value = b.tag || '';
      $('bk-kind').value = b.kind || 'book'; $('bk-image').value = b.image_url || '';
      $('bk-buy').value = b.buy_url || ''; $('bk-sort').value = b.sort_order || 0;
      setMode('book', 'book-form', b.id);
      $('book-status').textContent = 'Editing “' + (b.title || 'item') + '” — change fields and click Update.';
      $('book-status').className = 'status';
      $('book-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    tb.querySelectorAll('[data-del-book]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm('Delete this book?')) return;
      await EU.supabase.remove('books', btn.dataset.delBook); loadBooks();
    }));
  }

  /* ---------------- Training ---------------- */
  function detectProvider(url) {
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/vimeo\.com/i.test(url)) return 'vimeo';
    return 'file';
  }

  async function onSaveTraining(e) {
    e.preventDefault();
    const status = $('train-status');
    status.textContent = 'Saving…'; status.className = 'status';
    try {
      let video_url = $('tr-url').value.trim() || null;
      let provider = video_url ? detectProvider(video_url) : 'file';
      const file = $('tr-file').files[0];
      if (file) {
        status.textContent = 'Uploading video…';
        video_url = (await EU.supabase.upload(cfg.storage.mediaBucket, file)).url;
        provider = 'file';
      }
      if (!video_url) { status.textContent = 'Add a YouTube/Vimeo link or a file.'; status.className = 'status err'; return; }
      const row = {
        topic: $('tr-topic').value.trim() || null, title: $('tr-title').value.trim(),
        description: $('tr-desc').value.trim() || null, video_url, provider,
        sort_order: Number($('tr-sort').value) || 0
      };
      if (editingId.train) row.id = editingId.train;
      await EU.supabase.upsert('trainings', row);
      $('train-form').reset(); setMode('train', 'train-form', null);
      status.textContent = 'Saved!'; status.className = 'status ok';
      loadTrainings();
    } catch (err) { status.textContent = err.message || 'Save failed.'; status.className = 'status err'; }
  }

  async function loadTrainings() {
    trainCache = await EU.supabase.list('trainings', { order: 'sort_order' });
    const tb = $('train-rows');
    if (!trainCache.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">No training videos yet.</td></tr>'; return; }
    tb.innerHTML = trainCache.map((t) => `<tr>
      <td>${esc(t.topic || '—')}</td>
      <td>${esc(t.title)}</td>
      <td><span class="badge">${esc(t.provider || 'file')}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" data-edit-train="${t.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del-train="${t.id}">Delete</button>
      </td>
    </tr>`).join('');
    tb.querySelectorAll('[data-edit-train]').forEach((b) => b.addEventListener('click', () => {
      const t = trainCache.find((x) => x.id === b.dataset.editTrain); if (!t) return;
      $('tr-topic').value = t.topic || ''; $('tr-title').value = t.title || '';
      $('tr-desc').value = t.description || ''; $('tr-sort').value = t.sort_order || 0;
      $('tr-url').value = t.provider === 'file' ? '' : (t.video_url || '');
      setMode('train', 'train-form', t.id);
      $('train-status').textContent = 'Editing “' + (t.title || 'video') + '” — change fields and click Update.';
      $('train-status').className = 'status';
      $('train-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    tb.querySelectorAll('[data-del-train]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Delete this training video?')) return;
      await EU.supabase.remove('trainings', b.dataset.delTrain); loadTrainings();
    }));
  }

  /* ---------------- Contacts ---------------- */
  let contactRows = [];
  async function loadContacts() {
    contactRows = await EU.supabase.list('contact_submissions', { order: 'created_at', ascending: false });
    const tb = $('contact-rows');
    if (!contactRows.length) { tb.innerHTML = '<tr><td colspan="7" class="muted">No submissions yet.</td></tr>'; return; }
    tb.innerHTML = contactRows.map((c) => `<tr>
      <td class="muted" style="white-space:nowrap">${fmtDate(c.created_at)}</td>
      <td>${esc(c.first_name)} ${esc(c.last_name)}</td>
      <td><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></td>
      <td style="white-space:nowrap">${esc(c.phone || '')}</td>
      <td>${esc(c.interest || '')}</td>
      <td>${esc(c.message || '')}</td>
      <td class="muted" style="font-size:.8rem">${c.marketing_email_opt_in ? 'Email' : ''}${c.marketing_text_opt_in ? ' · Text' : ''}${c.california_opt_in ? ' · CA' : ''}</td>
    </tr>`).join('');
  }

  function fmtDate(s) {
    if (!s) return '';
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric' });
  }

  // Export all contact submissions to a CSV file (importable into any CRM).
  function exportContactsCSV() {
    if (!contactRows.length) { alert('No submissions to export yet.'); return; }
    const cols = ['created_at', 'first_name', 'last_name', 'email', 'phone', 'interest', 'message',
      'marketing_email_opt_in', 'marketing_text_opt_in', 'california_opt_in'];
    const cell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const csv = [cols.join(',')]
      .concat(contactRows.map((r) => cols.map((k) => cell(r[k])).join(',')))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'erin-uken-contacts.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const exportBtn = document.getElementById('export-contacts');
  if (exportBtn) exportBtn.addEventListener('click', exportContactsCSV);
})();
