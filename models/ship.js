import mongoose from "mongoose";

const shipSchema = new mongoose.Schema({
  mmsi: { type: Number, index: true },
  name: { type: String, default: "UNKNOWN" },
  callSign: { type: String, default: "UNKNOWN" },
  destination: { type: String },
  position: {
    longitude: { type: Number, default: 0 },
    latitude: { type: Number, default: 0 },
  },
  time: { type: String, default: "UNKNOWN" },
});

export default mongoose.model("Ship", shipSchema);
