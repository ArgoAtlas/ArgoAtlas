import ProximityGraph from "../models/proximityGraph.js";

export const k = 3;
const invphi = (Math.sqrt(5) - 1) / 2;

export default class EdgeBundling {
  static async findConnectionPoints(vertex) {
    let points = [];
    // approx. 100 m
    const maximumDistance = 0.0009;
    // const maximumDistance = 0.01;
    // console.log(vertex);

    for (const coord of vertex.coords) {
      const result = await ProximityGraph.aggregate([
        {
          $unwind: {
            path: "$coords",
          },
        },
        {
          $addFields: {
            distance: {
              $let: {
                vars: {
                  pow: {
                    $reduce: {
                      input: { $zip: { inputs: [coord, "$coords"] } },
                      initialValue: 0,
                      in: {
                        $add: [
                          "$$value",
                          {
                            $pow: [
                              {
                                $subtract: [
                                  { $arrayElemAt: ["$$this", 0] },
                                  { $arrayElemAt: ["$$this", 1] },
                                ],
                              },
                              2,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
                in: { $sqrt: "$$pow" },
              },
            },
          },
        },
        {
          $match: {
            _id: { $ne: vertex.id },
          },
        },
        {
          $match: {
            distance: { $lte: maximumDistance },
          },
        },
        {
          $sort: { distance: 1 },
        },
      ]).limit(k);

      points.push(result);
    }

    return points.flat();
  }

  static hav(x) {
    return Math.pow(Math.sin(x / 2), 2);
  }

  static archav(x) {
    return 2 * Math.asin(Math.sqrt(x));
  }

  static ink(node) {
    let total = 0;

    node.forEach((coord) => {
      // coord: [x1, y1, x2, y2]
      const x1Rad = (coord[0] * Math.PI) / 180;
      const y1Rad = (coord[1] * Math.PI) / 180;
      const x2Rad = (coord[2] * Math.PI) / 180;
      const y2Rad = (coord[3] * Math.PI) / 180;

      const xAbs = Math.abs(x1Rad - x2Rad);
      const yAbs = Math.abs(y1Rad - y2Rad);

      const havLat = this.hav(yAbs);
      const havLong = this.hav(xAbs);
      const havY = this.hav(y1Rad + y2Rad);

      const centralAngle = this.archav(havLat + (1 - havLat - havY) * havLong);
      const earthRadius = 63781000;

      // arc length on earth
      total += centralAngle * earthRadius;
    });

    return total;
  }

  static getCombinedEdge(firstNode, secondNode) {
    const combinedEdge = new ProximityGraph({
      coords: firstNode.coords.concat(secondNode.coords),
      neighbors: firstNode.neighbors.concat(secondNode.neighbors),
    });

    const centroids = this.computeCentroids(combinedEdge);
    combinedEdge.centroids = centroids;

    return combinedEdge;
  }

  static async getInkSavingNeighbor(node) {
    let bestNeighbor = null;
    let inkSaved = 0;

    for (const neighborID of node.neighbors) {
      const neighbor = await ProximityGraph.findById(neighborID);

      const combined = this.getCombinedEdge(node, neighbor);
      const bundleValues = this.computeBundleValues(node, neighbor);

      const inkSavedCombined =
        this.ink(node.coords) +
        this.ink(neighbor.coords) -
        this.costFunction(combined, combined.centroids, bundleValues[2]);

      if (inkSavedCombined > inkSaved) {
        inkSaved = inkSavedCombined;
        bestNeighbor = neighbor;
      }
    }
    return bestNeighbor;
  }

  static async coalesceNodes(groupCount) {
    for (let i = 0; i <= groupCount; i++) {
      const nodes = await ProximityGraph.find({ group: i });
      let data = new ProximityGraph({ coords: [], m1: [], m2: [], group: i });

      for (const node of nodes) {
        node.coords.forEach((coord) => data.coords.push(coord));
        data.m1 = node.m1;
        data.m2 = node.m2;

        await ProximityGraph.deleteOne({ _id: node.id });
      }

      await data.save();
    }
  }

  // to be minimized
  static totalInkNeeded(nodes, m1, m2) {
    // nodes: [[x1, y1, x2, y2], ...]
    // M1: [x, y]
    // M2: [x, y]
    let total = 0;

    for (const node of nodes.coords) {
      total += this.ink([[node[0], node[1], m1[0], m1[1]]]);
      total += this.ink([[node[2], node[3], m2[0], m2[1]]]);
    }

    total += this.ink([[m1[0], m1[1], m2[0], m2[1]]]);

    return total;
  }

  static computeCentroids(node) {
    let startCentroid = [0, 0];
    let endCentroid = [0, 0];

    for (const coord of node.coords) {
      startCentroid[0] += coord[0];
      startCentroid[1] += coord[1];
      endCentroid[0] += coord[2];
      endCentroid[1] += coord[3];
    }

    startCentroid[0] /= node.coords.length;
    startCentroid[1] /= node.coords.length;
    endCentroid[0] /= node.coords.length;
    endCentroid[1] /= node.coords.length;

    console.log(startCentroid, endCentroid);

    return [startCentroid, endCentroid];
  }

  static lerp(a, b, delta) {
    return [
      (1 - delta) * a[0] + delta * b[0],
      (1 - delta) * a[1] + delta * b[1],
    ];
  }

  static costFunction(nodes, centroids, x) {
    const startCentroid = centroids[0];
    const endCentroid = centroids[1];

    const m1 = this.lerp(startCentroid, endCentroid, x / 2);
    const m2 = this.lerp(startCentroid, endCentroid, 1 - x / 2);

    return this.totalInkNeeded(nodes, m1, m2);
  }

  static goldenSectionSearch(nodes, centroids, a, b, tolerance = 0.00001) {
    while (b - a > tolerance) {
      const c = b - (b - a) * invphi;
      const d = a + (b - a) * invphi;

      if (
        this.costFunction(nodes, centroids, c) <
        this.costFunction(nodes, centroids, d)
      ) {
        b = d;
      } else {
        a = c;
      }
    }

    return (b + a) / 2;
  }

  static computeBundleValues(firstNode, secondNode) {
    const combinedEdge = this.getCombinedEdge(firstNode, secondNode);

    const x = this.goldenSectionSearch(
      combinedEdge,
      combinedEdge.centroids,
      0,
      1,
    );

    const m1 = this.lerp(
      combinedEdge.centroids[0],
      combinedEdge.centroids[1],
      x / 2,
    );
    const m2 = this.lerp(
      combinedEdge.centroids[0],
      combinedEdge.centroids[1],
      1 - x / 2,
    );

    return [m1, m2, x];
  }

  static async bundleEdges(firstNode, secondNode) {
    const bundleValues = this.computeBundleValues(firstNode, secondNode);

    firstNode.m1 = bundleValues[0];
    firstNode.m2 = bundleValues[1];
    secondNode.m1 = bundleValues[0];
    secondNode.m2 = bundleValues[1];

    await firstNode.save();
    await secondNode.save();
  }

  static async performEdgeBundling() {
    let totalGain = 0;
    let gain = 0;
    const ungrouped = -1;

    do {
      gain = 0;
      let n = 0;
      await ProximityGraph.updateMany({}, { group: -1 });
      const nodes = await ProximityGraph.find({});
      console.log(nodes.length);

      for (const node of nodes) {
        if (node.group === ungrouped) {
          const neighbor = await this.getInkSavingNeighbor(node);
          console.log(neighbor);

          if (neighbor === null) continue; // no neighbor found that saves ink

          const combined = this.getCombinedEdge(node, neighbor);
          const bundleValues = this.computeBundleValues(node, neighbor);

          const inkGain =
            this.ink(node.coords) +
            this.ink(neighbor.coords) -
            this.costFunction(combined, combined.centroids, bundleValues[2]);

          if (inkGain > 0) {
            await this.bundleEdges(node, neighbor);
            gain += inkGain;
            if (node.group !== ungrouped) {
              neighbor.group = node.group;
            } else {
              node.group = n;
              neighbor.group = n;
            }
          } else {
            neighbor.group = n;
          }

          n += 1;
          node.save();
          neighbor.save();
        }
      }

      await this.coalesceNodes(n);
      totalGain += gain;
    } while (gain > 0);

    return totalGain;
  }
}
