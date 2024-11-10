import ProximityGraph from "../models/proximityGraph.js";

export const k = 3;

export default class EdgeBundling {
  static hav(x) {
    return Math.pow(Math.sin(x / 2), 2);
  }

  static archav(x) {
    return 2 * Math.asin(Math.sqrt(x));
  }

  static async findConnectionPoints(vertex) {
    // do knn search
    const points = await ProximityGraph.aggregate([
      {
        $addFields: {
          distance: {
            $let: {
              vars: {
                pow: {
                  $reduce: {
                    input: { $zip: { inputs: [vertex.coords, "$coords"] } },
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
        $sort: { distance: 1 },
      },
    ]).limit(k);

    return points;
  }

  static ink(coords) {
    // coords: [x1, y1, x2, y2]
    const x1Rad = (coords[0] * Math.PI) / 180;
    const y1Rad = (coords[1] * Math.PI) / 180;
    const x2Rad = (coords[2] * Math.PI) / 180;
    const y2Rad = (coords[3] * Math.PI) / 180;

    const xAbs = Math.abs(x1Rad - x2Rad);
    const yAbs = Math.abs(y1Rad - y2Rad);

    const havLat = this.hav(yAbs);
    const havLong = this.hav(xAbs);
    const havY = this.hav(y1Rad + y2Rad);

    const centralAngle = this.archav(havLat + (1 - havLat - havY) * havLong);
    const earthRadius = 63781000;

    // arc length on earth
    return centralAngle * earthRadius;
  }

  static computeCentroids(nodes) {
    let startCentroid = [0, 0];
    let endCentroid = [0, 0];

    for (const node of nodes) {
      startCentroid[0] += node[0];
      startCentroid[1] += node[1];
      endCentroid[0] += node[2];
      endCentroid[1] += node[3];
    }

    startCentroid[0] /= nodes.length;
    startCentroid[1] /= nodes.length;
    endCentroid[0] /= nodes.length;
    endCentroid[1] /= nodes.length;

    console.log(startCentroid, endCentroid);

    return [startCentroid, endCentroid];
  }

  static goldenSectionSearch(nodes, centroids) {}
}
