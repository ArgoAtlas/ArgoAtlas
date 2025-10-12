import { MapboxOverlay } from "@deck.gl/mapbox";
import {
  GeoJsonLayer,
  ScatterplotLayer,
  PathLayer,
  ArcLayer,
} from "@deck.gl/layers";
import { Map } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import moment from "moment-timezone";

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

function convertGeoToScreen([longitude, latitude]) {
  const point = map.project([longitude, latitude]);
  return [point.x, point.y]; // Return the x and y pixel positions
}

const deckOverlay = new MapboxOverlay({
  interleaved: true,
  layers: [],
  getCursor: () => "default", // set cursor style to default instead of hand
  onClick: (info, event) => console.log("Clicked:", info, event), // display mouse onClick info i.e. coordinates
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

let showPaths = true;
const pathsCheck = document.getElementById("pathsCheck");
pathsCheck.addEventListener("change", function () {
  if (showPaths) {
    map.setLayoutProperty("paths", "visibility", "none");
    showPaths = false;
  } else {
    map.setLayoutProperty("paths", "visibility", "visible");
    showPaths = true;
  }
});

let showBundledPaths = true;
const bundledPathsCheck = document.getElementById("bundledPathsCheck");
bundledPathsCheck.addEventListener("change", function () {
  if (showBundledPaths) {
    map.setLayoutProperty("h3-flows", "visibility", "none");
    showBundledPaths = false;
  } else {
    map.setLayoutProperty("h3-flows", "visibility", "visible");
    showBundledPaths = true;
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

function updatePortTooltip({ object }) {
  if (!showports) return; // prevent display of tooltip when filter unchecked
  if (object) {
    tooltip.style.display = "block";

    const [x, y] = convertGeoToScreen(object.geometry.coordinates);
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

function updateShipTooltip({ object }) {
  if (!showships) return; // prevent display of tooltip when filter unchecked
  if (object) {
    tooltip.style.display = "block";

    const [x, y] = convertGeoToScreen([
      object.position.longitude,
      object.position.latitude,
    ]);
    tooltip.style.left = `${x - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${y + 10}px`;

    tooltipTitle.innerText = object.name;
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
      createTooltipEntry("Call sign:", object.callSign),
    );
    tooltipEntries.appendChild(
      createTooltipEntry("Destination:", object.destination),
    );
    tooltipEntries.appendChild(createTooltipEntry("Last Update:", object.time));
  } else {
    tooltip.style.display = "none";
  }
}

function updateChokepointTooltip({ object, x, y }) {
  if (object) {
    tooltip.style.display = "block";
    tooltip.style.left = `${x - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${y + 10}px`;
    tooltipTitle.innerText = object.properties.name.trim();
    tooltipEntries.textContent = "";
    tooltipEntries.appendChild(createTooltipEntry("Type:", "Chokepoint"));
    tooltipEntries.appendChild(
      createTooltipEntry("Width:", `${object.properties.width_km} km`),
    );
    tooltipEntries.appendChild(
      createTooltipEntry("Significance:", object.properties.significance),
    );
  } else {
    tooltip.style.display = "none";
  }
}

let cachedFlows = {};
let currentResolution = null;
let mapInitialized = false;

// Layer visibility state
let layerVisibility = {
  ports: true,
  paths: true,
  ships: true,
  flows: true,
  chokepoints: true,
};

// Preload all resolutions
async function preloadAllFlows() {
  const resolutions = [
    { resolution: 3, zoom: 3 }, // LOW: zoom <= 4
    { resolution: 4, zoom: 5 }, // MEDIUM: zoom 5-7
    { resolution: 5, zoom: 8 }, // HIGH: zoom >= 8
  ];
  await Promise.all(
    resolutions.map(async ({ resolution, zoom }) => {
      try {
        const flowsResponse = await fetch(
          `${serverAddress}/flows?zoom=${zoom}&minCount=2`,
        );
        const flows = await flowsResponse.json();
        cachedFlows[resolution] = flows;
      } catch (error) {
        console.error(
          `Error loading flows for resolution ${resolution}:`,
          error,
        );
      }
    }),
  );
}

function getResolutionForZoom(zoom) {
  if (zoom <= 4) return 3; // LOW
  if (zoom <= 7) return 4; // MEDIUM
  return 5; // HIGH
}

async function loadFlows() {
  const zoom = map.getZoom();
  const resolution = getResolutionForZoom(zoom);

  // Just return cached data (should always be available after preload)
  return cachedFlows[resolution] || [];
}

// Function to update only the flow layer
function updateFlowLayer() {
  // Skip if map not initialized yet
  if (!mapInitialized) {
    return;
  }

  if (!deckOverlay || !deckOverlay.props || !deckOverlay.props.layers) {
    return;
  }

  const zoom = map.getZoom();
  const resolution = getResolutionForZoom(zoom);

  const resolutionChanged = resolution !== currentResolution;

  if (resolutionChanged) {
    currentResolution = resolution;
  }

  // Use cached data (should always be available)
  if (cachedFlows[resolution]) {
    updateFlowLayerWithData(cachedFlows[resolution]);
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
      return new ArcLayer({
        id: "h3-flows",
        data: flows,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getSourceColor: (d) => {
          const intensity = d.intensity / maxIntensity;
          return [
            100 + intensity * 155,
            150 + intensity * 105,
            200 + intensity * 55,
            150 + intensity * 105,
          ];
        },
        getTargetColor: (d) => {
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
        greatCircle: true,
        parameters: {
          depthTest: false,
          blend: true,
        },
        visible: layerVisibility.flows,
      });
    }
    return layer;
  });

  deckOverlay.setProps({ layers: updatedLayers });
}

async function fetchData() {
  const [portsResponse, shipsResponse, chokepointsResponse, pathsResponse] =
    await Promise.all([
      fetch(`${serverAddress}/ports`),
      fetch(`${serverAddress}/ships`),
      fetch(`${serverAddress}/chokepoints`),
      fetch(`${serverAddress}/pathsDetailed`),
    ]);

  const ports = await portsResponse.json();
  const ships = await shipsResponse.json();
  const paths = await pathsResponse.json();
  const chokepoints = await chokepointsResponse.json();

  return { ports, ships, chokepoints, paths }; // return all datasets -> to be used in other functions
}

let colorScheme = window.matchMedia("(prefers-color-scheme: dark)").matches
  ? [255, 255, 255]
  : [0, 0, 0];

async function updateMap() {
  const portsResponse = await fetch(`${serverAddress}/ports`);
  const shipsResponse = await fetch(`${serverAddress}/ships`);
  const chokepointsResponse = await fetch(`${serverAddress}/chokepoints`);
  const pathsResponse = await fetch(`${serverAddress}/pathsDetailed`);

  const ports = await portsResponse.json();
  const ships = await shipsResponse.json();
  const chokepoints = await chokepointsResponse.json();
  const paths = await pathsResponse.json();
  const flows = await loadFlows();

  const maxIntensity = flows.reduce(
    (max, f) => Math.max(max, f.intensity),
    0.1,
  );

  deckOverlay.setProps({
    layers: [
      new ScatterplotLayer({
        id: "ports",
        data: ports,
        getPosition: (d) => d.geometry.coordinates,
        getFillColor: colorScheme,
        radiusScale: 100,
        radiusMinPixels: 1.5,
        radiusMaxPixels: 15,
        pickable: true,
        onHover: updatePortTooltip,
      }),
      new PathLayer({
        id: "paths",
        data: paths,
        getPath: (d) => d.path,
        getColor: [255, 255, 255, 50],
        widthScale: 75,
        widthMinPixels: 1,
        widthMaxPixels: 10,
        pickable: true,
      }),
      new ArcLayer({
        id: "h3-flows",
        data: flows,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getSourceColor: (d) => {
          const intensity = d.intensity / maxIntensity;
          return [
            100 + intensity * 155,
            150 + intensity * 105,
            200 + intensity * 55,
            150 + intensity * 105,
          ];
        },
        getTargetColor: (d) => {
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
        greatCircle: true,
        parameters: {
          depthTest: false,
          blend: true,
        },
        visible: layerVisibility.flows,
      }),
      new ScatterplotLayer({
        id: "ships",
        data: ships,
        filled: true,
        getPosition: (d) => [d.position.longitude, d.position.latitude],
        getFillColor: [255, 0, 0],
        radiusScale: 75,
        radiusMinPixels: 0.75,
        radiusMaxPixels: 10,
        pickable: true,
        onHover: updateShipTooltip,
      }),
      new GeoJsonLayer({
        id: "chokepoints",
        data: chokepoints,
        pointType: "circle",
        filled: true,
        stroked: true,
        getLineColor: [255, 255, 255],
        lineWidthMinPixels: 2,
        getFillColor: [255, 215, 0, 220],
        pointRadiusMaxPixels: 12,
        pointRadiusMinPixels: 6,
        pickable: true,
        onHover: updateChokepointTooltip,
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

// Preload all flow resolutions, then initialize map
preloadAllFlows().then(() => {
  updateMap().then(() => {
    mapInitialized = true;
    console.log("Initial map update complete, zoom-responsive flows enabled");

    map.on("zoom", () => {
      updateFlowLayer();
    });

    map.on("moveend", () => {
      updateFlowLayer();
    });

    startPeriodicUpdates();
  });
});

async function layersSetup() {
  const { ports, ships, chokepoints } = await fetchData();

  const portsUl = document.getElementById("mpj");
  const shipsUl = document.getElementById("mpjj");
  const chokepointsUl = document.getElementById("mpjjj");

  for (const port of ports) {
    portsUl.innerHTML += `<li><label>${port.properties.name}</label><li>`;
  }

  /*
  const filteredShips = ships.filter(
    (ship) =>
      ship.latitude > 47 &&
      ship.latitude < 50 &&
      ship.longitude > 7 &&
      ship.longitude < 10,
  );

  // Then sort the filtered ships alphabetically by name, with a check for undefined or null names
  filteredShips.sort((a, b) => {
    const nameA = a.name ? a.name : ""; // Ensure name is not undefined
    const nameB = b.name ? b.name : ""; // Ensure name is not undefined
    return nameA.localeCompare(nameB);
  });

  // Add the sorted ships to the shipsUl list
  for (const ship of filteredShips) {
    shipsUl.innerHTML += `<li><label>${ship.name}</label><li>`;
  }
  */

  for (const chokepoint of chokepoints) {
    chokepointsUl.innerHTML += `<li><label>${chokepoint.properties.name}</label><li>`;
  }

  portsUl.querySelectorAll("li").forEach(function (li) {
    for (const port of ports) {
      li.addEventListener("mouseenter", function () {
        if (li.innerHTML.replace(/<\/?label>/g, "") == port.properties.name) {
          updatePortTooltip({ object: port });
        }
      });

      li.addEventListener("click", function () {
        if (li.innerHTML.replace(/<\/?label>/g, "") == port.properties.name) {
          map.flyTo({
            center: port.geometry.coordinates,
            zoom: 11,
            speed: 1,
          });
        }
      });
    }
  });

  shipsUl.querySelectorAll("li").forEach(function (li) {
    li.addEventListener("mouseenter", function () {
      for (const ship of ships) {
        if (li.innerHTML.replace(/<\/?label>/g, "") == ship.name) {
          updateShipTooltip({ object: ship });
        }
      }
    });

    li.addEventListener("click", function () {
      for (const ship of ships) {
        if (li.innerHTML.replace(/<\/?label>/g, "") == ship.name) {
          map.flyTo({
            center: [ship.longitude, ship.latitude],
            zoom: 15,
            speed: 1,
          });
        }
      }
    });
  });

  chokepointsUl.querySelectorAll("li").forEach(function (li) {
    li.addEventListener("click", function () {
      for (const chokepoint of chokepoints) {
        if (
          li.innerHTML.replace(/<\/?label>/g, "") === chokepoint.properties.name
        ) {
          map.flyTo({
            center: [
              chokepoint.geometry.coordinates[0], // longitude
              chokepoint.geometry.coordinates[1], // latitude
            ],
            zoom: 8,
            speed: 1,
          });
        }
      }
    });
  });
}

async function updateShipIndicator() {
  const { ships } = await fetchData();

  const totalShips = ships.length;
  const latestShipUpdate = ships.reduce((latest, current) => {
    // reduce json to 1 object comparison-based
    const latestTime = new Date(latest.time);
    const currentTime = new Date(current.time);
    return currentTime > latestTime ? current : latest;
  }, ships[0]);
  const latestShip = ships[ships.length - 1];

  const indicatorDiv = document.getElementById("ship-indicator");
  indicatorDiv.innerHTML = ` 
    <p><strong> Total Ships: </strong> ${totalShips} <span class="blinking-dot"></span> </p> 
    <p><strong> Time: </strong> ${moment(latestShipUpdate.time).tz("Europe/Berlin").format("YYYY-MM-DD HH:mm:ss")} </p> 
    <p><strong> Updated: </strong> ${latestShipUpdate.name} </p>
    <p><strong> Added: </strong> ${latestShip.name} </p>
  `;
}

setInterval(updateShipIndicator, 30000); // update every second
layersSetup();
