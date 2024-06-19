import mongoose from "mongoose";

const graphSchema = new mongoose.Schema({
  position: [Number, Number],
  adjacentVertices: [String],
});

graphSchema.index({ position: "2dsphere" });

export default mongoose.model("Graph", graphSchema);
