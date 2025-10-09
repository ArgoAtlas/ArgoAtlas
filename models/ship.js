import mongoose from "mongoose";

const shipSchema = new mongoose.Schema({
  mmsi: { type: Number, index: true },
  name: { type: String, default: "UNKNOWN" },
  callSign: { type: String, default: "UNKNOWN" },
  destination: { type: String, default: "UNKNOWN" },
  position: {
    longitude: { type: Number, default: 0 },
    latitude: { type: Number, default: 0 },
  },
});

export default mongoose.model("Ship", shipSchema);
