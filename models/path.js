const mongoose = require("mongoose");

const pathSchema = new mongoose.Schema({
  mmsi: { type: Number, index: true },
  points: [[Number]],
  latitude: {
    deltas: [Number],
    previous: Number,
  },
  longitude: {
    deltas: [Number],
    previous: Number,
  },
  cog: {
    deltas: [Number],
    previous: Number,
  },
  sog: {
    deltas: [Number],
    previous: Number,
  },
  turnRate: {
    deltas: [Number],
    previous: Number,
  },
});

module.exports = mongoose.model("Path", pathSchema);
