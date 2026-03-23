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
- Vue 3 + Vite — frontend framework and build tool
- Vue Router — client-side navigation

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
# 1. Install all dependencies (root + client)
npm run install:all

# 2. Build the Vue frontend
npm run build

# 3. Start the server
npm start
```

Then open your browser at **http://localhost:PORT**.

This app creates its own database (`warning_reports`) and will not interfere with any existing databases on the same MongoDB instance.

---

## Development Workflow

Run the Express server and Vite dev server in two separate terminals:

```bash
# Terminal 1 — Express API server
npm run dev:server

# Terminal 2 — Vite dev server with hot reload
npm run dev:client
```

Open **http://localhost:5173** in your browser. Vite proxies all `/api` requests to Express on port 3000. Any changes to `.vue` files are reflected in the browser instantly without a page refresh.

When done making changes, build and restart for production:

```bash
npm run build
npm start
```

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

| Data      | Compression                                                      |
| --------- | ---------------------------------------------------------------- |
| Signature | Resized to 400x150px, grayscale, WebP lossless — approx. 3-10 KB |
| Photos    | Resized to max 800x800px, WebP quality 45 — approx. 20-45 KB     |

WebP produces significantly smaller files than JPEG and PNG at the same visual quality. Signatures use lossless WebP to preserve the exact lines of the mark. Photos use lossy WebP at quality 45 which is aggressive but keeps evidence photos readable.

When exporting to Excel, images are re-encoded to JPEG/PNG on the fly since ExcelJS does not support WebP. The stored data in MongoDB remains WebP.

The table API excludes signature and photo data entirely. Those fields are only loaded when opening an individual record in the detail modal. This ensures the reports table loads quickly regardless of how many records are in the database.

---

## Project Structure

```
warning-report/
├── server.js               # Express entry point
├── package.json            # Root scripts and backend dependencies
├── .env                    # Environment config (MongoDB URI, port)
├── models/
│   └── WarningReport.js    # Mongoose schema
├── routes/
│   └── reports.js          # All API routes and Excel export
├── public/                 # Built Vue app output (generated by Vite)
└── client/                 # Vue 3 frontend source
    ├── index.html          # Vite HTML entry point
    ├── vite.config.js      # Vite config (dev proxy, build output)
    ├── package.json        # Frontend dependencies
    └── src/
        ├── main.js         # Vue app entry, router setup
        ├── App.vue         # Root component (header, global toast)
        ├── style.css       # Global styles and CSS variables
        ├── composables/
        │   └── constants.js        # Shared data (barangays, officers, violations)
        ├── components/
        │   └── SignatureCanvas.vue # Reusable signature pad component
        └── views/
            ├── ReportForm.vue      # / route — warning report submission form
            └── ReportsList.vue     # /reports route — reports table, filters, export
```

---

## Scripts

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `npm run install:all` | Install backend and frontend dependencies   |
| `npm run build`       | Build Vue app into `/public`                |
| `npm start`           | Start Express server (serves built Vue app) |
| `npm run dev:server`  | Start Express in development mode           |
| `npm run dev:client`  | Start Vite dev server with hot reload       |

---

## Sharing with Enforcers

To give enforcers access via a public URL while the server runs locally:

- **ngrok**: `ngrok http PORT`
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:PORT`
- Or configure port forwarding on your router and share your public IP

Replace `PORT` with whatever port is set in your `.env` file.
