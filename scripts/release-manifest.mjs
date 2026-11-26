import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, resolve, basename } from "node:path";

const directory = resolve(process.argv[2] ?? "release-artifacts");
const [pack] = JSON.parse(await readFile(join(directory, "pack.json"), "utf8"));
if (
  basename(pack.filename) !== pack.filename ||
  !pack.filename.endsWith(".tgz")
)
  throw new Error("Invalid tarball filename");
const bytes = await readFile(resolve(pack.filename));
const sha512 = createHash("sha512").update(bytes).digest("base64");
if ("sha512-" + sha512 !== pack.integrity)
  throw new Error("Packed artifact integrity mismatch");
const manifest = {
  schemaVersion: 1,
  name: pack.name,
  version: pack.version,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  node: process.version,
  filename: pack.filename,
  bytes: bytes.length,
  integrity: pack.integrity,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  files: pack.files.map((file) => file.path),
};
await writeFile(
  join(directory, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
await writeFile(
  join(directory, "checksums.txt"),
  manifest.sha256 + "  " + manifest.filename + "\n",
);
console.log(JSON.stringify(manifest, null, 2));
