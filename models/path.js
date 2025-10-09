import mongoose from "mongoose";

const pathSchema = new mongoose.Schema({
  mmsi: { type: Number, index: true },
  points: [[Number]],
  lastPoint: [Number],
  lastPointTime: Number,
});

pathSchema.index({ mmsi: 1, lastPointTime: -1 });

export default mongoose.model("Path", pathSchema);
