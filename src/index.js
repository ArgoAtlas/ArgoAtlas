import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const serverAddress = "http://localhost:5000";

const map = new Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  center: [0.45, 51.47],
  zoom: 11,
});

await map.once("load");

const deckOverlay = new MapboxOverlay({
  interleaved: true,
  layers: [
    new ScatterplotLayer({
      id: "points",
      data: `${serverAddress}/ships`,
      filled: true,
      getPosition: (d) => [d.longitude, d.latitude],
      getFillColor: [255, 0, 0],
      radiusMinPixels: 2,
      radiusMaxPixels: 3,

      pickable: true,
      onHover: ({ object, x, y }) => {
        const el = document.getElementById("tooltip");
        if (object) {
          const { mmsi } = object;
          el.innerHTML = `<h1>MMSI: ${mmsi}</h1>`;
          el.style.display = "block";
          el.style.opacity = 1;
          el.style.left = x + "px";
          el.style.top = y + "px";
        } else {
          el.style.opacity = 0.0;
        }
      },

      onClick: ({ object }) => {
        const el2 = document.getElementById("tooltip");
        if (object) {
          const { latitude, longitude, mmsi } = object;
          el2.innerHTML = `Latitude: ${latitude} <br> Longitude: ${longitude} <br> MMSI: ${mmsi}`;
          el2.style.display = "block";
          el.style.opacity = 0.9;
          el.style.left = "px";
          el.style.top = "px";
        } else {
          el.style.opacity = 0.0;
        }
      },
    }),
  ],
});

map.addControl(deckOverlay);
