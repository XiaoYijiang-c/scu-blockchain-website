import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { init, parse } from "es-module-lexer";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const output = path.join(root, "output/share/scu-blockchain-offline.html");
const origin = "https://single-html.invalid";
const modules = new Map();
const assets = new Map();
const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

function localPath(reference, base = "/index.html") {
  const url = new URL(reference, origin + base);
  if (url.origin !== origin)
    throw new Error(`External dependency: ${reference}`);
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const absolute = path.resolve(dist, relative);
  if (!absolute.startsWith(dist + path.sep))
    throw new Error(`Invalid asset: ${reference}`);
  return { absolute, pathname: url.pathname };
}

async function assetUrl(reference, base) {
  if (/^(data:|#)/.test(reference)) return reference;
  const { absolute } = localPath(reference, base);
  if (!assets.has(absolute)) {
    const mime = mimeTypes[path.extname(absolute)];
    if (!mime) throw new Error(`Unsupported embedded asset: ${absolute}`);
    assets.set(
      absolute,
      `data:${mime};base64,${(await readFile(absolute)).toString("base64")}`,
    );
  }
  return assets.get(absolute);
}

async function replaceAsync(text, pattern, replace) {
  const matches = [...text.matchAll(pattern)];
  for (const match of matches.reverse()) {
    const replacement = await replace(match);
    text =
      text.slice(0, match.index) +
      replacement +
      text.slice(match.index + match[0].length);
  }
  return text;
}

function moduleName(reference, base = "/index.html") {
  const { pathname } = localPath(reference, base);
  if (!modules.has(pathname))
    throw new Error(`Missing JavaScript module: ${pathname}`);
  return modules.get(pathname).name;
}

function rewriteImports(source, base) {
  const [imports] = parse(source);
  for (const item of imports.reverse()) {
    // Computed Astro imports resolve using the rewritten island attributes.
    if (!item.n) continue;
    const name = moduleName(item.n, base);
    const replacement = item.d === -1 ? name : JSON.stringify(name);
    source = source.slice(0, item.s) + replacement + source.slice(item.e);
  }
  return source;
}

await init;
for (const file of await readdir(path.join(dist, "_astro"))) {
  if (!file.endsWith(".js")) continue;
  const pathname = `/_astro/${file}`;
  modules.set(pathname, {
    name: `scu-share/${file}`,
    source: await readFile(path.join(dist, "_astro", file), "utf8"),
  });
}
const imports = {};
for (const [pathname, module] of modules) {
  imports[module.name] =
    "data:text/javascript;base64," +
    Buffer.from(rewriteImports(module.source, pathname)).toString("base64");
}

let html = await readFile(path.join(dist, "index.html"), "utf8");
html = await replaceAsync(
  html,
  /<link\b[^>]*rel="stylesheet"[^>]*>/g,
  async ([tag]) => {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (!href) throw new Error("Stylesheet without href");
    let css = await readFile(localPath(href).absolute, "utf8");
    css = await replaceAsync(
      css,
      /url\(\s*(["']?)(.*?)\1\s*\)/g,
      async (match) => `url("${await assetUrl(match[2], href)}")`,
    );
    if (/@import\b/.test(css)) throw new Error("Unresolved CSS import");
    return `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`;
  },
);
html = html.replace(
  /<link\b[^>]*rel="(?:modulepreload|preload|prefetch)"[^>]*>/g,
  "",
);
html = await replaceAsync(
  html,
  /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
  async ([, attrs, code]) => {
    const src = attrs.match(/\bsrc="([^"]+)"/)?.[1];
    if (src) {
      if (!/type="module"/.test(attrs))
        throw new Error(`Unexpected external classic script: ${src}`);
      return `<script type="module">import ${JSON.stringify(moduleName(src))};</script>`;
    }
    if (!/application\/ld\+json/.test(attrs))
      code = rewriteImports(code, "/index.html");
    return `<script${attrs}>${code}</script>`;
  },
);
html = html.replace(
  /\b(component-url|renderer-url)="([^"]+)"/g,
  (_, attr, url) => `${attr}="${moduleName(url)}"`,
);
html = await replaceAsync(html, /<(?:img|source)\b[^>]*>/g, async ([tag]) => {
  if (/\bsrcset=/.test(tag))
    throw new Error(
      "Add srcset embedding support before exporting responsive images",
    );
  return replaceAsync(
    tag,
    /\bsrc="([^"]+)"/g,
    async (match) => `src="${await assetUrl(match[1])}"`,
  );
});
html = await replaceAsync(
  html,
  /<link\b[^>]*rel="icon"[^>]*>/g,
  async ([tag]) =>
    replaceAsync(
      tag,
      /\bhref="([^"]+)"/g,
      async (match) => `href="${await assetUrl(match[1])}"`,
    ),
);
// Social crawlers cannot access file:// documents; omit their server-relative image.
html = html.replace(/<meta\b[^>]*property="og:image"[^>]*>/g, "");
html = html.replace(
  "<head>",
  `<head><script type="importmap">${JSON.stringify({ imports })}</script>`,
);

const licenses = await Promise.all(
  ["noto-sans-sc", "space-grotesk", "montserrat"].map(
    async (font) =>
      `${font}\n${await readFile(path.join(root, "node_modules/@fontsource-variable", font, "LICENSE"), "utf8")}`,
  ),
);
const templateLicense = await readFile(path.join(root, "LICENSE"), "utf8");
html += `\n<!-- Embedded font and original template licenses\n${[templateLicense, ...licenses].join("\n\n").replace(/-->/g, "-- >")}\n-->\n`;
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html, "utf8");
console.log(`Single HTML: ${output}`);
console.log(
  `${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB; ${assets.size} embedded assets; ${modules.size} modules`,
);
