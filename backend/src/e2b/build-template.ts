import "dotenv/config";
import { Template, defaultBuildLogger } from "e2b";
import { template } from "./template";
import { E2B_TEMPLATE } from "../config/constant";

const info = await Template.build(template, E2B_TEMPLATE, {
  cpuCount: 2,
  memoryMB: 2048,
  onBuildLogs: defaultBuildLogger(),
});

console.log("template ready", info);
