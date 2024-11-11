import ProximityGraph from "../models/proximityGraph.js";

export const k = 3;

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

  static goldenSectionSearch(nodes, centroids) {}
}
