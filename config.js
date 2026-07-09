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
  contactEmail: 'erin@riveracedesigns.com',

  // Lead magnets: after someone submits the contact form, a thank-you popup
  // offers an instant resource matched to the interest they picked.
  // Replace the '#' links with the real book/PDF/course URL for each.
  leadMagnets: {
    'default': { title: 'My free starter guide', url: '#' },
    'AI consulting (Radical AI Shift)': { title: 'The Radical AI Shift — Starter Guide', url: '#' },
    'Real estate — buying': { title: 'The Confident Buyer’s Guide', url: '#' },
    'Real estate — selling': { title: 'The Smart Seller’s Playbook', url: '#' },
    'Peer-to-peer coaching': { title: 'Clarity in 5 Steps — Coaching Workbook', url: '#' },
    'Speaking / workshop': { title: 'Workshop &amp; Speaking One-Sheet', url: '#' },
    'Collaboration / other': { title: 'My free starter guide', url: '#' }
  }
};

// A project is "configured" only when real values have been supplied.
window.SITE_CONFIG.isConfigured =
  !/YOUR_PROJECT_REF|YOUR_SUPABASE_ANON_KEY/.test(
    window.SITE_CONFIG.supabase.url + window.SITE_CONFIG.supabase.anonKey
  );
