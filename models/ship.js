const mongoose = require("mongoose");

const shipSchema = new mongoose.Schema({
  mmsi: { type: Number, index: true },
  longitude: Number,
  latitude: Number,
});

module.exports = mongoose.model("Ship", shipSchema);
