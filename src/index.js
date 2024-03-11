import * as d3 from "d3";

const socket = new WebSocket("ws://localhost:3000");

const width = window.innerWidth;
const height = window.innerHeight;

const canvas = d3
  .select("#container")
  .append("canvas")
  .attr("width", width)
  .attr("height", height)
  .node();
const context = canvas.getContext("2d");

const projection = d3.geoEquirectangular();
const geoGenerator = d3.geoPath().projection(projection).context(context);

function updateMap(json) {
  projection.fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    json,
  );

  context.beginPath();
  geoGenerator({ type: "FeatureCollection", features: json.features });
  context.stroke();
  context.closePath();
}

d3.json("countries.json").then((data) => updateMap(data));

socket.onmessage = function (event) {
  const message = JSON.parse(event.data);

  if (message.MessageType === "PositionReport") {
    const coords = projection([
      message.MetaData.longitude,
      message.MetaData.latitude,
    ]);

    context.beginPath();
    context.fillStyle = "red";
    context.arc(coords[0], coords[1], 1.2, 0, 2 * Math.PI);
    context.fill();
  }
};
