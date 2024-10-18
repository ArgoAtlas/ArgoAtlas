import { MapboxOverlay } from "@deck.gl/mapbox";
import {
  GeoJsonLayer,
  ScatterplotLayer,
  PathLayer,
  LineLayer,
} from "@deck.gl/layers";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const serverAddress = "http://localhost:5000";
const darkStyle =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const lightStyle =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const map = new Map({
  container: "map",
  style: window.matchMedia("(prefers-color-scheme: dark)").matches
    ? darkStyle
    : lightStyle,
  center: [0.45, 51.47],
  zoom: 2,
  maxZoom: 12,
  minZoom: 1,
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (event) => {
    if (event.matches) {
      map.setStyle(darkStyle);
    } else {
      map.setStyle(lightStyle);
    }
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

async function updateMap() {
  const portsResponse = await fetch(`${serverAddress}/ports`);
  const shipsResponse = await fetch(`${serverAddress}/ships`);
  const pathsResponse = await fetch(`${serverAddress}/paths`);
  const graphResponse = await fetch(`${serverAddress}/graph`);
  const proximityGraphResponse = await fetch(`${serverAddress}/proximityGraph`);

  const ports = await portsResponse.json();
  const ships = await shipsResponse.json();
  const paths = await pathsResponse.json();
  const graph = await graphResponse.json();
  const proximityGraph = await proximityGraphResponse.json();

  deckOverlay.setProps({
    layers: [
      new GeoJsonLayer({
        id: "ports",
        data: ports,
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
        data: ships,
        filled: true,
        getPosition: (d) => [d.position.longitude, d.position.latitude],
        getFillColor: [255, 0, 0],
        radiusMinPixels: 2,
        radiusMaxPixels: 3,
        pickable: true,
        onHover: updateShipTooltip,
      }),
      // new ScatterplotLayer({
      //   id: "graph",
      //   data: graph,
      //   filled: true,
      //   getPosition: (d) => [d.position[0], d.position[1]],
      //   getFillColor: [255, 255, 255],
      //   radiusMinPixels: 2,
      //   radiusMaxPixels: 3,
      // }),
      // new PathLayer({
      //   id: "paths",
      //   data: paths,
      //   getColor: [0, 255, 0],
      //   getPath: (d) => d.points,
      //   widthMinPixels: 1,
      // }),
      new LineLayer({
        id: "proximityGraph",
        data: proximityGraph,
        getColor: [0, 255, 255],
        getSourcePosition: (d) => [d.coords[0], d.coords[1]],
        getTargetPosition: (d) => [d.coords[2], d.coords[3]],
        getWidth: 5,
      }),
    ],
  });

  setTimeout(updateMap, 5000);
}

map.addControl(deckOverlay);

updateMap();
