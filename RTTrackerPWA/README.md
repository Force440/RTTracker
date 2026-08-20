# RT Tracker PWA

This is a static Progressive Web App version of RT Tracker. It works offline after the first successful load and stores entries on the device.

## Features
- Date-driven entry screen: today by default, any prior date back to 3/24/2026
- Pacific Time date handling regardless of travel
- Confirmation number, Phone/Email, Vacation/Excused, Test, Notes
- Sunday and U.S. federal/observed holiday automatic Excused status
- Monday-Friday weekly compliance
- Week excluded only if all five weekdays are Vacation/Excused
- Monthly phone compliance beginning with April 2026
- Test metrics including longest gap excluding explicit Vacation days
- History editing
- Weekly and monthly audit
- Full JSON backup/restore, including import of the native RT Tracker JSON backup
- CSV export
- Offline service worker and Home Screen icon

## Important: hosting
A PWA must be served over HTTPS. Do not open `index.html` directly from Files and expect installation/offline features to work.

### Easy deployment
Upload the contents of this folder to any static HTTPS host such as Cloudflare Pages, Netlify, GitHub Pages, or another static hosting provider.

After deployment on iPhone:
1. Open the HTTPS site in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Turn on Open as Web App if shown.
5. Tap Add.

## Moving current native-app data
In the native RT Tracker app, create a Full Backup and save the JSON file to iCloud Drive. In the PWA, open More → Restore Backup and select that same JSON file.

## Data safety
The active database is stored in the browser/app container on the iPhone. Make periodic Full Backups to iCloud Drive. The app also includes CSV export for viewing elsewhere.
