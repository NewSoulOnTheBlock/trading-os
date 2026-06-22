import { build, context } from "esbuild";
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(root, "dist");
const srcAlias = resolve(root, "..", "src");

const watch = process.argv.includes("--watch");

/** Resolve the app's `@/...` path alias to ../src so we can reuse the analytics. */
const aliasPlugin = {
  name: "at-alias",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => ({
      path: resolve(srcAlias, args.path.slice(2)) + (args.path.endsWith(".ts") ? "" : ".ts"),
    }));
  },
};

const common = {
  bundle: true,
  format: "esm",
  target: "es2020",
  platform: "browser",
  sourcemap: false,
  legalComments: "none",
  plugins: [aliasPlugin],
  logLevel: "info",
};

async function run() {
  await mkdir(outdir, { recursive: true });
  const opts = {
    ...common,
    entryPoints: {
      background: resolve(root, "src/background.ts"),
      content: resolve(root, "src/content.ts"),
      popup: resolve(root, "src/popup.ts"),
    },
    outdir,
  };

  async function copyStatic() {
    await cp(resolve(root, "public"), outdir, { recursive: true });
  }

  if (watch) {
    const ctx = await context(opts);
    await ctx.watch();
    await copyStatic();
    console.log("watching…");
  } else {
    await build(opts);
    await copyStatic();
    console.log("built ->", outdir);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
