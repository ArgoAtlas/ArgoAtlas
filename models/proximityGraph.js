import mongoose from "mongoose";

const proximityGraphSchema = new mongoose.Schema({
  coords: [[Number]],
  neighbors: [String],
  m1: [Number],
  m2: [Number],
  centroids: [[Number]],
  group: Number,
});

proximityGraphSchema.index({ position: "2dsphere" });

export default mongoose.model("ProximityGraph", proximityGraphSchema);
