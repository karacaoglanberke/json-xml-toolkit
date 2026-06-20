import JSON5 from 'json5';
import { JSONPath } from 'jsonpath-plus';

export type Indent = '2' | '4' | 'tab';

export function indentValue(indent: Indent): string | number {
  if (indent === 'tab') {
    return '\t';
  }
  return parseInt(indent, 10);
}

/** Parse leniently: standard JSON first, then JSON5 (comments, trailing commas, etc.). */
export function parseLenient(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return JSON5.parse(text);
  }
}

export function prettifyJson(text: string, indent: Indent = '2'): string {
  const value = parseLenient(text);
  return JSON.stringify(value, null, indentValue(indent));
}

export function minifyJson(text: string): string {
  return JSON.stringify(parseLenient(text));
}

/** Recursively sort object keys. Arrays keep their order. */
export function sortKeys(text: string, direction: 'asc' | 'desc' = 'asc', indent: Indent = '2'): string {
  const sorter = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(sorter);
    }
    if (value && typeof value === 'object') {
      const entries = Object.keys(value as Record<string, unknown>).sort((a, b) =>
        direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
      );
      const out: Record<string, unknown> = {};
      for (const key of entries) {
        out[key] = sorter((value as Record<string, unknown>)[key]);
      }
      return out;
    }
    return value;
  };
  return JSON.stringify(sorter(parseLenient(text)), null, indentValue(indent));
}

/** Turn a chunk of text into a JSON-safe string literal body (no surrounding quotes). */
export function escapeString(text: string): string {
  const quoted = JSON.stringify(text);
  return quoted.slice(1, -1);
}

/** Reverse of escapeString: interpret backslash escapes. */
export function unescapeString(text: string): string {
  const trimmed = text.trim();
  const body = trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed : `"${text}"`;
  return JSON.parse(body) as string;
}

/** Wrap a JSON document as a single JSON string value (useful for embedding). */
export function stringifyJson(text: string): string {
  return JSON.stringify(text);
}

/** Unwrap a JSON string value back into its raw content, then prettify if it is JSON. */
export function parseJsonString(text: string, indent: Indent = '2'): string {
  const inner = JSON.parse(text.trim());
  if (typeof inner !== 'string') {
    throw new Error('Input is not a JSON string value.');
  }
  try {
    return JSON.stringify(JSON.parse(inner), null, indentValue(indent));
  } catch {
    return inner;
  }
}

/** Repair malformed JSON using JSON5 tolerance, return clean JSON. */
export function repairJson(text: string, useJson5 = true, indent: Indent = '2'): string {
  let value: unknown;
  if (useJson5) {
    value = JSON5.parse(text);
  } else {
    // Light repairs without full JSON5: strip comments and trailing commas.
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/,(\s*[}\]])/g, '$1');
    value = JSON.parse(stripped);
  }
  return JSON.stringify(value, null, indentValue(indent));
}

/** Flatten nested objects/arrays into a single-level object with dot/bracket paths. */
export function flatten(text: string, indent: Indent = '2'): string {
  const source = parseLenient(text);
  const out: Record<string, unknown> = {};
  const walk = (value: unknown, prefix: string) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        out[prefix] = [];
        return;
      }
      value.forEach((item, i) => walk(item, prefix ? `${prefix}[${i}]` : `[${i}]`));
    } else if (value && typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length === 0) {
        out[prefix] = {};
        return;
      }
      for (const key of keys) {
        const next = prefix ? `${prefix}.${key}` : key;
        walk((value as Record<string, unknown>)[key], next);
      }
    } else {
      out[prefix] = value;
    }
  };
  walk(source, '');
  return JSON.stringify(out, null, indentValue(indent));
}

/** Rebuild nested structure from a flat dot/bracket-notation object. */
export function unflatten(text: string, indent: Indent = '2'): string {
  const source = parseLenient(text) as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(source)) {
    const tokens = path.match(/[^.[\]]+/g) ?? [];
    let cursor: any = result;
    tokens.forEach((token, i) => {
      const isLast = i === tokens.length - 1;
      const nextToken = tokens[i + 1];
      const nextIsIndex = nextToken !== undefined && /^\d+$/.test(nextToken);
      if (isLast) {
        cursor[token] = value;
      } else {
        if (cursor[token] === undefined) {
          cursor[token] = nextIsIndex ? [] : {};
        }
        cursor = cursor[token];
      }
    });
  }
  return JSON.stringify(result, null, indentValue(indent));
}

/** Remove null, undefined, empty string, empty array and empty object values recursively. */
export function removeEmpty(text: string, indent: Indent = '2'): string {
  const isEmpty = (value: unknown): boolean =>
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && value !== null && Object.keys(value as object).length === 0);

  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(clean).filter((v) => !isEmpty(v));
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const cleaned = clean(v);
        if (!isEmpty(cleaned)) {
          out[k] = cleaned;
        }
      }
      return out;
    }
    return value;
  };
  return JSON.stringify(clean(parseLenient(text)), null, indentValue(indent));
}

/** Escape all non-ASCII characters to \uXXXX sequences. */
export function unicodeEscape(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code > 0x7e) {
      if (code > 0xffff) {
        // Surrogate pair.
        const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
        const low = ((code - 0x10000) % 0x400) + 0xdc00;
        out += `\\u${high.toString(16).padStart(4, '0')}\\u${low.toString(16).padStart(4, '0')}`;
      } else {
        out += `\\u${code.toString(16).padStart(4, '0')}`;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

/** Decode \uXXXX sequences back to their characters. */
export function unicodeUnescape(text: string): string {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export interface QueryResult {
  count: number;
  output: string;
}

/** Run a JSONPath expression and return matches as pretty JSON. */
export function queryJsonPath(text: string, path: string, indent: Indent = '2'): QueryResult {
  const json = parseLenient(text);
  const results = JSONPath({ path, json: json as object, wrap: true });
  return {
    count: Array.isArray(results) ? results.length : 0,
    output: JSON.stringify(results, null, indentValue(indent))
  };
}

export interface JsonStats {
  valid: boolean;
  error?: string;
  bytes: number;
  characters: number;
  lines: number;
  maxDepth: number;
  objectCount: number;
  arrayCount: number;
  keyCount: number;
  uniqueKeys: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  nullCount: number;
}

export function analyzeJson(text: string): JsonStats {
  const base: JsonStats = {
    valid: false,
    bytes: Buffer.byteLength(text, 'utf8'),
    characters: text.length,
    lines: text.split('\n').length,
    maxDepth: 0,
    objectCount: 0,
    arrayCount: 0,
    keyCount: 0,
    uniqueKeys: 0,
    stringCount: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0
  };
  let value: unknown;
  try {
    value = parseLenient(text);
    base.valid = true;
  } catch (e) {
    base.error = (e as Error).message;
    return base;
  }
  const keys = new Set<string>();
  const walk = (v: unknown, depth: number) => {
    base.maxDepth = Math.max(base.maxDepth, depth);
    if (Array.isArray(v)) {
      base.arrayCount++;
      v.forEach((item) => walk(item, depth + 1));
    } else if (v && typeof v === 'object') {
      base.objectCount++;
      for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
        base.keyCount++;
        keys.add(k);
        walk(child, depth + 1);
      }
    } else if (typeof v === 'string') {
      base.stringCount++;
    } else if (typeof v === 'number') {
      base.numberCount++;
    } else if (typeof v === 'boolean') {
      base.booleanCount++;
    } else if (v === null) {
      base.nullCount++;
    }
  };
  walk(value, 1);
  base.uniqueKeys = keys.size;
  return base;
}
