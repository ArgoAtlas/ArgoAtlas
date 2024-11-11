import Graph from "../models/graph.js";
import ProximityGraph from "../models/proximityGraph.js";
import EdgeBundling from "./edgeBundling.js";

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

    const newVertex = new ProximityGraph({
      coords: [
        sourceVertex.position[0],
        sourceVertex.position[1],
        destinationVertex.position[0],
        destinationVertex.position[1],
      ],
    });

    const connectionPoints = await EdgeBundling.findConnectionPoints(newVertex);

    for (const point of connectionPoints) {
      if (newVertex.id === point._id) continue;

      newVertex.neighbors.push(point._id);
      const editPoint = await ProximityGraph.findById(point._id);
      editPoint.neighbors.push(newVertex.id);
      editPoint.save();
    }

    newVertex.save();
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

    for (const adjacentVertex of vertex.adjacentVertices)
      await this.removeEdge(id, adjacentVertex);

    await Graph.findByIdAndDelete(id);
  }
}
