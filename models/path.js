const mongoose = require("mongoose");

const pathSchema = new mongoose.Schema({
  mmsi: { type: Number, index: true },
  points: [[Number]],
  latitude: {
    deltas: [Number],
    previous: [Number],
    controlPositive: Number,
    controlNegative: Number,
  },
  longitude: {
    deltas: [Number],
    previous: [Number],
    controlPositive: Number,
    controlNegative: Number,
  },
  cog: {
    deltas: [Number],
    previous: [Number],
    controlPositive: Number,
    controlNegative: Number,
  },
  sog: {
    deltas: [Number],
    previous: [Number],
    controlPositive: Number,
    controlNegative: Number,
  },
  turnRate: {
    deltas: [Number],
    previous: [Number],
    controlPositive: Number,
    controlNegative: Number,
  },
});

module.exports = mongoose.model("Path", pathSchema);
