import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Map } from "maplibre-gl";

const serverAddress = "http://localhost:5000";
const darkStyle =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const lightStyle =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const map = new Map({
  container: "map",
  style: window.matchMedia("(prefers-color-scheme: dark)").matches
    ? lightStyle
    : darkStyle,
  center: [0.45, 51.47],
  zoom: 2,
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

let showports = true;
const portsCheck = document.getElementById("portsCheck");
portsCheck.addEventListener("change", function () {
  if (showports) {
    map.setLayoutProperty("ports", "visibility", "none");
    showports = false;
  } else {
    map.setLayoutProperty("ports", "visibility", "visible");
    showports = true;
  }
});

let showships = true;
const shipsCheck = document.getElementById("shipsCheck");
shipsCheck.addEventListener("change", function () {
  if (showships) {
    map.setLayoutProperty("ships", "visibility", "none");
    showships = false;
  } else {
    map.setLayoutProperty("ships", "visibility", "visible");
    showships = true;
  }
});

let showchokepoints = true;
const chokepointsCheck = document.getElementById("chokepointsCheck");
chokepointsCheck.addEventListener("change", function () {
  if (showchokepoints) {
    map.setLayoutProperty("chokepoints", "visibility", "none");
    showchokepoints = false;
  } else {
    map.setLayoutProperty("chokepoints", "visibility", "visible");
    showchokepoints = true;
  }
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
    tooltipTitle.innerText = object.properties.name;
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
    tooltipTitle.innerText = object.name;
    tooltipEntries.textContent = "";
    tooltipEntries.appendChild(createTooltipEntry("Type:", "Ship"));
    tooltipEntries.appendChild(createTooltipEntry("MMSI:", object.mmsi));
    tooltipEntries.appendChild(
      createTooltipEntry(
        "Latitude:",
        Math.round(object.latitude * 10000) / 10000,
      ),
    );
    tooltipEntries.appendChild(
      createTooltipEntry(
        "Longitude:",
        Math.round(object.longitude * 10000) / 10000,
      ),
    );
    tooltipEntries.appendChild(
      createTooltipEntry("Call sign:", object.callSign),
    );
    tooltipEntries.appendChild(
      createTooltipEntry("Destination:", object.destination),
    );
  } else {
    tooltip.style.display = "none";
  }
}

async function updateMap() {
  const portsResponse = await fetch(`${serverAddress}/ports`);
  const shipsResponse = await fetch(`${serverAddress}/ships`);
  const chokepointsResponse = await fetch(`${serverAddress}/chokepoints`);

  const ports = await portsResponse.json();
  const ships = await shipsResponse.json();
  const chokepoints = await chokepointsResponse.json();

  deckOverlay.setProps({
    layers: [
      new GeoJsonLayer({
        id: "ports",
        data: ports,
        pointType: "circle+text",
        getFillColor: [0, 0, 255],
        getLineColor: [0, 0, 0],
        pointRadiusMinPixels: 1.5,
        pointRadiusMaxPixels: 5,
        pickable: true,
        onHover: updatePortTooltip,
      }),
      new ScatterplotLayer({
        id: "ships",
        data: ships,
        filled: true,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: [255, 0, 0],
        radiusMinPixels: 1,
        radiusMaxPixels: 5,
        pickable: true,
        onHover: updateShipTooltip,
      }),
      new ScatterplotLayer({
        id: "chokepoints",
        data: chokepoints,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: [100, 0, 0, 100], // rgba
        getLineColor: [0, 0, 0],
        radiusMinPixels: 12,
        radiusMaxPixels: 24,
        pickable: true,
      }),
    ],
  });

  setTimeout(updateMap, 100);
}

map.addControl(deckOverlay);

updateMap();
