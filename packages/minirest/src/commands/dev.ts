import fs from "fs-extra";
import chokidar from "chokidar";
import cuid from "cuid";
import * as swc from "@swc/core";
import {
  resolve,
  join,
  relative as _relative,
  parse,
  dirname,
  extname,
  basename,
} from "path";

export const dev = async () => {
  const srcDir = resolve(process.cwd(), "src");
  const outDir = resolve(process.cwd(), ".minirest");
  const routesPath = join(outDir, "routes.json");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  // Create package.json
  await fs.writeJSON(join(outDir, "package.json"), {
    type: "commonjs",
  });

  const routes: Record<string, any> = {};

  const watcher = chokidar.watch(join(srcDir, "**/*.ts"));

  async function transform(path: string, outputPath: string) {
    const output = await swc.transformFile(path, {
      module: { type: "commonjs" },
    });

    fs.writeFileSync(outputPath, output.code);
  }

  async function ensure(path: string) {
    const directory = dirname(path);
    fs.ensureDirSync(directory);
  }

  async function addRoute(relative: string, output: string, version: string) {
    const route = mapPathToRoute(relative);

    if (route === undefined) {
      return;
    }

    routes[route] = {
      path: output,
      version,
    };

    delete require.cache[join(outDir, output)];

    await fs.writeJSON(routesPath, { routes }, { spaces: 2 });
  }

  async function removeRoute(relative: string) {
    const route = mapPathToRoute(relative);

    if (route === undefined) {
      return;
    }

    delete routes[route];

    await fs.writeJSON(routesPath, { routes }, { spaces: 2 });
  }

  watcher.on("all", async (event, path, details) => {
    console.log(event.toUpperCase(), path);

    const relative = _relative(srcDir, path);
    const output = extension(relative, `.js`);
    const outputPath = join(outDir, output);

    if (event === "add" || event === "change") {
      await ensure(outputPath);
      await transform(path, outputPath);
      await addRoute(relative, output, cuid.slug());
    }

    if (event === "unlink") {
      await removeRoute(output);
    }
  });

  chokidar.watch(routesPath).on("all", async (event, path) => {
    const { routes } = (await fs.readJSON(path)) as {
      routes: Record<
        string,
        {
          path: string;
          version: string;
        }
      >;
    };

    for (const [route, { path, version }] of Object.entries(routes)) {
      app.all(route, async (request, response) => {
        try {
          const handler = require(join(outDir, path));

          if (handler.default) {
            response.send(handler.default(request, response));
            return;
          }

          if (request.method === "GET" && handler.get) {
            response.send(handler.get(request, response));
            return;
          }

          response.json(handler);
        } catch (e: any) {
          response.json({ message: e.message });
        }
      });
    }
  });

  const express = await import("express");

  const app = express.default();

  app.listen(3123, () => {
    console.log("Listening on :3123");
  });

  // const { code } = await swc.transform(
  //   `
  //   import express from 'express';
  //
  //   const app = express()
  //
  //   app.listen(3123, () => {
  //       console.log("Listening on :3123");
  //   });
  // `,
  //   {
  //     module: {
  //       type: "commonjs",
  //     },
  //     outputPath: join(outDir, "server.js"),
  //   }
  // );
  //
  // fs.writeFileSync(join(outDir, "server.js"), code);
  //
  // require(join(outDir, "server.js"));
};

function map(part: string) {
  if (part.startsWith("[") && part.endsWith("]")) {
    return `:${part.substring(1, part.length - 1)}`;
  }

  return part;
}

function mapPathsToRoutes(paths: string[]) {
  return paths.map(mapPathToRoute);
}

function mapPathToRoute(path: string) {
  if (!path.startsWith("routes")) {
    return undefined;
  }

  const parts = path.replace(/^routes/, "").split("/");
  const leaf = parts.pop();

  const segments = parts.map(map);

  if (leaf && leaf !== "index.ts") {
    segments.push(map(leaf));
  }

  return segments.join("/");
}

function extension(path: string, extension: string) {
  const base = basename(path, extname(path));
  return join(dirname(path), base + extension);
}
