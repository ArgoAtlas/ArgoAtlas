import mongoose from "mongoose";

const proximityGraphSchema = new mongoose.Schema({
  coords: [Number, Number, Number, Number],
});

proximityGraphSchema.index({ position: "2dsphere" });

export default mongoose.model("ProximityGraph", proximityGraphSchema);