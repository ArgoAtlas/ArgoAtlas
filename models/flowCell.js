import mongoose from "mongoose";

const flowCellSchema = new mongoose.Schema({
  sourceCell: { type: String, index: true },
  targetCell: { type: String, index: true },
  sourceCoords: [Number, Number],
  targetCoords: [Number, Number],
  count: { type: Number, default: 1 },
  resolution: { type: Number, index: true },
  lastUpdated: { type: Date, default: Date.now },
});

flowCellSchema.index({ resolution: 1, count: -1 });
flowCellSchema.index(
  { sourceCell: 1, targetCell: 1, resolution: 1 },
  { unique: true },
);

export default mongoose.model("FlowCell", flowCellSchema);
