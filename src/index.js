import { Deck } from "@deck.gl/core";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

const INITIAL_VIEW_STATE = {
  latitude: 0,
  longitude: 0,
  zoom: 2,
};

const geoJsonLayer = new GeoJsonLayer({
  id: "map",
  data: "http://localhost:5000/countries",
  filled: true,
  getLineColor: [255, 255, 255],
});

const scatterplotLayer = new ScatterplotLayer({
  id: "points",
  data: "http://localhost:5000/ships",
  stroked: false,
  filled: true,
  getPosition: (d) => [d.longitude, d.latitude],
  getFillColor: [255, 0, 0],
  radiusMinPixels: 2,
  radiusMaxPixels: 3,
});

const deckInstance = new Deck({
  initialViewState: INITIAL_VIEW_STATE,
  controller: true,
  layers: [scatterplotLayer, geoJsonLayer],
});
