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

let cachedFlows = {};
let currentResolution = null;
let isLoadingFlows = false;
let mapInitialized = false;

function getResolutionForZoom(zoom) {
  if (zoom <= 4) return 3; // LOW
  if (zoom <= 7) return 4; // MEDIUM
  return 5; // HIGH
}

async function loadFlows() {
  const zoom = map.getZoom();
  const resolution = getResolutionForZoom(zoom);

  if (isLoadingFlows) return cachedFlows[currentResolution] || [];

  if (cachedFlows[resolution]) {
    return cachedFlows[resolution];
  }

  isLoadingFlows = true;
  try {
    const flowsResponse = await fetch(
      `${serverAddress}/flows?zoom=${zoom}&minCount=2`,
    );
    const flows = await flowsResponse.json();
    cachedFlows[resolution] = flows;
    return flows;
  } catch (error) {
    console.error("Error loading flows:", error);
    return [];
  } finally {
    isLoadingFlows = false;
  }
}

// Function to update only the flow layer
async function updateFlowLayer(forceRecreate = false) {
  // Skip if map not initialized yet
  if (!mapInitialized) {
    return;
  }

  const zoom = map.getZoom();
  const resolution = getResolutionForZoom(zoom);

  const resolutionChanged = resolution !== currentResolution;

  if (resolutionChanged) {
    currentResolution = resolution;
  }

  if (resolutionChanged || forceRecreate) {
    if (!deckOverlay || !deckOverlay.props || !deckOverlay.props.layers) {
      return;
    }

    if (cachedFlows[resolution]) {
      updateFlowLayerWithData(cachedFlows[resolution]);
    }

    if (!isLoadingFlows && resolutionChanged) {
      loadFlows().then((flows) => {
        if (flows && flows.length > 0) {
          updateFlowLayerWithData(flows);
        }
      });
    }
  }
}

function updateFlowLayerWithData(flows) {
  const maxIntensity = flows.reduce(
    (max, f) => Math.max(max, f.intensity),
    0.1,
  );

  const currentLayers = deckOverlay.props.layers;

  const updatedLayers = currentLayers.map((layer) => {
    if (layer.id === "h3-flows") {
      return new LineLayer({
        id: "h3-flows",
        data: flows,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getColor: (d) => {
          const intensity = d.intensity / maxIntensity;
          return [
            100 + intensity * 155,
            150 + intensity * 105,
            200 + intensity * 55,
            150 + intensity * 105,
          ];
        },
        getWidth: (d) => {
          const intensity = d.intensity / maxIntensity;
          return 1 + intensity * 4;
        },
        widthMinPixels: 1,
        widthMaxPixels: 8,
        parameters: {
          depthTest: false,
          blend: true,
        },
      });
    }
    return layer;
  });

  deckOverlay.setProps({ layers: updatedLayers });
}

async function updateMap() {
  const portsResponse = await fetch(`${serverAddress}/ports`);
  const shipsResponse = await fetch(`${serverAddress}/ships`);

  const ports = await portsResponse.json();
  const ships = await shipsResponse.json();
  const flows = await loadFlows();

  const maxIntensity = flows.reduce(
    (max, f) => Math.max(max, f.intensity),
    0.1,
  );

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
      new LineLayer({
        id: "h3-flows",
        data: flows,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getColor: (d) => {
          const intensity = d.intensity / maxIntensity;
          return [
            100 + intensity * 155,
            150 + intensity * 105,
            200 + intensity * 55,
            150 + intensity * 105,
          ];
        },
        getWidth: (d) => {
          const intensity = d.intensity / maxIntensity;
          return 1 + intensity * 4; // 1-5 pixels
        },
        widthMinPixels: 1,
        widthMaxPixels: 8,
        parameters: {
          depthTest: false,
          blend: true,
        },
      }),
    ],
  });
}

function startPeriodicUpdates() {
  setTimeout(async () => {
    await updateMap();
    startPeriodicUpdates();
  }, 5000);
}

map.addControl(deckOverlay);

updateMap().then(() => {
  mapInitialized = true;
  console.log("Initial map update complete, zoom-responsive flows enabled");

  let zoomTimeout;
  map.on("zoom", () => {
    updateFlowLayer(true);

    clearTimeout(zoomTimeout);
    zoomTimeout = setTimeout(() => {
      updateFlowLayer(true);
    }, 50);
  });

  map.on("moveend", () => {
    updateFlowLayer(true);
  });

  startPeriodicUpdates();
});
