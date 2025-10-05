#!/usr/bin/env node
import mongoose from "mongoose";
import config from "../config.json" with { type: "json" };
import H3FlowAggregation from "./h3FlowAggregation.js";
import FlowCell from "../models/flowCell.js";
import Path from "../models/path.js";

const command = process.argv[2];

async function main() {
  try {
    await mongoose.connect(config.dbURI);
    console.log("Connected to database");
  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    process.exit(1);
  }

  try {
    switch (command) {
      case "aggregate":
        console.log("Running flow aggregation...");
        await H3FlowAggregation.aggregateAllFlows();
        break;

      case "stats":
        console.log("\nFlow Statistics:");
        const pathCount = await Path.countDocuments();
        console.log(`Total paths: ${pathCount}`);

        for (const [level, resolution] of Object.entries({
          LOW: 3,
          MEDIUM: 4,
          HIGH: 5,
        })) {
          const flowCount = await FlowCell.countDocuments({ resolution });
          const topFlows = await FlowCell.find({ resolution })
            .sort({ count: -1 })
            .limit(5)
            .lean();

          console.log(`\nResolution ${level} (${resolution}):`);
          console.log(`  Total flows: ${flowCount}`);
          if (topFlows.length > 0) {
            console.log(`  Top 5 busiest flows:`);
            topFlows.forEach((flow, i) => {
              console.log(
                `    ${i + 1}. ${flow.count} ships (${flow.sourceCell} → ${flow.targetCell})`,
              );
            });
          }
        }
        break;

      case "cleanup":
        const days = parseInt(process.argv[3]) || 7;
        console.log(`Cleaning up flows older than ${days} days...`);
        await H3FlowAggregation.cleanupOldFlows(days);
        break;

      case "clear":
        console.log("Clearing all flow data...");
        const result = await FlowCell.deleteMany({});
        console.log(`Deleted ${result.deletedCount} flow cells`);
        break;

      default:
        console.log("ArgoAtlas Flow CLI");
        console.log("\nUsage:");
        console.log("  node src/flowCli.js <command>");
        console.log("\nCommands:");
        console.log("  aggregate  - Run flow aggregation on all paths");
        console.log("  stats      - Show flow statistics");
        console.log("  cleanup [days] - Clean up old flows (default: 7 days)");
        console.log("  clear      - Clear all flow data");
        break;
    }
  } catch (error) {
    console.error("Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log("\nDone!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
