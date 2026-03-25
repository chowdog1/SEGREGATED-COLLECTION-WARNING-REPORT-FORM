const mongoose = require("mongoose");

const warningReportSchema = new mongoose.Schema({
  dateIssued: { type: Date, required: true },
  violations: {
    co3504: { type: Boolean, default: false },
    co911: { type: Boolean, default: false },
    co1424ab: { type: Boolean, default: false },
    co1424rest: { type: Boolean, default: false },
    co1011: { type: Boolean, default: false },
    other: { type: Boolean, default: false },
    otherText: { type: String, default: "" },
  },
  apprehendedFirstName: { type: String, required: true },
  apprehendedLastName: { type: String, required: true },
  address: { type: String, required: true },
  barangay: { type: String, required: true },
  officers: [{ type: String }],
  remarks: { type: String, default: "" },
  // geo location captured at time of submission
  geo: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null }, // meters
  },
  // base64 compressed signature
  signature: { type: String, default: "" },
  // compressed photos stored as base64
  photos: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

warningReportSchema.virtual("apprehendedName").get(function () {
  return `${this.apprehendedLastName}, ${this.apprehendedFirstName}`;
});

warningReportSchema.set("toJSON", { virtuals: true });
warningReportSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("WarningReport", warningReportSchema);
