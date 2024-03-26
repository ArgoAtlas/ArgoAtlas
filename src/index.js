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

const detachedContainer = document.createElement("custom");
const dataContainer = d3.select(detachedContainer);

const projection = d3.geoEquirectangular();
const geoGenerator = d3.geoPath().projection(projection).context(context);

function drawCanvas() {
  const elements = detachedContainer.childNodes;

  elements.forEach((d) => {
    const node = d3.select(d);

    context.beginPath();
    context.fillStyle = node.attr("fillStyle");
    context.arc(
      node.attr("x"),
      node.attr("y"),
      node.attr("radius"),
      node.attr("startAngle"),
      node.attr("endAngle"),
    );
    context.fill();
    context.closePath();
  });
}

function updateMap(json) {
  projection.fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    json,
  );

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  geoGenerator({ type: "FeatureCollection", features: json.features });
  context.stroke();
  drawCanvas();
  context.closePath();
}

function drawPoints(mmsi, message) {
  const detachedShip = detachedContainer.querySelector(`[mmsi="${mmsi}"]`);
  const coords = projection([message.Longitude, message.Latitude]);

  if (detachedShip) {
    const ship = d3.select(detachedShip);
    ship.attr("x", coords[0]).attr("y", coords[1]).attr("fillStyle", "blue");
    d3.json("countries.json").then((data) => updateMap(data));
  } else {
    dataContainer
      .append("custom")
      .classed("point", true)
      .attr("mmsi", mmsi)
      .attr("x", coords[0])
      .attr("y", coords[1])
      .attr("radius", 1.2)
      .attr("startAngle", 0)
      .attr("endAngle", 2 * Math.PI)
      .attr("fillStyle", "red");
  }
  drawCanvas();
}

d3.json("countries.json").then((data) => updateMap(data));

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.MessageType === "PositionReport") {
    drawPoints(message.MetaData.MMSI, message.Message.PositionReport);
  }
});
