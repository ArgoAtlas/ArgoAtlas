import mongoose from "mongoose";

const proximityGraphSchema = new mongoose.Schema({
  coords: [[Number]],
  neighbors: [String],
  m1: [Number],
  m2: [Number],
  centroids: [[Number]],
  group: { type: Number, index: true },
});

export default mongoose.model("ProximityGraph", proximityGraphSchema);
