# 🌿 Warning Report System
## Environmental Enforcement Division — CENRO

A Node.js / Express / MongoDB web app for logging segregation violation warning reports.

---

## ⚙️ Prerequisites

- **Node.js** v18+ → https://nodejs.org
- **MongoDB** running locally
  - Ubuntu/Debian: `sudo systemctl start mongod`
  - macOS (Homebrew): `brew services start mongodb-community`
  - Or use MongoDB Atlas (update `.env`)

---

## 🚀 Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Edit .env to change MongoDB URI or port
#    Default: mongodb://localhost:27017/warning_reports  port 3000

# 3. Start the server
npm start
```

Open your browser: **http://localhost:3000**

---

## 📋 Pages

| URL | Description |
|-----|-------------|
| `/` | Submit Warning Report (form) |
| `/reports` | View, search, delete, and export reports |

---

## 📥 Excel Export

On the **Reports** page, select a date range and click **Export to Excel**.  
The exported `.xlsx` includes:
- All report fields
- Embedded signature images
- Embedded photo evidence (up to 2)

---

## 🗂️ Data Compression

- **Signature** → resized to 400×150px, grayscale PNG, compression level 9
- **Photos** → resized to max 800×800px, JPEG quality 40

This keeps the MongoDB document size small while preserving readability.

---

## 🌐 Port Forwarding / Sharing

To share with enforcers via a public URL:
- Use **ngrok**: `ngrok http 3000`
- Use **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:3000`
- Or simply port-forward port 3000 on your router

---

## 🏗️ Project Structure

```
warning-report/
├── server.js           # Express entry point
├── .env                # Config (MongoDB URI, port)
├── models/
│   └── WarningReport.js
├── routes/
│   └── reports.js      # All API routes + Excel export
└── public/
    ├── index.html      # Submit form
    └── reports.html    # Reports list & export
```
