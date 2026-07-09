/* ---------------------------------------------------------------------------
   Injects a single shared header + footer into every page so navigation is
   maintained in ONE place. Pages include:
     <div data-header data-active="about"></div>  ... and ... <div data-footer></div>
   A <noscript> fallback nav lives in each page for no-JS robustness.
--------------------------------------------------------------------------- */
(function () {
  // Work out the path back to the site root ("" from root, "../" from /pages/).
  const p = location.pathname;
  const base = /\/(pages|admin)\//.test(p) ? '../' : '';

  const NAV = [
    ['about',        'About',        'pages/about.html'],
    ['ai',           'AI Consulting','pages/ai-consulting.html'],
    ['real-estate',  'Real Estate',  'pages/real-estate.html'],
    ['coaching',     'Coaching',     'pages/coaching.html'],
    ['portfolio',    'Portfolio',    'pages/portfolio.html'],
    ['testimonials', 'Testimonials', 'pages/testimonials.html']
  ];

  const SOCIAL = [
    ['Facebook',  'https://www.facebook.com/erin.uken'],
    ['Instagram', 'https://www.instagram.com/erinuken/'],
    ['LinkedIn',  'https://www.linkedin.com/in/erinuken/'],
    ['TikTok',    'https://www.tiktok.com/@erin.uken'],
    ['X',         'https://x.com/Erin_Uken']
  ];

  function headerHTML(active) {
    const links = NAV.map(([id, label, href]) =>
      `<a href="${base}${href}"${id === active ? ' class="active"' : ''}>${label}</a>`
    ).join('');
    return `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="container header-row">
        <a class="brand" href="${base}index.html">
          <span class="brand-mark">EU</span>
          <span>Erin Uken<small>Growth &amp; Transformation Architect</small></span>
        </a>
        <button class="menu-toggle" aria-expanded="false" aria-label="Toggle navigation">&#9776;</button>
        <nav class="nav" aria-label="Main navigation">
          ${links}
          <a href="${base}pages/contact.html" class="cta">Contact</a>
        </nav>
      </div>
    </header>`;
  }

  function footerHTML() {
    const nav = NAV.concat([['contact','Contact','pages/contact.html']])
      .map(([, label, href]) => `<a href="${base}${href}">${label}</a>`).join('');
    const work = [
      ['Portfolio','pages/portfolio.html'],
      ['Academic Projects','pages/academic.html'],
      ['Testimonials','pages/testimonials.html'],
      ['eXp Realty Site','https://erinuken.exprealty.com/']
    ].map(([label, href]) => {
      const ext = /^https?:/.test(href);
      return `<a href="${ext ? href : base + href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    }).join('');
    const social = SOCIAL.map(([label, href]) =>
      `<a href="${href}" target="_blank" rel="noopener">${label}</a>`).join('');
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a class="brand" href="${base}index.html">
              <span class="brand-mark">EU</span>
              <span style="color:#fff">Erin Uken</span>
            </a>
            <p>Diagnose. Design. Transform. Scale. — helping growth-minded leaders build sustainable, independent businesses.</p>
            <div class="footer-social">${social}</div>
          </div>
          <div>
            <h4>Explore</h4>
            ${nav}
          </div>
          <div>
            <h4>Work</h4>
            ${work}
          </div>
          <div>
            <h4>Get in touch</h4>
            <a href="mailto:${(window.SITE_CONFIG && window.SITE_CONFIG.contactEmail) || 'erin@riveracedesigns.com'}">${(window.SITE_CONFIG && window.SITE_CONFIG.contactEmail) || 'erin@riveracedesigns.com'}</a>
            <a href="${base}pages/contact.html">Start a conversation</a>
            <a href="https://erinuken.exprealty.com/" target="_blank" rel="noopener">Real estate with eXp</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; <span data-year></span> Erin Uken. All rights reserved.</span>
          <span>Technology evolves. People endure. Small businesses lead.</span>
        </div>
      </div>
    </footer>`;
  }

  document.querySelectorAll('[data-header]').forEach((el) => {
    el.outerHTML = headerHTML(el.getAttribute('data-active') || '');
  });
  document.querySelectorAll('[data-footer]').forEach((el) => {
    el.outerHTML = footerHTML();
  });
})();
