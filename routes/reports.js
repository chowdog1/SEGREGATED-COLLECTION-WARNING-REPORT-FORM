const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const ExcelJS = require("exceljs");
const WarningReport = require("../models/WarningReport");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

async function compressImage(buffer) {
  const compressed = await sharp(buffer)
    .resize({
      width: 800,
      height: 800,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 45, effort: 6 })
    .toBuffer();
  return "data:image/webp;base64," + compressed.toString("base64");
}

async function compressSignature(base64DataUrl) {
  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const compressed = await sharp(buffer)
    .resize({
      width: 400,
      height: 150,
      fit: "inside",
      withoutEnlargement: true,
    })
    .grayscale()
    .webp({ lossless: true, effort: 6 })
    .toBuffer();
  return "data:image/webp;base64," + compressed.toString("base64");
}

// GET homepage
router.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

// Image proxy
router.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url");
  const allowed = [
    "8upload.com",
    "staticmap.openstreetmap.de",
    "tile.openstreetmap.org",
  ];
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).send("Invalid url");
  }
  if (!allowed.some((d) => parsedUrl.hostname.endsWith(d)))
    return res.status(403).send("Domain not allowed");
  try {
    const https = require("https");
    const http = require("http");
    const client = parsedUrl.protocol === "https:" ? https : http;
    const request = client.get(
      url,
      { headers: { "User-Agent": "CENRO-WarningReport/1.0" } },
      (response) => {
        if (response.statusCode !== 200)
          return res.status(response.statusCode).send("Upstream error");
        res.setHeader(
          "Content-Type",
          response.headers["content-type"] || "image/png",
        );
        res.setHeader("Cache-Control", "public, max-age=3600");
        response.pipe(res);
      },
    );
    request.on("error", () => res.status(500).send("Fetch error"));
  } catch {
    res.status(500).send("Proxy error");
  }
});

// POST submit report
router.post("/api/reports", upload.array("photos", 2), async (req, res) => {
  try {
    const body = req.body;

    const disposalTypes = {
      unsegregated: body["disposal_unsegregated"] === "on",
      segregated: body["disposal_segregated"] === "on",
      warning: body["disposal_warning"] === "on",
      noWaste: body["disposal_noWaste"] === "on",
    };

    let officers = body.officers || [];
    if (typeof officers === "string") officers = [officers];

    let signature = "";
    if (body.signatureData && body.signatureData.length > 100) {
      signature = await compressSignature(body.signatureData);
    }

    let photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        photos.push(await compressImage(file.buffer));
      }
    }

    const report = new WarningReport({
      dateIssued: new Date(body.dateIssued),
      disposalTypes,
      householdOwnerFirstName: body.householdOwnerFirstName,
      householdOwnerLastName: body.householdOwnerLastName,
      address: body.address,
      barangay: body.barangay,
      officers,
      remarks: body.remarks || "",
      geo: {
        latitude: body.geoLat ? parseFloat(body.geoLat) : null,
        longitude: body.geoLng ? parseFloat(body.geoLng) : null,
        accuracy: body.geoAcc ? parseFloat(body.geoAcc) : null,
      },
      signature,
      photos,
    });

    await report.save();
    res.json({ success: true, id: report._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET reports — paginated, filtered
router.get("/api/reports", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      from,
      to,
      search,
      barangay,
      officer,
      disposal,
      sort = "newest",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const query = {};

    if (from || to) {
      query.dateIssued = {};
      if (from) {
        const d = new Date(from);
        d.setHours(0, 0, 0, 0);
        query.dateIssued.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        query.dateIssued.$lte = d;
      }
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { householdOwnerFirstName: regex },
        { householdOwnerLastName: regex },
      ];
    }

    if (barangay) query.barangay = barangay;
    if (officer) query.officers = officer;
    if (disposal) query[`disposalTypes.${disposal}`] = true;

    const sortMap = {
      newest: { dateIssued: -1 },
      oldest: { dateIssued: 1 },
      name_az: { householdOwnerLastName: 1, householdOwnerFirstName: 1 },
      name_za: { householdOwnerLastName: -1, householdOwnerFirstName: -1 },
    };
    const sortObj = sortMap[sort] || sortMap.newest;

    const [reports, total] = await Promise.all([
      WarningReport.find(query, { signature: 0, photos: 0 })
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WarningReport.countDocuments(query),
    ]);

    res.json({
      reports,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET dashboard stats
router.get("/api/dashboard", async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, thisMonth, byBarangay, byDisposal, recentReports] =
      await Promise.all([
        WarningReport.countDocuments(),
        WarningReport.countDocuments({ dateIssued: { $gte: startOfToday } }),
        WarningReport.countDocuments({ dateIssued: { $gte: startOfMonth } }),
        WarningReport.aggregate([
          { $group: { _id: "$barangay", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        WarningReport.aggregate([
          {
            $group: {
              _id: null,
              unsegregated: {
                $sum: { $cond: ["$disposalTypes.unsegregated", 1, 0] },
              },
              segregated: {
                $sum: { $cond: ["$disposalTypes.segregated", 1, 0] },
              },
              warning: { $sum: { $cond: ["$disposalTypes.warning", 1, 0] } },
              noWaste: { $sum: { $cond: ["$disposalTypes.noWaste", 1, 0] } },
            },
          },
        ]),
        WarningReport.find({}, { signature: 0, photos: 0 })
          .sort({ dateIssued: -1 })
          .limit(5)
          .lean(),
      ]);

    res.json({
      total,
      today,
      thisMonth,
      byBarangay,
      byDisposal: byDisposal[0] || {},
      recentReports,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single report
router.get("/api/reports/:id", async (req, res) => {
  try {
    const report = await WarningReport.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ error: "Not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE report — requires PIN
router.delete("/api/reports/:id", async (req, res) => {
  try {
    const { pin } = req.body;
    const correctPin = process.env.DELETE_PIN;
    if (!correctPin)
      return res
        .status(500)
        .json({
          success: false,
          error: "DELETE_PIN is not configured in .env",
        });
    if (!pin || pin.toString() !== correctPin.toString()) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Incorrect PIN. Deletion not authorized.",
        });
    }
    await WarningReport.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export to Excel
router.get("/api/export", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({ error: "from and to dates required" });

    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const reports = await WarningReport.find({
      dateIssued: { $gte: start, $lte: end },
    })
      .sort({ dateIssued: 1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Warning Report System";
    const sheet = workbook.addWorksheet("Warning Reports", {
      pageSetup: { orientation: "landscape", fitToPage: true },
    });

    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1B5E20" },
    };
    const headerFont = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
      name: "Calibri",
    };
    const borderStyle = { style: "thin", color: { argb: "FFBDBDBD" } };
    const allBorders = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    const dataCellAlignment = {
      vertical: "top",
      horizontal: "left",
      wrapText: true,
    };

    sheet.columns = [
      { header: "Date Issued", key: "dateIssued", width: 14 },
      { header: "Classification", key: "classification", width: 28 },
      { header: "Household Owner", key: "ownerName", width: 26 },
      { header: "Address", key: "address", width: 28 },
      { header: "Barangay", key: "barangay", width: 18 },
      { header: "Officers", key: "officers", width: 34 },
      { header: "Remarks", key: "remarks", width: 36 },
      { header: "Location", key: "location", width: 26 },
      { header: "Signature", key: "signature", width: 24 },
      { header: "Photo 1", key: "photo1", width: 24 },
      { header: "Photo 2", key: "photo2", width: 24 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 40;
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
      cell.border = allBorders;
    });

    const DISPOSAL_LABELS = {
      unsegregated: "UNSEGREGATED",
      segregated: "SEGREGATED",
      warning: "WARNING",
      noWaste: "NO WASTE",
    };

    const IMAGE_ROW_HEIGHT = 80;

    for (let i = 0; i < reports.length; i++) {
      const r = reports[i];
      const rowIndex = i + 2;
      const hasImages =
        (r.signature && r.signature.length > 100) ||
        (r.photos && r.photos.length > 0);

      const classList = Object.entries(DISPOSAL_LABELS)
        .filter(([key]) => r.disposalTypes && r.disposalTypes[key])
        .map(([, label]) => label);

      const row = sheet.addRow({
        dateIssued: new Date(r.dateIssued).toLocaleDateString("en-PH"),
        classification: classList.join(", ") || "—",
        ownerName: `${r.householdOwnerLastName}, ${r.householdOwnerFirstName}`,
        address: r.address,
        barangay: r.barangay,
        officers: (r.officers || []).join("\n"),
        remarks: r.remarks || "",
        location: "",
        signature: "",
        photo1: "",
        photo2: "",
      });

      row.height = hasImages ? IMAGE_ROW_HEIGHT : 20;

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = allBorders;
        cell.alignment = dataCellAlignment;
        if (!cell.font) cell.font = { name: "Calibri", size: 10 };
      });

      const locCell = row.getCell("location");
      if (r.geo && r.geo.latitude && r.geo.longitude) {
        const lat = r.geo.latitude.toFixed(6);
        const lng = r.geo.longitude.toFixed(6);
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        locCell.value = { text: `${lat}, ${lng}`, hyperlink: mapsUrl };
        locCell.font = {
          name: "Calibri",
          size: 10,
          color: { argb: "FF1155CC" },
          underline: true,
        };
        locCell.alignment = dataCellAlignment;
      } else {
        locCell.value = "Not captured";
        locCell.font = {
          name: "Calibri",
          size: 10,
          color: { argb: "FF999999" },
          italic: true,
        };
        locCell.alignment = dataCellAlignment;
      }

      if (r.signature && r.signature.length > 100) {
        try {
          const sigBase64 = r.signature.replace(/^data:image\/\w+;base64,/, "");
          const sigImgId = workbook.addImage({
            base64: sigBase64,
            extension: "png",
          });
          sheet.addImage(sigImgId, {
            tl: { col: 8, row: rowIndex - 1 },
            ext: { width: Math.round(24 * 7), height: IMAGE_ROW_HEIGHT - 4 },
            editAs: "oneCell",
          });
        } catch {
          /* skip */
        }
      }

      const photoCols = [9, 10];
      const rowPhotos = r.photos || [];
      for (let p = 0; p < Math.min(rowPhotos.length, 2); p++) {
        if (rowPhotos[p] && rowPhotos[p].length > 100) {
          try {
            const rawBase64 = rowPhotos[p].replace(
              /^data:image\/\w+;base64,/,
              "",
            );
            const rawBuffer = Buffer.from(rawBase64, "base64");
            const jpegBuffer = await sharp(rawBuffer)
              .jpeg({ quality: 60 })
              .toBuffer();
            const photoImgId = workbook.addImage({
              base64: jpegBuffer.toString("base64"),
              extension: "jpeg",
            });
            sheet.addImage(photoImgId, {
              tl: { col: photoCols[p], row: rowIndex - 1 },
              ext: { width: Math.round(24 * 7), height: IMAGE_ROW_HEIGHT - 4 },
              editAs: "oneCell",
            });
          } catch {
            /* skip */
          }
        }
      }
    }

    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const filename = `warning_reports_${from}_to_${to}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
