import { latLngToCell, cellToLatLng, gridDisk } from "h3-js";
import FlowCell from "../models/flowCell.js";
import Path from "../models/path.js";

const RESOLUTIONS = {
  LOW: 3, // For world view (zoom 0-4)
  MEDIUM: 4, // For regional view (zoom 5-7)
  HIGH: 5, // For local view (zoom 8+)
};

export default class H3FlowAggregation {
  static areNeighborCells(cell1, cell2) {
    const neighbors = gridDisk(cell1, 1);
    return neighbors.includes(cell2);
  }

  static pathToH3Cells(startLon, startLat, endLon, endLat, resolution) {
    const startCell = latLngToCell(startLat, startLon, resolution);
    const endCell = latLngToCell(endLat, endLon, resolution);

    if (startCell === endCell) {
      return []; // Same cell, no flow
    }

    if (!this.areNeighborCells(startCell, endCell)) {
      return [];
    }

    return [startCell, endCell];
  }

  static async processShipPath(pathDoc, resolution) {
    if (!pathDoc.points || pathDoc.points.length < 2) {
      return 0;
    }

    const flows = new Map();

    // Process consecutive point pairs
    for (let i = 0; i < pathDoc.points.length - 1; i++) {
      const start = pathDoc.points[i];
      const end = pathDoc.points[i + 1];

      if (!start || !end || start.length < 2 || end.length < 2) continue;

      const [startLon, startLat] = start;
      const [endLon, endLat] = end;

      const cells = this.pathToH3Cells(
        startLon,
        startLat,
        endLon,
        endLat,
        resolution,
      );

      if (cells.length === 2) {
        const [sourceCell, targetCell] = cells;
        const flowKey = `${sourceCell}-${targetCell}`;

        if (!flows.has(flowKey)) {
          flows.set(flowKey, {
            sourceCell,
            targetCell,
            count: 0,
          });
        }

        flows.get(flowKey).count += 1;
      }
    }

    let updatedCount = 0;
    for (const [flowKey, flow] of flows) {
      const sourceCoords = cellToLatLng(flow.sourceCell);
      const targetCoords = cellToLatLng(flow.targetCell);

      await FlowCell.findOneAndUpdate(
        {
          sourceCell: flow.sourceCell,
          targetCell: flow.targetCell,
          resolution,
        },
        {
          $inc: { count: flow.count },
          $set: {
            sourceCoords: [sourceCoords[1], sourceCoords[0]], // [lon, lat]
            targetCoords: [targetCoords[1], targetCoords[0]], // [lon, lat]
            lastUpdated: new Date(),
          },
        },
        { upsert: true },
      );
      updatedCount++;
    }

    return updatedCount;
  }

  static async aggregateAllFlows() {
    console.log("Starting H3 flow aggregation...");
    const startTime = Date.now();

    const pathCount = await Path.countDocuments();
    if (pathCount === 0) {
      console.log("No paths to aggregate yet. Skipping flow aggregation.");
      return false;
    }

    console.log(`Found ${pathCount} paths to aggregate`);

    try {
      await FlowCell.deleteMany({});
    } catch (error) {
      console.log(
        "Note: FlowCell collection doesn't exist yet, will be created",
      );
    }

    for (const [level, resolution] of Object.entries(RESOLUTIONS)) {
      console.log(`Processing resolution ${level} (${resolution})...`);
      let processedPaths = 0;
      let totalFlows = 0;

      const pathCursor = Path.find({}).lean().cursor();

      for await (const pathDoc of pathCursor) {
        const flowCount = await this.processShipPath(pathDoc, resolution);
        totalFlows += flowCount;
        processedPaths++;

        if (processedPaths % 1000 === 0) {
          console.log(
            `  Processed ${processedPaths} paths, created ${totalFlows} flows`,
          );
        }
      }

      console.log(
        `  Completed ${level}: ${processedPaths} paths → ${totalFlows} flows`,
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Flow aggregation completed in ${duration}s`);

    return true;
  }

  static async updateFlowsIncremental(pathDoc) {
    for (const resolution of Object.values(RESOLUTIONS)) {
      await this.processShipPath(pathDoc, resolution);
    }
  }

  static async getFlowsForVisualization(resolution, minCount = 1) {
    const flows = await FlowCell.find({
      resolution,
      count: { $gte: minCount },
    })
      .lean()
      .sort({ count: -1 })
      .limit(10000); // Limit to top 10k flows for performance

    return flows.map((flow) => ({
      source: flow.sourceCoords,
      target: flow.targetCoords,
      count: flow.count,
      intensity: Math.log10(flow.count + 1),
    }));
  }

  static getResolutionForZoom(zoom) {
    if (zoom <= 4) return RESOLUTIONS.LOW;
    if (zoom <= 7) return RESOLUTIONS.MEDIUM;
    return RESOLUTIONS.HIGH;
  }

  static async cleanupOldFlows(daysOld = 7) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await FlowCell.deleteMany({
      lastUpdated: { $lt: cutoffDate },
      count: { $lt: 2 }, // Only delete low-traffic flows
    });
    console.log(`Cleaned up ${result.deletedCount} old flow cells`);
    return result.deletedCount;
  }
}
