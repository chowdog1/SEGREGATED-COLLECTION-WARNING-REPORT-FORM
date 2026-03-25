const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const ExcelJS = require("exceljs");
const WarningReport = require("../models/WarningReport");

// multer memory storage (we'll compress with sharp before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// Compress photo to WebP — smaller than JPEG at same quality
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

// Compress signature to WebP — much smaller than PNG, lossless for clean line art
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

// GET homepage (form)
router.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

// GET reports page
router.get("/reports", (req, res) => {
  res.sendFile("reports.html", { root: "./public" });
});

// POST submit report
router.post("/api/reports", upload.array("photos", 2), async (req, res) => {
  try {
    const body = req.body;

    // Parse violations
    const violations = {
      co3504: body["viol_co3504"] === "on",
      co911: body["viol_co911"] === "on",
      co1424ab: body["viol_co1424ab"] === "on",
      co1424rest: body["viol_co1424rest"] === "on",
      co1011: body["viol_co1011"] === "on",
      other: body["viol_other"] === "on",
      otherText: body["otherText"] || "",
    };

    // Officers: could be array or single string
    let officers = body.officers || [];
    if (typeof officers === "string") officers = [officers];

    // Compress signature if present
    let signature = "";
    if (body.signatureData && body.signatureData.length > 100) {
      signature = await compressSignature(body.signatureData);
    }

    // Compress photos
    let photos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const compressed = await compressImage(file.buffer);
        photos.push(compressed);
      }
    }

    const report = new WarningReport({
      dateIssued: new Date(body.dateIssued),
      violations,
      apprehendedFirstName: body.apprehendedFirstName,
      apprehendedLastName: body.apprehendedLastName,
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

// GET reports — paginated, filtered, server-side
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
      violation,
      sort = "newest",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build MongoDB query
    const query = {};

    // Date range filter
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

    // Name search (first or last)
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { apprehendedFirstName: regex },
        { apprehendedLastName: regex },
      ];
    }

    // Barangay filter
    if (barangay) query.barangay = barangay;

    // Officer filter
    if (officer) query.officers = officer;

    // Violation filter
    if (violation) {
      if (violation === "other") query["violations.other"] = true;
      else query[`violations.${violation}`] = true;
    }

    // Sort
    const sortMap = {
      newest: { dateIssued: -1 },
      oldest: { dateIssued: 1 },
      name_az: { apprehendedLastName: 1, apprehendedFirstName: 1 },
      name_za: { apprehendedLastName: -1, apprehendedFirstName: -1 },
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

    if (!correctPin) {
      return res
        .status(500)
        .json({
          success: false,
          error: "DELETE_PIN is not configured in .env",
        });
    }
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

// GET export to Excel with date range
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

    // Header style
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

    sheet.columns = [
      { header: "Date Issued", key: "dateIssued", width: 14 },
      { header: "Violations", key: "violations", width: 40 },
      { header: "Apprehended Name", key: "apprehendedName", width: 26 },
      { header: "Address", key: "address", width: 28 },
      { header: "Barangay", key: "barangay", width: 18 },
      { header: "Officers", key: "officers", width: 34 },
      { header: "Remarks", key: "remarks", width: 28 },
      { header: "Location", key: "location", width: 26 },
      { header: "Signature", key: "signature", width: 24 },
      { header: "Photo 1", key: "photo1", width: 24 },
      { header: "Photo 2", key: "photo2", width: 24 },
    ];

    // Style header row
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

    const VIOL_LABELS = {
      co3504: "C.O 35-04 - UNSEGREGATED WASTE",
      co911: "C.O 9-11 - LITTERING/ILLEGAL DISPOSAL OF GARBAGE",
      co1424ab: "C.O 14-24 (A&B) - SMOKING IN PUBLIC PLACES",
      co1424rest: "C.O 14-24 (C-V,X,Y,Z) - PERSON IN CHARGE",
      co1011: "C.O 10-11 - ILLEGAL DUMPING TO WATERWAYS",
    };

    const IMAGE_ROW_HEIGHT = 80; // points
    // ExcelJS uses EMUs for ext: 1 pt ≈ 9525 EMUs, col width unit ≈ 7 px per char
    // We'll use tl/ext approach so images are strictly inside their cell
    const ROW_HEIGHT_EMU = Math.round(IMAGE_ROW_HEIGHT * 9525);
    const COL_WIDTH_EMU = Math.round(24 * 7 * 9525); // approx for width-24 cols

    for (let i = 0; i < reports.length; i++) {
      const r = reports[i];
      const rowIndex = i + 2; // 1-based, row 1 is header

      // Build violations list
      const violList = [];
      Object.entries(VIOL_LABELS).forEach(([key, label]) => {
        if (r.violations[key]) violList.push(label);
      });
      if (r.violations.other) violList.push(r.violations.otherText || "Other");
      const violationsText = violList.join("\n");

      const row = sheet.addRow({
        dateIssued: new Date(r.dateIssued).toLocaleDateString("en-PH"),
        violations: violationsText,
        apprehendedName: `${r.apprehendedLastName}, ${r.apprehendedFirstName}`,
        address: r.address,
        barangay: r.barangay,
        officers: (r.officers || []).join("\n"),
        remarks: r.remarks,
        location: "",
        signature: "",
        photo1: "",
        photo2: "",
      });

      row.height = IMAGE_ROW_HEIGHT;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = allBorders;
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
      });

      // Location cell — display as coordinates, hyperlink to Google Maps
      const locCell = row.getCell("location");
      if (r.geo && r.geo.latitude && r.geo.longitude) {
        const lat = r.geo.latitude.toFixed(6);
        const lng = r.geo.longitude.toFixed(6);
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        locCell.value = {
          text: `${lat}, ${lng}`,
          hyperlink: mapsUrl,
        };
        locCell.font = {
          color: { argb: "FF1155CC" },
          underline: true,
          size: 10,
        };
        locCell.alignment = { vertical: "middle", horizontal: "left" };
      } else {
        locCell.value = "Not captured";
        locCell.font = { color: { argb: "FF999999" }, italic: true, size: 10 };
      }

      // Embed signature — col 8 (0-based), shifted right by Location column
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
        } catch (e) {
          /* skip */
        }
      }

      // Embed photos — cols 9 and 10 (0-based)
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
          } catch (e) {
            /* skip */
          }
        }
      }
    }

    // Freeze header
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
