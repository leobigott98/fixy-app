import { registerHooks } from "node:module";
import { extname } from "node:path";

const projectRoot = new URL("../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/cache") {
      return nextResolve("next/cache.js", context);
    }

    if (specifier === "next/navigation") {
      return nextResolve("next/navigation.js", context);
    }

    if (!specifier.startsWith("@/")) {
      return nextResolve(specifier, context);
    }

    const projectRelativePath = specifier.slice(2);
    const resolvedPath = extname(projectRelativePath)
      ? projectRelativePath
      : `${projectRelativePath}.ts`;

    return nextResolve(new URL(resolvedPath, projectRoot).href, context);
  },
});
