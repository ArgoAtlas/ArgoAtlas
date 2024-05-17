import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MVTLayer } from "@deck.gl/geo-layers";

const serverAddress = "http://localhost:3000";

const map = new Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  center: [0.45, 51.47], // It is the center of the map
  zoom: 2, // It is the zoom level
  minZoom: 1, // It is the minimum zoom level
  maxZoom: 20, // It is the maximum zoom level
  pitch: 0, // It is the angle of the camera from the ground
  bearing: 0, // It is the angle of the camera from the north
  hash: true, // It allows the map to remember the current view
  interactive: true, // It allows the map to be interactive
  attributionControl: true, // It allows the map to show the attribution control
});

map.scrollZoom.setZoomRate(1 / 500); // It sets the zoom rate of the map

await map.once("load");

const deckOverlay = new MapboxOverlay({
  interleaved: true,
  layers: [],
});

const tooltip = document.createElement("div");
tooltip.id = "tooltip";

const tooltipTitle = document.createElement("h3");
const tooltipEntries = document.createElement("div");
tooltipEntries.id = "tooltipEntries";

tooltip.appendChild(tooltipTitle);
tooltip.appendChild(tooltipEntries);

document.body.append(tooltip);

function createTooltipEntry(title, message) {
  const entry = document.createElement("div");

  const titleElement = document.createElement("h4");
  const messageElement = document.createElement("span");

  titleElement.innerText = title;
  messageElement.innerText = message;

  entry.appendChild(titleElement);
  entry.appendChild(messageElement);

  return entry;
}

function updatePortTooltip({ object, x, y }) {
  if (object) {
    tooltip.style.display = "block";
    tooltip.style.left = `${x - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${y + 10}px`;
    tooltipTitle.innerText = object.properties.name.trim();
    tooltipEntries.textContent = "";
    tooltipEntries.appendChild(createTooltipEntry("Type:", "Port"));
  } else {
    tooltip.style.display = "none";
  }
}

function updateShipTooltip({ object, x, y }) {
  if (object) {
    tooltip.style.display = "block";
    tooltip.style.left = `${x - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${y + 10}px`;
    tooltipTitle.innerText = object.name.trim();
    tooltipEntries.textContent = "";
    tooltipEntries.appendChild(createTooltipEntry("Type:", "Ship"));
    tooltipEntries.appendChild(createTooltipEntry("MMSI:", object.mmsi));
    tooltipEntries.appendChild(
      createTooltipEntry("Call sign:", object.callSign.trim()),
    );
    tooltipEntries.appendChild(
      createTooltipEntry("Destination:", object.destination.trim()),
    );
  } else {
    tooltip.style.display = "none";
  }
}

function updateMap() {
  deckOverlay.setProps({
    layers: [
      new GeoJsonLayer({
        id: "ports",
        data: `${serverAddress}/ports`,
        pointType: "circle+text",
        filled: true,
        stroked: true,
        getLineColor: [0, 0, 255],
        getFillColor: [0, 0, 255],
        pointRadiusMaxPixels: 5,
        pointRadiusMinPixels: 2,
        pickable: true,
        onHover: updatePortTooltip,
      }),
      new GeoJsonLayer({
        id: "current-layer",
        data: "https://gist.githubusercontent.com/jalbertbowden/5d04b722ced715e32cee3e8c8c4df95b/raw/7c153b799947d05f66694fc23ab7c2176371c559/map.geojson",
        pickable: true,
        stroked: true,
        filled: false,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getLineColor: [255, 255, 255, 255], // Setze die Farbe der Linien auf Weiß
        getLineWidth: 1,
      }),
      new ScatterplotLayer({
        id: "points",
        data: `${serverAddress}/ships`,
        filled: true,
        getPosition: (d) => [d.position.longitude, d.position.latitude],
        getFillColor: [255, 0, 0],
        radiusMinPixels: 2,
        radiusMaxPixels: 3,
        pickable: true,
        onHover: updateShipTooltip,
      }),
    ],
  });

  setTimeout(updateMap, 1000);
}

map.addControl(deckOverlay);

updateMap();
