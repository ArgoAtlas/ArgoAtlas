import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MVTLayer } from "@deck.gl/geo-layers";
import { TerrainLayer } from "@deck.gl/geo-layers";
import { LineLayer } from "@deck.gl/layers";
import { PathLayer } from "@deck.gl/layers";

const serverAddress = "http://localhost:3000";
const darkStyle =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const lightStyle =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Test

async function fetchGeoJsonData(url) {
  const response = await fetch(url);
  return await response.json();
}

function getRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return [r, g, b, 255];
}

function createPathsFromPoints(points) {
  const paths = [];
  const numPaths = Math.floor(Math.random() * points.length) + 1;

  for (let i = 0; i < numPaths; i++) {
    const numPointsInPath = Math.floor(Math.random() * points.length) + 2;

    let currentIndex = Math.floor(Math.random() * points.length);
    const path = [points[currentIndex].geometry.coordinates];
    const pathColor = getRandomColor();

    for (let j = 1; j < numPointsInPath; j++) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * points.length);
      } while (nextIndex === currentIndex);

      path.push(points[nextIndex].geometry.coordinates);
      currentIndex = nextIndex;
    }

    console.log("Generated path:", path); // Log the path

    paths.push({
      path: path,
      color: pathColor,
    });
  }

  return paths;
}

function interpolate(point1, point2, factor) {
  return [
    point1[0] + (point2[0] - point1[0]) * factor,
    point1[1] + (point2[1] - point1[1]) * factor,
  ];
}

function edgeBundling(paths, numIntermediatePoints = 1000) {
  const bundledPaths = [];

  for (const pathObj of paths) {
    const path = pathObj.path;
    const color = pathObj.color;

    const newPath = [];
    for (let i = 0; i < path.length - 1; i++) {
      newPath.push(path[i]);

      for (let j = 1; j <= numIntermediatePoints; j++) {
        const factor = j / (numIntermediatePoints + 1);
        const intermediatePoint = interpolate(path[i], path[i + 1], factor);
        newPath.push(intermediatePoint);
      }
    }

    newPath.push(path[path.length - 1]); // Add the last point

    bundledPaths.push({
      path: newPath,
      color: color,
    });
  }
  return bundledPaths;
}

const map = new Map({
  container: "map",
  style: window.matchMedia("(prefers-color-scheme: dark)").match
    ? darkStyle
    : lightStyle,
  center: [0.45, 51.47],
  zoom: 2,
  maxZoom: 12,
  minZoom: 1,
});
map.scrollZoom.setZoomRate(1 / 500);
map.scrollZoom.setWheelZoomRate(1 / 500);

window
  .matchMedia("(prefers-color-scheme: light)")
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

  // Test

  const edgeBundlingData = await fetchGeoJsonData(
    "https://gist.githubusercontent.com/mcwhittemore/1f81416ff74dd64decc6/raw/f34bddb3bf276a32b073ba79d0dd625a5735eedc/usa-state-capitals.geojson",
  );

  const ports = await portsResponse.json();
  const ships = await shipsResponse.json();

  // Test

  // Linien erstellen
  const paths = createPathsFromPoints(edgeBundlingData.features);
  const bundledPaths = edgeBundling(paths);

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
      new GeoJsonLayer({
        id: "edge-bundeling-test-data",
        data: "https://gist.githubusercontent.com/mcwhittemore/1f81416ff74dd64decc6/raw/f34bddb3bf276a32b073ba79d0dd625a5735eedc/usa-state-capitals.geojson",
        filled: true,
        stroked: true,
        getLineColor: [0, 255, 0],
        getFillColor: [0, 255, 0],
        pointRadiusMaxPixels: 5,
        pointRadiusMinPixels: 5,
        pickable: true,
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
      new PathLayer({
        id: "edge-bundeling-paths",
        data: bundledPaths,
        getPath: (d) => d.path,
        //getColor: d => d.color,
        getColor: [0, 0, 0, 25],
        getWidth: 2,
        widthMinPixels: 2,
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
    ],
  });

  setTimeout(updateMap, 5000);
}

map.addControl(deckOverlay);

updateMap();
