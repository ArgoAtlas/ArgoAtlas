import mongoose from "mongoose";

const bundleSchema = new mongoose.Schema({
  source: [Number],
  target: [Number],
});

bundleSchema.index({ position: "2dsphere" });

export default mongoose.model("Bundle", bundleSchema);
