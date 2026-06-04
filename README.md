# iColors Professional Document Access Portal

A premium, modern SaaS-style web application for secure corporate document sharing, lead generation, and access analytics.

---

## Key Features
- **Lead Capture & Verification**: Full name, business email, and phone validation.
- **Google Sheets Database**: Completely serverless backend utilizing Google Sheets as a database and Apps Script as the API.
- **Branded Email Automation**: Automated response emails containing tokenized access links.
- **Analytics & CRUD Dashboard**: Live lead volume tracking, conversion rates, logs, and a UI manager to add/edit shared documents.
- **Responsive Aesthetics**: Premium dark/light themes, glassmorphism, responsive grids, and micro-animations.
- **CORS Bypassing Architecture**: Designed to interact with Google Sheets APIs directly from Vercel, Netlify, or local environments without CORS errors.

---

## Folder Directory Structure
```text
icolors-Professional Document Access Portal with Lead Capture/
│
├── index.html       # Landing page containing the lead capture form
├── portal.html      # Document portal (authenticated with query token)
├── admin.html       # Admin Panel dashboard (analytics, leads, CRUD docs, logs)
│
├── style.css        # Premium stylesheets (vars, animations, themes, layout)
├── app.js           # Shared utilities, validation, and local mock database
├── portal.js        # Portal page validation, rendering, and action logging
├── admin.js         # Admin authentication, dashboard renders, CSV exporter, CRUD
│
├── backend.js       # Google Apps Script code (copy-paste to Google Script editor)
└── README.md        # This setup documentation
```

---

## Part 1: Local Testing (Instant Setup)

The application features a built-in **Local Preview Mode** (Mock Database) that runs automatically when no live `API_URL` is configured in `app.js`.

1. Double-click [index.html](file:///c:/Users/Admin/Desktop/icolors-Professional%20Document%20Access%20Portal%20with%20Lead%20Capture/index.html) or run a local web server in the folder.
2. The site will display an orange banner at the top signaling it is in **Preview Mode**.
3. Register using the form: a mock token is generated, you will be redirected to the portal, and files will load.
4. Go to the Admin Panel (`admin.html`) and enter the passcode `admin123` to view mocked analytics, lead grids, access logs, and perform CRUD file updates. All data is persisted in your browser's `localStorage` for offline verification.

---

## Part 2: Live Backend Configuration (Google Sheets + Apps Script)

Follow these steps to replace the Mock Database with a live cloud-hosted Google Sheet database.

### Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Title it something like `iColors Leads Database`.
3. Note: You do not need to create columns or individual tabs manually; the script will handle this automatically.

### Step 2: Set up Apps Script
1. Inside your new Google Sheet, go to **Extensions** -> **Apps Script** in the top menu bar.
2. In the Apps Script project editor, delete any boilerplate code (like `function myFunction() {}`).
3. Open [backend.js](file:///c:/Users/Admin/Desktop/icolors-Professional%20Document%20Access%20Portal%20with%20Lead%20Capture/backend.js), copy the entire file contents, and paste it into the script editor.

### Step 3: Configure Apps Script Variables
At the top of the pasted script in the Apps Script editor, customize the following variables:
- `ADMIN_PASSCODE`: Set your desired passcode for the admin login (e.g. `"mySecret123"`).
- `SUPPORT_EMAIL`: Set the support contact email displayed in your automated emails.
- `FRONTEND_PORTAL_URL`: *Skip this for now.* Once you host your website (on Vercel/Netlify/etc.), update this variable with the URL pointing to your `portal.html` page (e.g. `https://my-icolors-portal.vercel.app/portal.html`).

### Step 4: Run Initial Setup
1. In the Apps Script editor toolbar, select the `setupDatabase` function from the dropdown list.
2. Click **Run**.
3. A prompt will appear asking for authorization permissions. Click **Review Permissions**, select your Google account, click **Advanced**, click **Go to Untitled project (unsafe)**, and select **Allow**.
4. The execution log will print: `Database Setup Completed Successfully!`. Return to your Google Sheet; you will now see three sheets (`Leads`, `Access Logs`, `Documents`) formatted with column headers and three prepopulated files.

### Step 5: Deploy the Web App API
1. In the upper-right corner of the Apps Script editor, click **Deploy** -> **New deployment**.
2. Click the gear icon (**Select type**) next to "Configuration" and select **Web app**.
3. Fill out the configuration fields:
   - **Description**: `iColors Document Portal API v1`
   - **Execute as**: `Me (your-email@gmail.com)` (This grants the script permission to write to your sheet and send emails on your behalf).
   - **Who has access**: **Anyone** (This is critical: selecting anyone allows the frontend browser code to send requests to the API without Google login screens).
4. Click **Deploy**.
5. Once deployed, copy the **Web app URL** (looks like `https://script.google.com/macros/s/.../exec`).

---

## Part 3: Connect Frontend to the Web App

1. Open [app.js](file:///c:/Users/Admin/Desktop/icolors-Professional%20Document%20Access%20Portal%20with%20Lead%20Capture/app.js) in your text editor.
2. Find the `CONFIG` object near the top of the file:
   ```javascript
   const CONFIG = {
     // Replace with your Google Apps Script Web App URL once deployed
     API_URL: "",
     DEFAULT_ADMIN_PASSCODE: "admin123"
   };
   ```
3. Paste the copied Web App URL inside the empty `API_URL` quotes, for example:
   ```javascript
   const CONFIG = {
     API_URL: "https://script.google.com/macros/s/AKfycbwX_EXAMPLE_URL/exec",
     DEFAULT_ADMIN_PASSCODE: "admin123" // Must match ADMIN_PASSCODE in backend.js
   };
   ```
4. Save the file.
5. Launch `index.html` again. The orange preview banner will disappear; the website is now connected to your live Google Sheet database! Submitting registrations will save rows, send branded emails, and check portal logins in the cloud.

---

## Part 4: Host the Website (Vercel, Netlify, or GitHub Pages)

Deploy your HTML, CSS, and JS files to a hosting platform.

### Deploying to Vercel
1. Install the Vercel CLI (`npm install -g vercel`) or sign up at [vercel.com](https://vercel.com).
2. Open a terminal in your project directory.
3. Run `vercel` and follow the prompts (default settings are perfect).
4. Vercel will output a live URL (e.g. `https://icolors-project.vercel.app`).
5. Copy this URL, open **Apps Script** editor, update `FRONTEND_PORTAL_URL` at the top of the file:
   `var FRONTEND_PORTAL_URL = "https://icolors-project.vercel.app/portal.html";`
6. Click **Deploy** -> **Manage deployments** -> **Edit** (pencil icon) -> select **New version** -> **Deploy**. (Crucial: Google Apps Script Web App changes do not take effect until you deploy a new version!).

---

## Security Implementation Summary
- **No Raw URL Exposure**: Direct Google Drive URLs are never loaded by the frontend landing page. They are only fetched from the database after a cryptographically secure token has been validated.
- **Encrypted Transfers**: All database updates run over HTTPS Web App channels.
- **Access Guard**: Custom redirection logic automatically locks out users attempting to open `portal.html` or `admin.html` directly without a valid active session.
