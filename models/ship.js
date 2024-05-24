import mongoose from "mongoose";

const shipSchema = new mongoose.Schema({
  mmsi: { type: Number, index: true },
  name: String,
  callSign: String,
  destination: String,
  position: {
    longitude: Number,
    latitude: Number,
  },
});

export default mongoose.model("Ship", shipSchema);
