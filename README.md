# Warning Report System

### City Environment and Natural Resources Office (CENRO)

### Environmental Enforcement Division

---

## About

This system was built by a lone developer within CENRO — an IT graduate with no prior professional experience in web development. It was created out of a practical need: to reduce paper consumption in the office and move toward a paperless workflow for environmental enforcement operations.

Instead of filling out physical warning report slips in the field, enforcers can now submit reports digitally through any device with a browser, capture the apprehended person's signature on-screen, attach photo evidence, and have everything stored and searchable in a central database. Reports can be exported to Excel at any time for official records or printing when needed.

---

## Tech Stack

- Node.js + Express — backend server and API
- MongoDB + Mongoose — database
- Vanilla HTML, CSS, JavaScript — frontend (no frameworks)

---

## Prerequisites

- Node.js v18 or higher — https://nodejs.org
- MongoDB running locally
  - Ubuntu/Debian: `sudo systemctl start mongod`
  - macOS (Homebrew): `brew services start mongodb-community`
  - Or use a remote MongoDB URI (update `.env` accordingly)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional)
#    Edit .env to set your MongoDB URI and preferred port
#    Defaults: mongodb://localhost:27017/warning_reports  |  port 3000

# 3. Start the server
npm start
```

Then open your browser at **http://localhost:PORT**.

This app creates its own database (`warning_reports`) and will not interfere with any existing databases on the same MongoDB instance.

---

## Pages

| URL        | Description                              |
| ---------- | ---------------------------------------- |
| `/`        | Submit a warning report                  |
| `/reports` | View, search, filter, and export reports |

---

## Features

**Report Form**

- Violation checkboxes: C.O 35-04, C.O 9-11, C.O 14-24 (A&B), C.O 14-24 (C-V/X/Y/Z), C.O 10-11, and Other with a text field
- Apprehended person with separate first name and last name fields, displayed as Last Name, First Name throughout the system
- Barangay selector covering all 21 barangays in the jurisdiction
- Environmental officer checkboxes listing all 24 officers
- Remarks field
- Signature canvas with touch and mouse support, preserved across scroll and screen resize on mobile
- Up to 2 photo uploads per report

**Reports View**

- Server-side pagination — only fetches the current page from the database, stays fast even at thousands of records
- Configurable page size (10, 25, 50, or 100 records per page)
- Search by first or last name with live result highlighting
- Filter by barangay, officer, violation type, and sort order
- All filters and search are processed by MongoDB, not the browser
- Active filter chips showing currently applied filters, each individually dismissible
- View full record details in a modal including signature and photos

**Excel Export**

- Export modal with independent date range selection, separate from the view filter
- Quick-select presets: Today, This Week, This Month, All Time
- Exported file includes all fields, violations listed as text, embedded signature image, and up to 2 embedded photos per row

---

## Data and Performance

Signatures and photos are compressed before being stored in MongoDB:

| Data      | Compression                                                    |
| --------- | -------------------------------------------------------------- |
| Signature | Resized to 400x150px, grayscale, PNG level 9 — approx. 5-15 KB |
| Photos    | Resized to max 800x800px, JPEG quality 40 — approx. 30-60 KB   |

The table API excludes signature and photo data entirely. Those fields are only loaded when opening an individual record in the detail modal. This ensures the reports table loads quickly regardless of how many records are in the database.

---

## Project Structure

```
warning-report/
├── server.js               # Express entry point
├── .env                    # Environment config (MongoDB URI, port)
├── models/
│   └── WarningReport.js    # Mongoose schema
├── routes/
│   └── reports.js          # All API routes and Excel export
└── public/
    ├── index.html          # Report submission form
    ├── reports.html        # Reports list and export page
    ├── css/
    │   ├── base.css        # Shared styles (header, nav, variables)
    │   ├── form.css        # Form page styles
    │   └── reports.css     # Reports page styles
    └── js/
        ├── form.js         # Form page logic
        └── reports.js      # Reports page logic (pagination, filters, export)
```

---

## Sharing with Enforcers

To give enforcers access via a public URL while the server runs locally:

- **ngrok**: `ngrok http PORT`
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:PORT`
- Or configure port forwarding on your router and share your public IP

Replace `PORT` with whatever port is set in your `.env` file.

---

## Vue 3 Frontend (Vite)

The frontend has been rewritten in Vue 3 with Vite. The backend (Node/Express/MongoDB) remains unchanged.

### Development workflow

Run both the Express server and Vite dev server at the same time in two separate terminals:

```bash
# Terminal 1 — Express API server
npm run dev:server

# Terminal 2 — Vite dev server with hot reload
npm run dev:client
```

Then open **http://localhost:5173** in your browser. The Vite dev server proxies all `/api` requests to Express on port 3000, so everything works together.

### Building for production

When you are ready to deploy or share with enforcers:

```bash
# Install all dependencies (run once)
npm run install:all

# Build the Vue app into /public
npm run build

# Start Express — it will serve the built Vue app
npm start
```

After building, enforcers access the app through Express on your configured port, exactly like before.

### Project structure (client)

```
client/
├── index.html              # Vite HTML entry point
├── vite.config.js          # Vite config (proxy, build output)
├── package.json
└── src/
    ├── main.js             # Vue app entry, router setup
    ├── App.vue             # Root component (header, toast)
    ├── style.css           # Global styles and CSS variables
    ├── composables/
    │   └── constants.js    # Shared data (barangays, officers, violations)
    ├── components/
    │   └── SignatureCanvas.vue
    └── views/
        ├── ReportForm.vue  # / route
        └── ReportsList.vue # /reports route
```
