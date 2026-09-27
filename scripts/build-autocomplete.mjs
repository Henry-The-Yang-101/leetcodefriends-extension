import { build } from "esbuild";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("monaco-pyright-lsp/package.json"));
const lodashRoot = dirname(require.resolve("@types/lodash/package.json"));
const vendor = new URL("../vendor/", import.meta.url);

await mkdir(vendor, { recursive: true });
await build({
  entryPoints: [new URL("../src/pyright-entry.js", import.meta.url).pathname],
  outfile: new URL("../vendor/pyright-client.js", import.meta.url).pathname,
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "chrome120"
});
await copyFile(join(packageRoot, "dist/worker.js"), new URL("../vendor/pyright-worker.js", import.meta.url));
await copyFile(join(packageRoot, "LICENSE"), new URL("../vendor/monaco-pyright-lsp.LICENSE", import.meta.url));

// Keep DefinitelyTyped's declarations as separate virtual files so Monaco's
// TypeScript worker can follow their reference paths.
const files = ["index.d.ts", ...(await readdir(join(lodashRoot, "common"))).filter(name => name.endsWith(".d.ts")).map(name => `common/${name}`)];
const lodashTypes = await Promise.all(files.map(async name => ({
  path: `file:///node_modules/@types/lodash/${name}`,
  source: await readFile(join(lodashRoot, name), "utf8")
})));
await writeFile(new URL("../vendor/lodash-types.js", import.meta.url),
  `window.__lcfLodashTypes = ${JSON.stringify(lodashTypes)};\n`);

const pythonStubRoot = new URL("../src/python-stubs/sortedcontainers/", import.meta.url);
const pythonStubFiles = (await readdir(pythonStubRoot)).filter(name => name.endsWith(".pyi"));
const sortedcontainers = Object.fromEntries(await Promise.all(pythonStubFiles.map(async name =>
  [name, await readFile(new URL(name, pythonStubRoot), "utf8")]
)));
await writeFile(new URL("../vendor/python-stubs.js", import.meta.url),
  `window.__lcfPythonStubs = ${JSON.stringify({ sortedcontainers })};\n`);
