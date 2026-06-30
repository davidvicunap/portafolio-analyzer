import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { FilingSection } from "@/lib/types";

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "br",
  "tr",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "section",
  "header",
  "footer",
  "article",
]);

const MAX_SECTION_CHARS = 60_000;

/** Flatten the document into ordered text blocks (one per block-level element). */
function extractBlocks(html: string): string[] {
  const $ = cheerio.load(html);
  $("script, style, head, title, ix\\:header").remove();
  const body = $("body").get(0) ?? $.root().get(0);
  if (!body) return [];

  let text = "";
  const walk = (node: AnyNode): void => {
    if (node.type === "text") {
      text += node.data;
      return;
    }
    if (node.type !== "tag" && node.type !== "script" && node.type !== "style") {
      // documents, comments, etc.
      if ("children" in node && node.children) {
        for (const child of node.children) walk(child as AnyNode);
      }
      return;
    }
    if (node.type === "tag") {
      for (const child of node.children) walk(child as AnyNode);
      if (BLOCK_TAGS.has(node.name)) text += "\n";
    }
  };
  walk(body as AnyNode);

  return text
    .split("\n")
    .map((line) => line.replace(/ /g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isNoise(line: string): boolean {
  // Page numbers, lone separators, etc.
  if (/^\d{1,4}$/.test(line)) return true;
  if (/^page\s+\d+/i.test(line)) return true;
  if (!/[a-z]/i.test(line)) return true;
  return false;
}

interface SectionSpec {
  id: string;
  title: string;
  startRe: RegExp;
  endRe: RegExp;
}

const SPECS_10K: SectionSpec[] = [
  {
    id: "risk-factors",
    title: "Risk Factors (Item 1A)",
    startRe: /^item\s*1a\b/i,
    endRe: /^item\s*(1b|2)\b/i,
  },
  {
    id: "mda",
    title: "Management's Discussion & Analysis (Item 7)",
    startRe: /^item\s*7(?![a-z0-9])/i,
    endRe: /^item\s*7a\b/i,
  },
  {
    id: "market-risk",
    title: "Quantitative & Qualitative Disclosures About Market Risk (Item 7A)",
    startRe: /^item\s*7a\b/i,
    endRe: /^item\s*8\b/i,
  },
];

const SPECS_10Q: SectionSpec[] = [
  {
    id: "mda",
    title: "Management's Discussion & Analysis (Item 2)",
    startRe: /^item\s*2(?![a-z0-9])/i,
    endRe: /^item\s*3\b/i,
  },
  {
    id: "market-risk",
    title: "Quantitative & Qualitative Disclosures About Market Risk (Item 3)",
    startRe: /^item\s*3(?![a-z0-9])/i,
    endRe: /^item\s*4\b/i,
  },
  {
    id: "risk-factors",
    title: "Risk Factors (Part II, Item 1A)",
    startRe: /^item\s*1a\b/i,
    endRe: /^item\s*(1b|2|3|4|5|6)\b/i,
  },
];

/**
 * Locate a section's block range. TOC entries cluster together (tiny spans);
 * the real body section is the longest span between its start and end markers.
 */
function locateSection(
  lines: string[],
  spec: SectionSpec,
): { start: number; end: number } | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (spec.startRe.test(lines[i])) starts.push(i);
    if (spec.endRe.test(lines[i])) ends.push(i);
  }
  let best: { start: number; end: number } | null = null;
  let bestLen = 3; // require a non-trivial span
  for (const s of starts) {
    const e = ends.find((x) => x > s);
    const end = e ?? lines.length;
    const len = end - s;
    if (len > bestLen) {
      bestLen = len;
      best = { start: s, end };
    }
  }
  return best;
}

function buildSectionHtml(lines: string[]): { html: string; wordCount: number } {
  const paragraphs: string[] = [];
  let chars = 0;
  let truncated = false;
  let wordCount = 0;
  for (const line of lines) {
    if (isNoise(line)) continue;
    wordCount += line.split(/\s+/).length;
    if (chars > MAX_SECTION_CHARS) {
      truncated = true;
      break;
    }
    chars += line.length;
    paragraphs.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (truncated) {
    paragraphs.push(
      `<p class="truncated">… section truncated for readability — open the original filing for the full text.</p>`,
    );
  }
  return { html: paragraphs.join("\n"), wordCount };
}

export function parseFilingSections(html: string, form: string): FilingSection[] {
  const blocks = extractBlocks(html);
  const baseForm = form.split("/")[0].toUpperCase();
  const specs = baseForm === "10-K" ? SPECS_10K : baseForm === "10-Q" ? SPECS_10Q : [];

  const sections: FilingSection[] = [];
  for (const spec of specs) {
    const range = locateSection(blocks, spec);
    if (!range) continue;
    const body = blocks.slice(range.start + 1, range.end);
    const { html: sectionHtml, wordCount } = buildSectionHtml(body);
    if (wordCount < 20) continue; // too short to be the real section
    sections.push({
      id: spec.id,
      title: spec.title,
      html: sectionHtml,
      wordCount,
    });
  }
  return sections;
}
