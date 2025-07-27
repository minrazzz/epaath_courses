#!/usr/bin/env node
// scripts/genScreenPropsRegistry.mjs

import { writeFileSync, readFileSync } from "fs";
import { resolve, posix, basename } from "path";
import fg from "fast-glob";
import { parse } from "@babel/parser";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const traverse = require("@babel/traverse").default;

const __filename = new URL(import.meta.url).pathname;
const __dirname = resolve(__filename, "..");

async function generateScreenPropsRegistry() {
  const srcDir = resolve(__dirname, "../src");
  const templatesDir = resolve(srcDir, "templates");
  const registryDir = resolve(srcDir, "core/registries");

  const pattern = [
    `${templatesDir.replace(/\\/g, "/")}/**/screens/*.jsx`,
    `${templatesDir.replace(/\\/g, "/")}/**/screens/*.tsx`,
  ];
  const files = await fg(pattern);
  const screenMeta = {};

  for (const absPath of files) {
    const code = readFileSync(absPath, "utf8");
    const ast = parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "classProperties",
        "objectRestSpread",
        "exportDefaultFrom",
        "topLevelAwait",
      ],
    });

    // build registry key
    const relToTemplates = posix.relative(
      templatesDir.replace(/\\/g, "/"),
      absPath.replace(/\\/g, "/")
    );
    const parts = relToTemplates.split("/");
    if (parts.length !== 4 || parts[2] !== "screens") continue;

    const [category, templateID, , fileName] = parts;
    const screenName = basename(
      fileName,
      fileName.endsWith(".tsx") ? ".tsx" : ".jsx"
    );
    const key = `${category}/${templateID}/${screenName}`;

    // build import path
    let relPath = posix.relative(
      registryDir.replace(/\\/g, "/"),
      absPath.replace(/\\/g, "/")
    );
    if (!relPath.startsWith(".")) relPath = `./${relPath}`;

    screenMeta[key] = {
      path: relPath,
      props: Array.from(extractProps(ast)),
    };
  }

  const entries = Object.entries(screenMeta)
    .map(
      ([k, v]) =>
        `  '${k}': { path: '${v.path}', props: ${JSON.stringify(v.props)} }`
    )
    .join(",\n");

  const output = `// THIS FILE IS AUTO‑GENERATED — DO NOT EDIT

export const screenPropsRegistry = {
${entries}
};
`;

  writeFileSync(resolve(registryDir, "screenPropsRegistry.js"), output, "utf8");
  console.log(
    `✅ Generated props metadata for ${Object.keys(screenMeta).length} screens.`
  );
}

/**
 * Extracts prop names from:
 *  - a default-exported function / arrow
 *  - a const <Name> = (…) => … ; export default <Name>
 *  - propTypes
 *  - basic TS inline annotations
 */
function extractProps(ast) {
  const props = new Set();
  let defaultExportName = null;
  let defaultExportNode = null;
  const propTypesByComp = new Map();

  // First pass: find export default + any propTypes
  traverse(ast, {
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      if (decl.type === "Identifier") {
        defaultExportName = decl.name;
      } else {
        // inline function/arrow default-export
        defaultExportNode = decl;
      }
    },
    AssignmentExpression(path) {
      const { left, right } = path.node;
      if (
        left.type === "MemberExpression" &&
        left.object.type === "Identifier" &&
        left.property.type === "Identifier" &&
        left.property.name === "propTypes" &&
        right.type === "ObjectExpression"
      ) {
        const comp = left.object.name;
        const keys = right.properties
          .filter(
            (p) => p.type === "ObjectProperty" && p.key.type === "Identifier"
          )
          .map((p) => p.key.name);
        propTypesByComp.set(comp, keys);
      }
    },
  });

  // If export default was an identifier, find its declaration
  if (defaultExportName && !defaultExportNode) {
    traverse(ast, {
      VariableDeclarator(path) {
        const { id, init } = path.node;
        if (
          id.type === "Identifier" &&
          id.name === defaultExportName &&
          (init.type === "ArrowFunctionExpression" ||
            init.type === "FunctionExpression")
        ) {
          defaultExportNode = init;
        }
      },
      FunctionDeclaration(path) {
        if (path.node.id?.name === defaultExportName) {
          defaultExportNode = path.node;
        }
      },
    });
  }

  // Collect props via propTypes
  if (defaultExportName && propTypesByComp.has(defaultExportName)) {
    for (const k of propTypesByComp.get(defaultExportName)) props.add(k);
  }

  // Collect props from params of the resolved defaultExportNode
  if (defaultExportNode?.params?.length) {
    const p = defaultExportNode.params[0];
    // destructuring { title, foo }
    if (p.type === "ObjectPattern") {
      for (const prop of p.properties) {
        if (prop.type === "ObjectProperty" && prop.key.type === "Identifier") {
          props.add(prop.key.name);
        }
      }
    }
    // TS inline: fn(props: { a: string, b?: number })
    if (p.type === "Identifier" && p.typeAnnotation) {
      const ann = p.typeAnnotation.typeAnnotation;
      if (ann.type === "TSTypeLiteral") {
        for (const m of ann.members) {
          if (m.type === "TSPropertySignature" && m.key.type === "Identifier") {
            props.add(m.key.name);
          }
        }
      }
    }
  }

  return props;
}

generateScreenPropsRegistry().catch((err) => {
  console.error("❌ Error generating screen props registry:", err);
  process.exit(1);
});
