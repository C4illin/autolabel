import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const major = pkg.engines.node.match(/\d+/)[0];

const errors = [];
if (!readFileSync("action.yml", "utf8").includes(`using: "node${major}"`)) {
  errors.push(`action.yml "using" runtime does not match engines.node (node${major})`);
}
if (!pkg.scripts.build.includes(`--target=node${major}`)) {
  errors.push(`build script --target does not match engines.node (node${major})`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
