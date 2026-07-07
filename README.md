# Erin Uken Website

This folder contains a flexible website foundation for Erin Uken with pages for About, AI Consulting, Real Estate, Portfolio, Blog, and Contact.

## Local preview

Open the site by opening [index.html](index.html) in a browser, or serve the folder locally with a simple static server.

## GitHub Pages deployment

1. Create or connect a GitHub repository for this site.
2. Push the contents of this folder to the repository.
3. In GitHub, open Settings → Pages.
4. Select the main branch and the root folder as the source.
5. Save and wait for the site to publish.

## GoDaddy domain setup

1. In GoDaddy, add the GitHub Pages DNS records for your custom domain.
2. In GitHub Pages settings, add your custom domain.
3. Wait for DNS propagation and confirm the site is live.

## Supabase integration

1. Create a Supabase project.
2. Create a table named `contact_submissions` with columns for `name`, `email`, `message`, and `created_at`.
3. Replace the placeholder values in [config.js](config.js) with your Supabase URL and anon key.
4. Use the contact form to submit messages directly to Supabase.

## Structure notes

- Keep [styles.css](styles.css) and [script.js](script.js) in the same folder as [index.html](index.html).
- Add future landing pages under [pages](pages).
- Add photos and media in [assets](assets).
