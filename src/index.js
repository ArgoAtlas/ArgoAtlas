import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { Map } from "maplibre-gl";

import moment from "moment-timezone";

const serverAddress = "http://192.168.188.23:5000"; // instead of http://localhost:5000 to access data from other devices as well
const darkStyle =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const lightStyle =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const map = new Map({
  container: "map",
  style: window.matchMedia("(prefers-color-scheme: dark)").matches
    ? darkStyle
    : lightStyle,
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

function convertGeoToScreen([longitude, latitude]) {
  const point = map.project([longitude, latitude]);
  return [point.x, point.y]; // Return the x and y pixel positions
}

const deckOverlay = new MapboxOverlay({
  interleaved: true,
  layers: [],
  getCursor: () => "default", // set cursor style to default instead of hand
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

let showchokepointsSecondary = true;
const chokepointsSecondaryCheck = document.getElementById(
  "chokepointsSecondaryCheck",
);
chokepointsSecondaryCheck.addEventListener("change", function () {
  if (showchokepointsSecondary) {
    map.setLayoutProperty("chokepointsSecondary", "visibility", "none");
    showchokepointsSecondary = false;
  } else {
    map.setLayoutProperty("chokepointsSecondary", "visibility", "visible");
    showchokepointsSecondary = true;
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

    const [x, y] = convertGeoToScreen([object.longitude, object.latitude]);
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
    tooltipEntries.appendChild(createTooltipEntry("Last Update:", object.time));
  } else {
    tooltip.style.display = "none";
  }
}

async function fetchData() {
  const [
    portsResponse,
    shipsResponse,
    chokepointsResponse,
    chokepointsSecondaryResponse,
  ] = await Promise.all([
    fetch(`${serverAddress}/ports`),
    fetch(`${serverAddress}/ships`),
    fetch(`${serverAddress}/chokepoints`),
    fetch(`${serverAddress}/chokepointsSecondary`),
  ]);

  const ports = await portsResponse.json();
  const ships = await shipsResponse.json();
  const chokepoints = await chokepointsResponse.json();
  const chokepointsSecondary = await chokepointsSecondaryResponse.json();

  return { ports, ships, chokepoints, chokepointsSecondary }; // return all datasets -> to be used in other functions
}

async function updateMap() {
  const { ports, ships, chokepoints, chokepointsSecondary } = await fetchData();

  deckOverlay.setProps({
    layers: [
      new ScatterplotLayer({
        id: "chokepoints",
        data: chokepoints,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: [255, 0, 0, 100], // rgba
        getLineColor: [0, 0, 0],
        radiusScale: 60000, // prevent radius scaling after zooming far in
        radiusMinPixels: 12,
        pickable: true,
      }),
      new ScatterplotLayer({
        id: "chokepointsSecondary",
        data: chokepointsSecondary,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: [255, 0, 0, 100], // rgba
        getLineColor: [0, 0, 0],
        radiusScale: 20000, // prevent radius scaling after zooming far in
        radiusMinPixels: 7,
        pickable: true,
      }),
      new ScatterplotLayer({
        id: "ports",
        data: ports,
        getPosition: (d) => d.geometry.coordinates,
        getFillColor: [255, 226, 82],
        radiusScale: 100,
        radiusMinPixels: 1.5,
        radiusMaxPixels: 15,
        pickable: true,
        onHover: updatePortTooltip,
      }),
      new ScatterplotLayer({
        id: "ships",
        data: ships,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: [255, 0, 0],
        radiusScale: 75,
        radiusMinPixels: 0.75,
        radiusMaxPixels: 10,
        pickable: true,
        onHover: updateShipTooltip,
      }),
    ],
  });

  setTimeout(updateMap, 1000);
}
map.addControl(deckOverlay);

async function layersSetup() {
  const { ports, ships, chokepoints, chokepointsSecondary } = await fetchData();

  const portsUl = document.getElementById("mpj");
  const shipsUl = document.getElementById("mpjj");
  const chokepointsUl = document.getElementById("mpjjj");
  const chokepointsSecondaryUl = document.getElementById("mpjjjj");

  for (const port of ports) {
    portsUl.innerHTML += `<li><label>${port.properties.name}</label><li>`;
  }
  for (const ship of ships) {
    if (
      ship.latitude > 47 &&
      ship.latitude < 50 &&
      ship.longitude > 7 &&
      ship.longitude < 10
    ) {
      // Ships in the area of Baden-Württemberg
      shipsUl.innerHTML += `<li><label>${ship.name}</label><li>`;
    }
  }
  for (const chokepoint of chokepoints) {
    chokepointsUl.innerHTML += `<li><label>${chokepoint.name}</label><li>`;
  }
  for (const chokepointSecondary of chokepointsSecondary) {
    chokepointsSecondaryUl.innerHTML += `<li><label>${chokepointSecondary.id}</label><li>`;
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

updateMap();
setInterval(updateShipIndicator, 1000); // update every second
layersSetup();
