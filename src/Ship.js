const mongoose = require("mongoose");

const shipSchema = new mongoose.Schema({
  mmsi: Number,
  longitude: Number,
  latitude: Number,
});

module.exports = mongoose.model("Ship", shipSchema);
