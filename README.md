# ExamBook Hub V3 — Advanced

## What's upgraded
- Premium professional Home page
- Hero section + animated exam ticker
- SSC / Railway / State / National group presentation
- Live library stats
- Search + exam filtering + sorting
- Professional About section
- Powered by Adarsh Shukla branding
- Admin dashboard for books/categories
- PDF + cover upload
- Supabase Auth + RLS + Storage
- Vercel-ready
- 106 starter exam categories

## Deployment
1. Extract the ZIP.
2. Create a Supabase project.
3. Open `supabase/schema.sql`.
4. Replace ALL `YOUR_ADMIN_EMAIL` values with the exact email you will use for the admin account.
5. Run the complete SQL.
6. Create that email/password in Supabase Authentication → Users.
7. Open `assets/config.js` and set:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY (public/anon/publishable key only)
   - ADMIN_EMAIL
8. Upload the project to a GitHub repository.
9. Import that GitHub repository into Vercel and deploy.
10. Open `/dashboard.html` to manage books and categories.

## Security
Never expose a Supabase service_role/secret key in frontend code.

## Content
Only upload PDFs/images you have permission to distribute. The site should not be used to distribute copyrighted books without authorization.
