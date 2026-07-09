/* ---------------------------------------------------------------------------
   Erin Uken — site configuration
   Fill these in after creating a free Supabase project (see README.md).
   Until then, the site runs on built-in static fallback content and forms
   show a friendly "not yet connected" message instead of failing.
--------------------------------------------------------------------------- */
window.SITE_CONFIG = {
  supabase: {
    url: 'https://nushqqvxubhfmwzmlswt.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51c2hxcXZ4dWJoZm13em1sc3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTM5NzAsImV4cCI6MjA5OTE4OTk3MH0.pWsBkihICHz8QlNsaqIV_XjTu4TDAfW9aN5tbV0BQM8'
  },
  storage: {
    mediaBucket: 'media',       // images + videos (public)
    documentsBucket: 'documents' // downloadable docs (public)
  },
  // Optional: page-level fallback contact email shown in the footer.
  contactEmail: 'erin@riveracedesigns.com'
};

// A project is "configured" only when real values have been supplied.
window.SITE_CONFIG.isConfigured =
  !/YOUR_PROJECT_REF|YOUR_SUPABASE_ANON_KEY/.test(
    window.SITE_CONFIG.supabase.url + window.SITE_CONFIG.supabase.anonKey
  );
