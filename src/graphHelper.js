import Graph from "../models/graph.js";
import ProximityGraph from "../models/proximityGraph.js";

export default class GraphHelper {
  static async addVertex(position) {
    await Graph.create({ position, adjacentVertices: [] });
  }

  static async addEdge(sourceId, destinationId) {
    const sourceVertex = await Graph.findById(sourceId);
    const destinationVertex = await Graph.findById(destinationId);

    if (!sourceVertex || !destinationVertex) return;

    sourceVertex.adjacentVertices.push(destinationId);
    destinationVertex.adjacentVertices.push(sourceId);

    sourceVertex.save();
    destinationVertex.save();

    await ProximityGraph.create({
      coords: [
        sourceVertex.position[0],
        sourceVertex.position[1],
        destinationVertex.position[0],
        destinationVertex.position[1],
      ],
    });
  }

  static async removeEdge(sourceId, destinationId) {
    const sourceVertex = await Graph.findById(sourceId);
    const destinationVertex = await Graph.findById(destinationId);

    if (!sourceVertex || !destinationVertex) return;

    sourceVertex.adjacentVertices = sourceVertex.adjacentVertices.filter(
      (vertex) => vertex !== destinationId,
    );

    destinationVertex.adjacentVertices = sourceVertex.adjacentVertices.filter(
      (vertex) => vertex !== sourceId,
    );

    sourceVertex.save();
    destinationVertex.save();
  }

  static async removeVertex(id) {
    const vertex = await Graph.findById(id);

    if (!vertex) return;

    vertex.adjacentVertices.forEach((adjacentVertex) =>
      this.removeEdge(id, adjacentVertex),
    );

    await Graph.findByIdAndDelete(id);
  }
}
