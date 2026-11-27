// L0 checks for spec/specs/cli.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { cli, example, tmp, root } from "./helpers.js";

test("cli.md#B1 --help prints the usage on stderr and exits 0", () => {
  const r = cli(["--help"]);
  assert.equal(r.code, 0);
  assert.match(r.err, /^usage: sketchflow /m);
  assert.equal(r.out, "");
});

test("cli.md#B2 no flow prints the usage on stderr and exits 2", () => {
  const r = cli([]);
  assert.equal(r.code, 2);
  assert.match(r.err, /^usage: sketchflow /m);
});

test("cli.md#B3 an unknown option is named, renders nothing, and exits 2", () => {
  const out = tmp();
  const r = cli(["--frobnicate", example, "--out", out]);
  assert.equal(r.code, 2);
  assert.match(r.err, /unknown option --frobnicate/);
  assert.match(r.err, /^usage: sketchflow /m);
  assert.deepEqual(fs.readdirSync(out), []);
});

test("cli.md#B4 an option missing its value is named and exits 2", () => {
  for (const opt of ["--formats", "--out", "--chrome", "--gif-encoder"]) {
    const r = cli([example, opt]);
    assert.equal(r.code, 2, opt);
    assert.match(r.err, new RegExp(`${opt} needs a value`), opt);
    assert.match(r.err, /^usage: sketchflow /m, opt);
    assert.doesNotMatch(r.err, /TypeError|at file:/, opt);
  }
});

test("cli.md#B5 rendering prints each written file's path on stdout", () => {
  const out = tmp();
  const r = cli([example, "--formats", "svg", "--out", out]);
  assert.equal(r.code, 0, r.err);
  const lines = r.out.trim().split("\n");
  assert.deepEqual(lines, [path.join(out, "deploy.svg")]);
  assert.ok(fs.existsSync(lines[0]));
});

test("cli.md#B6 a failing flow is reported once by name, the next flow still renders, and the exit is 1", () => {
  const out = tmp();
  const missing = path.join(out, "missing.flow.yaml");
  const r = cli([missing, example, "--formats", "svg", "--out", out]);
  assert.equal(r.code, 1);
  const errs = r.err.trim().split("\n");
  assert.equal(errs.length, 1, r.err);
  assert.ok(errs[0].startsWith(`${missing}: `), errs[0]);
  assert.equal(errs[0].split(missing).length - 1, 1, "names the flow once");
  assert.match(errs[0], /no such file/);
  assert.ok(fs.existsSync(path.join(out, "deploy.svg")));
});

test("cli.md#B7 an unknown format is named and the known ones listed", () => {
  const out = tmp();
  const r = cli([example, "--formats", "svg,png", "--out", out]);
  assert.equal(r.code, 1);
  assert.match(r.err, /"png"/);
  for (const f of ["svg", "html", "mp4", "webm", "gif"]) assert.match(r.err, new RegExp(`\\b${f}\\b`));
});

test("cli.md#B8 --out creates a folder that does not exist yet", () => {
  const out = path.join(tmp(), "a", "b");
  const r = cli([example, "--formats", "svg", "--out", out]);
  assert.equal(r.code, 0, r.err);
  assert.ok(fs.existsSync(path.join(out, "deploy.svg")));
});

test("cli.md#B9 --version prints sketchflow and package.json's version", () => {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const r = cli(["--version"]);
  assert.equal(r.code, 0);
  assert.equal(r.out, `sketchflow ${version}\n`);
});
