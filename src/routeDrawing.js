// In routeDrawing.js
import * as d3 from "d3";

export function drawGreatCircleRoute(
  projection,
  context,
  startPoint,
  endPoint,
) {
  const greatCircle = d3.geoInterpolate(startPoint, endPoint);
  const points = d3.range(0, 1.01, 0.01).map((t) => greatCircle(t));

  context.beginPath();
  points.forEach((p) => {
    const [x, y] = projection(p);
    context.lineTo(x, y);
  });
  context.strokeStyle = "navy";
  context.stroke();
}
