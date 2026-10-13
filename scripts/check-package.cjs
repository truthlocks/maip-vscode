// Fail before packaging if Marketplace would reject the bundled brand icon.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const icon = fs.readFileSync(path.join(root, manifest.icon));
assert(icon.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "Marketplace icon must be PNG");
const width = icon.readUInt32BE(16), height = icon.readUInt32BE(20);
assert(width >= 128 && height >= 128 && width <= 1024 && height <= 1024,
  `Marketplace icon dimensions ${width}x${height} must be between 128 and 1024 pixels`);
assert(fs.readFileSync(path.join(root, "README.md"), "utf8").includes("Configure Credentials"), "Updated README is missing");
console.log(`Marketplace package checks passed: ${width}x${height} PNG and updated README`);
