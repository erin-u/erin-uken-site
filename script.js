document.addEventListener('DOMContentLoaded', function () {
  const savedContent = localStorage.getItem('erinUkenAdminContent');
  if (savedContent) {
    try {
      const parsed = JSON.parse(savedContent);
      const heroHeadline = document.getElementById('hero-headline');
      const heroText = document.getElementById('hero-text');
      const featuredQuote = document.getElementById('featured-quote');
      const featuredAuthor = document.getElementById('featured-author');
      const testimonialOne = document.getElementById('testimonial-one');
      const testimonialOneAuthor = document.getElementById('testimonial-one-author');
      const testimonialTwo = document.getElementById('testimonial-two');
      const testimonialTwoAuthor = document.getElementById('testimonial-two-author');
      if (heroHeadline && parsed.heroHeadline) heroHeadline.textContent = parsed.heroHeadline;
      if (heroText && parsed.heroText) heroText.textContent = parsed.heroText;
      if (featuredQuote && parsed.featuredTestimonial) featuredQuote.textContent = parsed.featuredTestimonial;
      if (featuredAuthor && parsed.featuredAuthor) featuredAuthor.textContent = parsed.featuredAuthor;
      if (testimonialOne && parsed.testimonialOne) testimonialOne.textContent = parsed.testimonialOne;
      if (testimonialOneAuthor && parsed.testimonialOneAuthor) testimonialOneAuthor.textContent = parsed.testimonialOneAuthor;
      if (testimonialTwo && parsed.testimonialTwo) testimonialTwo.textContent = parsed.testimonialTwo;
      if (testimonialTwoAuthor && parsed.testimonialTwoAuthor) testimonialTwoAuthor.textContent = parsed.testimonialTwoAuthor;
      const title = document.querySelector('title');
      if (title && parsed.pageTitle) title.textContent = parsed.pageTitle;
    } catch (error) {
      console.log('Admin content not loaded', error);
    }
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const year = document.getElementById('year');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open');
    });
  }

  const passwordForm = document.getElementById('portfolio-password-form');
  const portfolioContent = document.getElementById('portfolio-content');
  const passwordError = document.getElementById('password-error');

  if (passwordForm && portfolioContent) {
    passwordForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const password = document.getElementById('portfolio-password').value.trim();
      if (password === 'Erin2026') {
        portfolioContent.classList.remove('hidden');
        passwordError.classList.add('hidden');
        passwordForm.classList.add('hidden');
      } else {
        passwordError.classList.remove('hidden');
      }
    });
  }

  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');

  if (contactForm && formStatus && window.SUPABASE_CONFIG) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const payload = {
        first_name: document.getElementById('first_name').value.trim(),
        last_name: document.getElementById('last_name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        message: document.getElementById('message').value.trim(),
        marketing_email_opt_in: document.getElementById('marketing_email_opt_in').checked,
        marketing_text_opt_in: document.getElementById('marketing_text_opt_in').checked,
        california_opt_in: document.getElementById('california_opt_in').checked,
        created_at: new Date().toISOString()
      };

      fetch(`${window.SUPABASE_CONFIG.url}/rest/v1/${window.SUPABASE_CONFIG.table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': window.SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`
        },
        body: JSON.stringify(payload)
      })
        .then(function () {
          formStatus.textContent = 'Thanks! Your message has been received.';
          contactForm.reset();
        })
        .catch(function () {
          formStatus.textContent = 'The form is ready; add your Supabase credentials to enable submissions.';
        });
    });
  }
});
