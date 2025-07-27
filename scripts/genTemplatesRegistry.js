// scripts/genTemplatesRegistry.mjs
import { writeFileSync } from "fs";
import { resolve, relative, posix, basename } from "path";
import fg from "fast-glob";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

async function generateRegistry() {
  const srcDir = resolve(__dirname, "../src");
  const templatesDir = resolve(srcDir, "templates");
  // ❶ Directory where we'll write the registry file:
  const registryDir = resolve(srcDir, "core/registries");

  // Glob all .jsx files under src/templates
  const pattern = `${templatesDir.replace(/\\/g, "/")}/**/*.jsx`;
  const files = await fg(pattern);

  const templates = {};
  const screens = {};

  files.forEach((absPath) => {
    // ❷ Compute path *from* registryDir to each template file
    let relPath = posix.relative(
      registryDir.replace(/\\/g, "/"),
      absPath.replace(/\\/g, "/")
    );
    // Ensure it starts with './' or '../'
    if (!relPath.startsWith(".")) {
      relPath = `./${relPath}`;
    }

    // Path relative to templatesDir, for key logic
    const relToTemplates = posix
      .relative(templatesDir, absPath)
      .replace(/\\/g, "/");
    const parts = relToTemplates.split("/");

    const [category, templateID, folderOrFile, ...rest] = parts;

    // Template entry: src/templates/<category>/<templateID>/<templateID>.jsx
    if (folderOrFile === `${templateID}.jsx` && parts.length === 3) {
      const key = `${category}/${templateID}`;
      templates[key] = `() => import('${relPath}')`;
      return;
    }

    // Screen entry: src/templates/<category>/<templateID>/screens/SomeScreen.jsx
    if (
      folderOrFile === "screens" &&
      rest.length === 1 &&
      rest[0].endsWith(".jsx")
    ) {
      const screenName = basename(rest[0], ".jsx");
      const key = `${category}/${templateID}/${screenName}`;
      screens[key] = `() => import('${relPath}')`;
    }
  });

  // Serialize template entries
  const tmplEntries = Object.entries(templates)
    .map(([k, v]) => `  '${k}': ${v}`)
    .join(",\n");

  // Serialize screen component entries
  const screenEntries = Object.entries(screens)
    .map(([k, v]) => `  '${k}': ${v}`)
    .join(",\n");

  // Final output content
  const output = `// THIS FILE IS AUTO-GENERATED - DO NOT EDIT

export const templatesRegistry = {
${tmplEntries}
};

export const componentsRegistry = {
${screenEntries}
};
`;

  // Write to src/core/registries/templatesRegistry.js
  writeFileSync(resolve(registryDir, "templatesRegistry.js"), output, "utf8");

  console.log(
    `Generated ${Object.keys(templates).length} templates and ${
      Object.keys(screens).length
    } screen components.`
  );
}

generateRegistry().catch((err) => {
  console.error("Error generating registries:", err);
  process.exit(1);
});
