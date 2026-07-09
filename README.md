# Erin Uken — erinuken.com

Personal brand website for **Erin Uken, Growth & Transformation Architect** —
*Diagnose. Design. Transform. Scale.*

It showcases who Erin is (Vision, Mission, Values) and what she does — **AI
business coaching & consulting (Radical AI Shift)**, **real estate**, and
**peer-to-peer coaching** — plus a portfolio, academic projects, testimonials,
and a contact form. A lightweight **admin dashboard** lets Erin upload
documents/images/videos and manage testimonials, portfolio items, and contact
submissions.

## Structure

```
index.html            Home
pages/                 about · ai-consulting · real-estate · coaching
                       portfolio · academic · testimonials · contact
admin/                 Password-protected admin dashboard
js/
  partials.js          Shared header + footer (edit nav in ONE place)
  supabase.js          Supabase client helper (loaded from CDN)
  main.js              Site behaviour + dynamic content hydration
  admin.js             Admin dashboard logic
config.js              Supabase keys + settings  ← EDIT THIS
styles.css             Brand design system (teal/magenta, Montserrat)
supabase/schema.sql    Database tables, security policies, storage buckets
assets/                Logo, favicon, artwork
```

The site works **with no backend** — it shows built-in fallback content and the
forms display a friendly "not connected yet" message. Connect Supabase to turn
on uploads, dynamic content, and form submissions.

## Brand

- **Teal** `#08B4B7` / Aqua `#0cc0df` (primary, ~80%) · **Magenta** `#E83E8C` (accent, ~20%)
- Headings **Montserrat**, body **Calibri** (with web-safe fallbacks)
- White + light-gray backgrounds, black text

## Connect the backend (Supabase — free)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   This creates the tables, security policies, and the `media` + `documents` storage buckets.
3. **Storage** → confirm the `media` and `documents` buckets exist and are **Public**.
4. **Authentication → Users → Add user** → create Erin's admin email + password.
   (Optional: Authentication → Providers → turn *off* public sign-ups so only invited admins exist.)
5. **Project Settings → API** → copy the **Project URL** and **anon public key**.
6. Paste them into [`config.js`](config.js):
   ```js
   supabase: {
     url: 'https://YOUR_PROJECT_REF.supabase.co',
     anonKey: 'YOUR_SUPABASE_ANON_KEY'
   }
   ```
7. Commit & push. Done — forms save, and `/admin/` lets you upload and manage content.

> The anon key is safe to expose publicly; Row Level Security (in `schema.sql`)
> ensures the public can only submit the contact form, submit testimonials
> (held for review), and read approved/published content. All uploads and
> management require your authenticated admin login.

## The admin dashboard (`/admin/`)

Sign in with the Supabase user you created. From there you can:

- **Media & documents** — upload images, video, and documents (drag & drop). Images/video appear in galleries; documents become downloads.
- **Testimonials** — add, approve/unpublish, or delete. Public submissions land here as *pending*.
- **Portfolio** — add/remove work (General or Academic), with optional image + link.
- **Contacts** — read every contact-form submission with opt-in flags.

## Local preview

Open `index.html` in a browser, or run a static server from this folder:

```bash
python3 -m http.server 8080   # then visit http://localhost:8080
```

## Deployment (GitHub Pages)

Already wired: pushing to `main` publishes via `.github/workflows/deploy.yml`.
The custom domain is set in `CNAME` (`erinuken.com`). In GitHub: **Settings →
Pages** → Source **GitHub Actions**, and add the custom domain under
**Settings → Pages → Custom domain** with the matching DNS records at your
registrar.

## Editing content

- **Navigation / footer:** `js/partials.js`
- **Page copy:** edit the relevant file in `pages/`
- **Colors / fonts / components:** `styles.css` (CSS variables at the top)
- **Dynamic content (testimonials, portfolio, media):** the admin dashboard
