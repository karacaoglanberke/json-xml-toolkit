import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';
import { DOMParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import type { Indent } from './json';
import { indentValue } from './json';

const PARSE_OPTIONS = {
  ignoreAttributes: false,
  preserveOrder: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  commentPropName: '#comment'
} as const;

function indentString(indent: Indent): string {
  const value = indentValue(indent);
  return typeof value === 'number' ? ' '.repeat(value) : value;
}

export function prettifyXml(text: string, indent: Indent = '2'): string {
  const parser = new XMLParser(PARSE_OPTIONS);
  const parsed = parser.parse(text);
  const builder = new XMLBuilder({
    ...PARSE_OPTIONS,
    format: true,
    indentBy: indentString(indent),
    suppressEmptyNode: false
  });
  return (builder.build(parsed) as string).replace(/\n\s*\n/g, '\n').trimEnd();
}

export function minifyXml(text: string): string {
  const parser = new XMLParser(PARSE_OPTIONS);
  const parsed = parser.parse(text);
  const builder = new XMLBuilder({ ...PARSE_OPTIONS, format: false });
  return (builder.build(parsed) as string).replace(/>\s+</g, '><').trim();
}

const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
};

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => XML_ENTITIES[ch]);
}

export function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, '&');
}

export interface XmlQueryResult {
  count: number;
  output: string;
}

/** Evaluate an XPath expression and return matched nodes serialized as text. */
export function queryXPath(text: string, expression: string): XmlQueryResult {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const nodes = xpath.select(expression, doc as unknown as Node);
  if (Array.isArray(nodes)) {
    const parts = nodes.map((n: any) => (n.toString ? n.toString() : String(n)));
    return { count: parts.length, output: parts.join('\n') };
  }
  return { count: nodes == null ? 0 : 1, output: String(nodes) };
}

export interface XmlStats {
  valid: boolean;
  error?: string;
  bytes: number;
  characters: number;
  lines: number;
  elementCount: number;
  attributeCount: number;
  maxDepth: number;
  uniqueTags: number;
}

export function analyzeXml(text: string): XmlStats {
  const stats: XmlStats = {
    valid: false,
    bytes: Buffer.byteLength(text, 'utf8'),
    characters: text.length,
    lines: text.split('\n').length,
    elementCount: 0,
    attributeCount: 0,
    maxDepth: 0,
    uniqueTags: 0
  };
  const validation = XMLValidator.validate(text, { allowBooleanAttributes: true });
  if (validation !== true) {
    stats.error = validation.err.msg;
    return stats;
  }
  stats.valid = true;
  const tags = new Set<string>();
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  const walk = (node: any, depth: number) => {
    if (!node) {
      return;
    }
    if (node.nodeType === 1) {
      stats.elementCount++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      tags.add(node.nodeName);
      if (node.attributes) {
        stats.attributeCount += node.attributes.length;
      }
    }
    let child = node.firstChild;
    while (child) {
      walk(child, depth + 1);
      child = child.nextSibling;
    }
  };
  walk(doc.documentElement, 1);
  stats.uniqueTags = tags.size;
  return stats;
}
