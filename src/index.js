import * as d3 from "d3";

const serverAddress = "http://localhost:5000";

const canvas = d3.select("#container").append("canvas").node();
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const context = canvas.getContext("2d");

const projection = d3.geoEquirectangular();
const geoGenerator = d3.geoPath().projection(projection).context(context);

const countries = await d3.json(`${serverAddress}/countries`);

async function drawCanvas(transform) {
  const response = await fetch(`${serverAddress}/ships`);
  const ships = await response.json();

  if (!transform) transform = d3.zoomIdentity;

  updateMap(countries, transform);

  ships.forEach((ship) => {
    const coords = projection([ship.longitude, ship.latitude]);

    context.beginPath();
    context.fillStyle = "red";
    context.arc(
      coords[0] + transform.x,
      coords[1] + transform.y,
      1.2 * transform.k,
      0,
      2 * Math.PI,
    );
    context.fill();
    context.closePath();
  });
}

function updateMap(json, transform) {
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
  context.save();
  context.beginPath();
  if (transform) {
    context.translate(transform.x, transform.y);
    context.scale(transform.k, transform.k);
  }
  geoGenerator({ type: "FeatureCollection", features: json.features });
  context.stroke();
  context.closePath();
  context.restore();
}

function zoomed(event) {
  drawCanvas(event.transform);
}

d3.select(canvas).call(
  d3
    .zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
      zoomed(event);
    }),
);

zoomed(d3.zoomIdentity);
d3.interval(drawCanvas, 1000);
