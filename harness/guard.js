#!/usr/bin/env node
// The method's guards for sketchflow (spec/README.md, "Checks"):
//   - every behavior in spec/ has a check, and every check's tag names a
//     behavior that exists;
//   - every frozen check file is unchanged (harness/frozen.json).
// `node harness/guard.js --freeze <file>...` records files as frozen.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = new URL("..", import.meta.url).pathname;
const frozenPath = path.join(root, "harness/frozen.json");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const rel = (f) => path.relative(root, f);

const args = process.argv.slice(2);
if (args[0] === "--freeze") {
  const frozen = fs.existsSync(frozenPath) ? JSON.parse(fs.readFileSync(frozenPath, "utf8")) : {};
  for (const f of args.slice(1)) frozen[rel(path.resolve(f))] = sha(path.resolve(f));
  fs.writeFileSync(frozenPath, JSON.stringify(frozen, null, 2) + "\n");
  console.log(`frozen: ${args.slice(1).join(", ")}`);
  process.exit(0);
}

const problems = [];

// Behaviors: "- **B3.** (R2, L0, ...)" under a spec file, not struck through.
const behaviors = new Map();
for (const f of walk(path.join(root, "spec")).filter((f) => f.endsWith(".md") && rel(f) !== "spec/README.md")) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/^- \*\*B(\d+)\.\*\* \(([^)]*)\)/gm)) {
    behaviors.set(`${path.basename(f)}#B${m[1]}`, m[2]);
  }
}

// Checks: test("cli.md#B1 cli.md#B2 ...") in test/*.test.js.
const covered = new Set();
let untagged = 0;
for (const f of walk(path.join(root, "test")).filter((f) => f.endsWith(".test.js"))) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/\btest\(\s*(["'`])(.+?)\1/g)) {
    const tags = [...m[2].matchAll(/([\w-]+\.md#B\d+)/g)].map((t) => t[1]);
    if (!tags.length) { untagged++; console.warn(`untagged check (spike): ${rel(f)}: ${m[2]}`); }
    for (const t of tags) {
      if (!behaviors.has(t)) problems.push(`${rel(f)}: "${m[2]}" names ${t}, which no spec defines`);
      covered.add(t);
    }
  }
}
for (const b of behaviors.keys()) if (!covered.has(b)) problems.push(`${b} has no check`);

// Frozen checks.
const frozen = fs.existsSync(frozenPath) ? JSON.parse(fs.readFileSync(frozenPath, "utf8")) : {};
for (const [f, h] of Object.entries(frozen)) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) problems.push(`${f} is frozen but missing`);
  else if (sha(p) !== h) problems.push(`${f} is frozen and has changed: a wrong check is an ask (asks/), not an edit`);
}

for (const p of problems) console.error(`guard: ${p}`);
console.log(`guard: ${behaviors.size} behaviors, ${covered.size} covered, ${untagged} untagged checks, ${Object.keys(frozen).length} frozen files`);
process.exit(problems.length ? 1 : 0);
