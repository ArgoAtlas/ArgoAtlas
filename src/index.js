import * as d3 from "d3";

const serverAddress = "http://localhost:5000";

const canvas = d3.select("#container").append("canvas").node();
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const context = canvas.getContext("2d");

const projection = d3.geoEquirectangular();
const geoGenerator = d3.geoPath().projection(projection).context(context);

const countries = await d3.json(`${serverAddress}/countries`);

async function drawCanvas() {
  const response = await fetch(`${serverAddress}/ships`);
  const ships = await response.json();

  updateMap(countries);

  ships.forEach((ship) => {
    const coords = projection([ship.longitude, ship.latitude]);

    context.beginPath();
    context.fillStyle = "red";
    context.arc(coords[0], coords[1], 1.2, 0, 2 * Math.PI);
    context.fill();
    context.closePath();
  });
}

function updateMap(json) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  projection.fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    json,
  );

  canvas.width = width;
  canvas.height = height;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  geoGenerator({ type: "FeatureCollection", features: json.features });
  context.stroke();
  context.closePath();
}

updateMap(countries);
d3.interval(drawCanvas, 1000);
