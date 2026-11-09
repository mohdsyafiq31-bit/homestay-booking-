# Homestay Calendar (free hosting version)

A static website plus a free Supabase database. No server to run.
7 room types, check-in 2 pm, check-out 12 noon next day, income in MYR, live monthly total.

## Set up (about 10 minutes)
1. **Database.** Create a free project at supabase.com. Open SQL Editor, paste `schema.sql`, change `CHANGE-ME-PASSCODE` to your own staff passcode, and click Run.
2. **Connect.** In Supabase, open Project Settings, then API. Copy the Project URL and the public (anon or publishable) key into `config.js`.
3. **Publish this folder** on any free static host:
   - Netlify: drag the folder onto app.netlify.com/drop
   - Cloudflare Pages: Create project, Direct Upload
   - GitHub Pages: upload the files to a repository and turn on Pages
   - Vercel: import the repository, no build settings needed
4. **Share** the site link and the staff passcode in your WhatsApp group.

## How access works
- Anyone with the link can view the calendar and the income figures.
- Adding, changing income or cancelling needs the staff passcode, asked once per device.
- Double booking is blocked by the database.

## Install on a phone
Open the site over HTTPS. Android Chrome: menu, Install app. iPhone Safari: Share, Add to Home Screen.

## Good to know
- Free Supabase projects pause after about a week without activity. Open the Supabase dashboard and click Restore, and the data is still there.
- Use a strong passcode. Anyone who has it can edit every booking.
- To change the passcode: in Supabase run `update settings set value = 'new-passcode' where key = 'passcode';`
- To back up, export the `nights` table from the Supabase Table Editor.
