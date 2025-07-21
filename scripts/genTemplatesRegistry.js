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

  const pattern = `${templatesDir.replace(/\\/g, "/")}/**/*.jsx`;
  const files = await fg(pattern);

  const templates = {};
  const screens = {};

  files.forEach((absPath) => {
    const relPath = posix.join("..", relative(srcDir, absPath));
    const relToTemplates = posix
      .relative(templatesDir, absPath)
      .replace(/\\/g, "/");
    const parts = relToTemplates.split("/");

    const [category, templateID, folderOrFile, ...rest] = parts;

    if (folderOrFile === `${templateID}.jsx` && parts.length === 3) {
      const key = `${category}/${templateID}`;
      templates[key] = `() => import('${relPath}')`;
      return;
    }

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

  const tmplEntries = Object.entries(templates)
    .map(([k, v]) => `  '${k}': ${v}`)
    .join(",\n");
  const screenEntries = Object.entries(screens)
    .map(([k, v]) => `  '${k}': ${v}`)
    .join(",\n");

  const output = `// THIS FILE IS AUTO-GENERATED - DO NOT EDIT

export const templatesRegistry = {
${tmplEntries}
};

export const componentsRegistry = {
${screenEntries}
};
`;

  writeFileSync(
    resolve(srcDir, "core/registries/templatesRegistry.js"),
    output,
    "utf8"
  );
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
