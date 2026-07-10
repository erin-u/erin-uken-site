/* ---------------------------------------------------------------------------
   Injects a single shared header + footer into every page so navigation is
   maintained in ONE place. Pages include:
     <div data-header data-active="about"></div>  ... and ... <div data-footer></div>
   Grouped dropdown nav so the growing page set stays tidy.
--------------------------------------------------------------------------- */
(function () {
  const p = location.pathname;
  const base = /\/(pages|admin)\//.test(p) ? '../' : '';

  // Single links: {id,label,href,soon?}; dropdowns: {id,label,children:[[id,label,href]...]}
  const NAV = [
    { id: 'about', label: 'About', children: [
      ['about', 'About Me', 'pages/about.html'],
      ['degrees', 'Degrees & Certifications', 'pages/about.html#degrees'],
    ]},
    { id: 'services', label: 'Services', children: [
      ['ai', 'AI Consulting', 'pages/ai-consulting.html'],
      ['real-estate', 'Real Estate', 'pages/real-estate.html'],
      ['coaching', 'Coaching', 'pages/coaching.html'],
    ]},
    { id: 'work', label: 'Work', children: [
      ['portfolio', 'Portfolio', 'pages/portfolio.html'],
      ['academic', 'Academic Projects', 'pages/academic.html'],
      ['testimonials', 'Testimonials', 'pages/testimonials.html'],
    ]},
    { id: 'bookclub', label: 'Book Club', href: 'pages/book-club.html' },
    { id: 'store', label: 'Store', href: 'pages/store.html', soon: true },
    { id: 'training', label: 'Training', href: 'pages/training.html', soon: true },
  ];

  const SOCIAL = [
    ['Facebook', 'https://www.facebook.com/erin.uken'],
    ['Instagram', 'https://www.instagram.com/erinuken/'],
    ['LinkedIn', 'https://www.linkedin.com/in/erinuken/'],
    ['TikTok', 'https://www.tiktok.com/@erin.uken'],
    ['X', 'https://x.com/Erin_Uken'],
  ];

  function link(id, label, href, active, soon) {
    const badge = soon ? ' <span class="nav-soon">soon</span>' : '';
    return `<a href="${base}${href}"${id === active ? ' class="active"' : ''}>${label}${badge}</a>`;
  }

  function headerHTML(active) {
    const items = NAV.map((item) => {
      if (item.children) {
        const activeChild = item.children.some((c) => c[0] === active);
        const links = item.children.map(([id, label, href]) => link(id, label, href, active)).join('');
        return `<div class="has-dd">
          <button class="dd-toggle${activeChild ? ' active' : ''}" aria-haspopup="true">${item.label}</button>
          <div class="dropdown">${links}</div>
        </div>`;
      }
      return link(item.id, item.label, item.href, active, item.soon);
    }).join('');
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
          ${items}
          <a href="${base}pages/partners.html#donate" class="donate">Donate</a>
          <a href="${base}pages/contact.html" class="cta">Contact</a>
        </nav>
      </div>
    </header>`;
  }

  function footerHTML() {
    const explore = [
      ['About', 'pages/about.html'], ['AI Consulting', 'pages/ai-consulting.html'],
      ['Real Estate', 'pages/real-estate.html'], ['Coaching', 'pages/coaching.html'],
      ['Contact', 'pages/contact.html'],
    ].map(([l, h]) => `<a href="${base}${h}">${l}</a>`).join('');
    const work = [
      ['Portfolio', 'pages/portfolio.html'], ['Academic Projects', 'pages/academic.html'],
      ['Testimonials', 'pages/testimonials.html'], ['Book Club', 'pages/book-club.html'],
      ['Store', 'pages/store.html'], ['Training', 'pages/training.html'],
      ['Partners', 'pages/partners.html'],
    ].map(([l, h]) => `<a href="${base}${h}">${l}</a>`).join('');
    const social = SOCIAL.map(([l, h]) => `<a href="${h}" target="_blank" rel="noopener">${l}</a>`).join('');
    const email = (window.SITE_CONFIG && window.SITE_CONFIG.contactEmail) || 'erin@riveracedesigns.com';
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a class="brand" href="${base}index.html"><span class="brand-mark">EU</span><span style="color:#fff">Erin Uken</span></a>
            <p>Diagnose. Design. Transform. Scale. — helping growth-minded leaders build sustainable, independent businesses.</p>
            <div class="footer-social">${social}</div>
          </div>
          <div><h4>Explore</h4>${explore}</div>
          <div><h4>Work &amp; Resources</h4>${work}</div>
          <div>
            <h4>Get in touch</h4>
            <a href="mailto:${email}">${email}</a>
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
