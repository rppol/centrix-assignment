// Build: stamp the page with this commit, render the PDF, emit version.json.
// The stamp + version.json are what defeat GitHub Pages' 10-minute HTML cache;
// see the cache-guard script at the bottom of index.html.
import { readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer";

const BUILD = (process.env.GITHUB_SHA || "dev").slice(0, 8);
const PDF = "Rutik_Pol_Centrix_Assignment.pdf";

const html = readFileSync("index.html", "utf8").replaceAll("__BUILD__", BUILD);
writeFileSync("index.html", html);
writeFileSync("version.json", JSON.stringify({ build: BUILD }) + "\n");

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto(`file://${process.cwd()}/index.html`, { waitUntil: "networkidle0", timeout: 120000 });

const want = await page.evaluate(() => document.querySelectorAll("pre.mermaid").length);
await page.waitForFunction(
  n => document.querySelectorAll("pre.mermaid svg").length === n, { timeout: 60000 }, want);
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: PDF, format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();

// A fence that silently fails to parse ships as a raw blob. Fail the build instead.
const pages = (readFileSync(PDF).toString("latin1").match(/\/Type\s*\/Page[^sC]/g) || []).length;
console.log(`build ${BUILD} · ${want} diagrams rendered · ${pages} PDF pages`);
if (want === 0) { console.error("no diagrams found — check the mermaid fences"); process.exit(1); }
