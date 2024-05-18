import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const serverAddress = "http://localhost:5000";

const map = new Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  center: [0.45, 51.47],
  zoom: 2,
  maxZoom: 12,
  minZoom: 1,
});

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
    tooltipEntries.appendChild(
      createTooltipEntry(
        "Latitude:",
        Math.round(object.geometry.coordinates[1] * 10000) / 10000,
      ),
    );
    tooltipEntries.appendChild(
      createTooltipEntry(
        "Longitude:",
        Math.round(object.geometry.coordinates[0] * 10000) / 10000,
      ),
    );
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
      createTooltipEntry(
        "Latitude:",
        Math.round(object.position.latitude * 10000) / 10000,
      ),
    );
    tooltipEntries.appendChild(
      createTooltipEntry(
        "Longitude:",
        Math.round(object.position.longitude * 10000) / 10000,
      ),
    );
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
