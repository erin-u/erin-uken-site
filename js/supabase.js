/* ---------------------------------------------------------------------------
   Thin Supabase helper. Loads the official client from CDN on demand and
   exposes a small API used by the public pages and the admin dashboard.

   Every function is safe to call when Supabase is NOT configured — it simply
   resolves to null / empty so pages can fall back to static content.
--------------------------------------------------------------------------- */
window.EU = window.EU || {};

(function () {
  const cfg = window.SITE_CONFIG || {};
  let clientPromise = null;

  function configured() {
    return !!(cfg.isConfigured && window.SITE_CONFIG.supabase.url && window.SITE_CONFIG.supabase.anonKey);
  }

  // Lazily load supabase-js v2 (UMD) once and create a single client.
  function getClient() {
    if (!configured()) return Promise.resolve(null);
    if (clientPromise) return clientPromise;
    clientPromise = new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve(makeClient());
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.async = true;
      s.onload = () => resolve(makeClient());
      s.onerror = () => reject(new Error('Could not load Supabase client'));
      document.head.appendChild(s);
    });
    return clientPromise;

    function makeClient() {
      return window.supabase.createClient(
        window.SITE_CONFIG.supabase.url,
        window.SITE_CONFIG.supabase.anonKey
      );
    }
  }

  const EU = window.EU;
  EU.supabase = {
    configured,
    getClient,

    /* ---- public reads ---- */
    async list(table, { order = 'sort_order', ascending = true, filters = {} } = {}) {
      const c = await getClient();
      if (!c) return [];
      let q = c.from(table).select('*');
      Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
      q = q.order(order, { ascending });
      const { data, error } = await q;
      if (error) { console.warn('[supabase] list', table, error.message); return []; }
      return data || [];
    },

    /* ---- inserts (public: contact + testimonial submissions) ---- */
    async insert(table, row) {
      const c = await getClient();
      if (!c) throw new Error('not-configured');
      const { data, error } = await c.from(table).insert(row).select();
      if (error) throw error;
      return data;
    },

    /* ---- auth (admin) ---- */
    async signIn(email, password) {
      const c = await getClient();
      if (!c) throw new Error('not-configured');
      const { data, error } = await c.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async signOut() { const c = await getClient(); if (c) await c.auth.signOut(); },
    async currentUser() {
      const c = await getClient(); if (!c) return null;
      const { data } = await c.auth.getUser();
      return data ? data.user : null;
    },

    /* ---- admin writes ---- */
    async upsert(table, row) {
      const c = await getClient(); if (!c) throw new Error('not-configured');
      const { data, error } = await c.from(table).upsert(row).select();
      if (error) throw error; return data;
    },
    async remove(table, id) {
      const c = await getClient(); if (!c) throw new Error('not-configured');
      const { error } = await c.from(table).delete().eq('id', id);
      if (error) throw error;
    },

    /* ---- storage ---- */
    async upload(bucket, file, onProgress) {
      const c = await getClient(); if (!c) throw new Error('not-configured');
      const safe = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${Date.now()}-${safe}`;
      const { error } = await c.storage.from(bucket).upload(path, file, {
        cacheControl: '3600', upsert: false
      });
      if (error) throw error;
      const { data } = c.storage.from(bucket).getPublicUrl(path);
      return { path, url: data.publicUrl };
    },
    async publicUrl(bucket, path) {
      const c = await getClient(); if (!c) return null;
      const { data } = c.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
    async removeFile(bucket, path) {
      const c = await getClient(); if (!c) return;
      await c.storage.from(bucket).remove([path]);
    }
  };
})();
