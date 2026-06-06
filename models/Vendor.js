const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const vendorSchema = new mongoose.Schema({
  Business_Name: String,
  Owner_name: String,
  Email_address: {
    type: String,
    unique: true
  },

  Phone_number: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  },
  Business_address: String,
  Category: String,
  Sub_Category: [String],

  // Role field for access control (product vendor vs service vendor)
  role: {
    type: String,
    enum: ['product', 'Technical', 'admin'],
    default: 'Technical',
  },

  Tax_ID: String,
  ID_Type: String,
  Password: String,

  ProductUrls: { type: [String], default: [] }, // Multiple product/business images
  Profile_Image: { type: String, default: "" }, // Single profile image

  Account_Number: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  },
  IFSC_Code: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  },
  Charge_Per_Hour_or_Day: String,
  Charge_Type: String, // e.g., Hourly/Daily

  Latitude: Number,
  Longitude: Number,

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  },
  Verified: {
    type: Boolean,
    default: false
  },
  description: String,

  registrationDate: {
    type: Date,
    default: Date.now,
  },
}, { collection: "Vendor-main" });

// Pre-save hook to populate location and hash password
vendorSchema.pre("save", async function () {
  if (this.Latitude && this.Longitude) {
    this.location = {
      type: "Point",
      coordinates: [parseFloat(this.Longitude), parseFloat(this.Latitude)],
    };
  }

  if (this.isModified("Password") && this.Password) {
    this.Password = await bcrypt.hash(this.Password, 10);
  }
});

// Index for geospatial queries
vendorSchema.index({ location: "2dsphere" });

const Vendor = mongoose.model("Vendor", vendorSchema);

module.exports = Vendor;
