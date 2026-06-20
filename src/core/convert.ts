import * as yaml from 'js-yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { parseLenient, indentValue, type Indent } from './json';

// ---------------------------------------------------------------------------
// YAML
// ---------------------------------------------------------------------------

export function jsonToYaml(text: string): string {
  return yaml.dump(parseLenient(text), { indent: 2, lineWidth: -1, noRefs: true });
}

export function yamlToJson(text: string, indent: Indent = '2'): string {
  return JSON.stringify(yaml.load(text), null, indentValue(indent));
}

// ---------------------------------------------------------------------------
// XML
// ---------------------------------------------------------------------------

export function jsonToXml(text: string, indent: Indent = '2'): string {
  const value = parseLenient(text);
  const indentBy = typeof indentValue(indent) === 'number' ? ' '.repeat(indentValue(indent) as number) : '\t';
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy,
    attributeNamePrefix: '@_',
    suppressEmptyNode: true
  });
  // Wrap arrays / primitives so the document always has a single root.
  const rooted = value && typeof value === 'object' && !Array.isArray(value) ? value : { root: value };
  return (builder.build(rooted) as string).trimEnd();
}

export function xmlToJson(text: string, indent: Indent = '2'): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true
  });
  return JSON.stringify(parser.parse(text), null, indentValue(indent));
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function csvField(value: unknown): string {
  let str: string;
  if (value === null || value === undefined) {
    str = '';
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function jsonToCsv(text: string): string {
  const value = parseLenient(text);
  const rows = Array.isArray(value) ? value : [value];
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      for (const key of Object.keys(row as Record<string, unknown>)) {
        if (!seen.has(key)) {
          seen.add(key);
          columns.push(key);
        }
      }
    }
  }
  if (columns.length === 0) {
    // Fall back to single "value" column for arrays of primitives.
    const lines = ['value', ...rows.map((r) => csvField(r))];
    return lines.join('\n');
  }
  const header = columns.map(csvField).join(',');
  const body = rows.map((row) =>
    columns.map((col) => csvField((row as Record<string, unknown>)?.[col])).join(',')
  );
  return [header, ...body].join('\n');
}

/** RFC-4180-ish CSV parser. */
export function csvToJson(text: string, indent: Indent = '2'): string {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  if (records.length === 0) {
    return '[]';
  }
  const headers = records[0];
  const coerce = (v: string): unknown => {
    if (v === '') return null;
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  };
  const out = records.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = coerce(row[i] ?? '');
    });
    return obj;
  });
  return JSON.stringify(out, null, indentValue(indent));
}

// ---------------------------------------------------------------------------
// TypeScript interfaces
// ---------------------------------------------------------------------------

type TsShape = Map<string, Set<string>>;

function pascalCase(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const pascal = cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return /^[A-Za-z]/.test(pascal) ? pascal : `Type${pascal}`;
}

function singular(name: string): string {
  if (/ies$/.test(name)) return name.replace(/ies$/, 'y');
  if (/ses$/.test(name)) return name.replace(/es$/, '');
  if (/s$/.test(name)) return name.replace(/s$/, '');
  return name;
}

export function jsonToTypeScript(text: string, rootName = 'Root'): string {
  const interfaces: Array<{ name: string; shape: TsShape }> = [];
  const usedNames = new Set<string>();

  const uniqueName = (base: string): string => {
    let name = pascalCase(base) || 'Type';
    let i = 2;
    while (usedNames.has(name)) {
      name = `${pascalCase(base)}${i++}`;
    }
    usedNames.add(name);
    return name;
  };

  const typeOf = (value: unknown, hint: string): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'unknown[]';
      const elementTypes = new Set(value.map((v) => typeOf(v, singular(hint))));
      const inner = [...elementTypes].join(' | ');
      return elementTypes.size > 1 ? `(${inner})[]` : `${inner}[]`;
    }
    if (value && typeof value === 'object') {
      const name = uniqueName(hint);
      const shape: TsShape = new Map();
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        shape.set(k, new Set([typeOf(v, k)]));
      }
      interfaces.push({ name, shape });
      return name;
    }
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  };

  const root = parseLenient(text);
  const rootType = typeOf(root, rootName);

  const keyEscape = (k: string): string => (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k));

  const blocks = interfaces
    .reverse()
    .map(({ name, shape }) => {
      const lines = [...shape.entries()].map(([k, types]) => {
        const t = [...types].join(' | ');
        return `  ${keyEscape(k)}: ${t};`;
      });
      return `export interface ${name} {\n${lines.join('\n')}\n}`;
    });

  if (interfaces.length === 0) {
    return `export type ${pascalCase(rootName)} = ${rootType};`;
  }
  // If the root itself is an array of objects, expose a handy alias.
  if (rootType !== interfaces[0].name) {
    blocks.unshift(`export type ${pascalCase(rootName)} = ${rootType};`);
  }
  return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// Go struct
// ---------------------------------------------------------------------------

export function jsonToGo(text: string, rootName = 'Root'): string {
  const structs: string[] = [];
  const usedNames = new Set<string>();

  const exportName = (name: string): string => {
    const pascal = pascalCase(name);
    let unique = pascal;
    let i = 2;
    while (usedNames.has(unique)) {
      unique = `${pascal}${i++}`;
    }
    usedNames.add(unique);
    return unique;
  };

  const goType = (value: unknown, hint: string): string => {
    if (value === null) return 'interface{}';
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]interface{}';
      return `[]${goType(value[0], singular(hint))}`;
    }
    if (value && typeof value === 'object') {
      const name = exportName(hint);
      const fields = Object.entries(value as Record<string, unknown>).map(([k, v]) => {
        return `\t${pascalCase(k)} ${goType(v, k)} \`json:"${k}"\``;
      });
      structs.push(`type ${name} struct {\n${fields.join('\n')}\n}`);
      return name;
    }
    if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float64';
    if (typeof value === 'boolean') return 'bool';
    return 'string';
  };

  const root = parseLenient(text);
  const rootType = goType(root, rootName);
  if (structs.length === 0) {
    return `type ${pascalCase(rootName)} ${rootType}`;
  }
  return structs.reverse().join('\n\n');
}

// ---------------------------------------------------------------------------
// Protobuf (proto3)
// ---------------------------------------------------------------------------

export function jsonToProto(text: string, rootName = 'Root'): string {
  const messages: string[] = [];
  const usedNames = new Set<string>();

  const messageName = (name: string): string => {
    const pascal = pascalCase(name);
    let unique = pascal;
    let i = 2;
    while (usedNames.has(unique)) {
      unique = `${pascal}${i++}`;
    }
    usedNames.add(unique);
    return unique;
  };

  const scalar = (value: unknown): string => {
    if (typeof value === 'number') return Number.isInteger(value) ? 'int64' : 'double';
    if (typeof value === 'boolean') return 'bool';
    return 'string';
  };

  // Returns the proto field type for a value (defining nested messages as needed).
  const fieldType = (value: unknown, hint: string): { type: string; repeated: boolean } => {
    if (Array.isArray(value)) {
      const first = value.find((v) => v !== null && v !== undefined);
      const inner = fieldType(first, singular(hint));
      return { type: inner.type, repeated: true };
    }
    if (value && typeof value === 'object') {
      return { type: defineMessage(value as Record<string, unknown>, hint), repeated: false };
    }
    if (value === null || value === undefined) {
      return { type: 'string', repeated: false };
    }
    return { type: scalar(value), repeated: false };
  };

  const defineMessage = (obj: Record<string, unknown>, hint: string): string => {
    const name = messageName(hint);
    const lines: string[] = [];
    let index = 1;
    for (const [key, value] of Object.entries(obj)) {
      const { type, repeated } = fieldType(value, key);
      lines.push(`  ${repeated ? 'repeated ' : ''}${type} ${key} = ${index++};`);
    }
    messages.push(`message ${name} {\n${lines.join('\n')}\n}`);
    return name;
  };

  const root = parseLenient(text);
  const rootObj =
    root && typeof root === 'object' && !Array.isArray(root)
      ? (root as Record<string, unknown>)
      : { value: root };
  defineMessage(rootObj, rootName);
  return `syntax = "proto3";\n\n${messages.reverse().join('\n\n')}`;
}

// ---------------------------------------------------------------------------
// Python dataclasses
// ---------------------------------------------------------------------------

export function jsonToPythonDataclass(text: string, rootName = 'Root'): string {
  const classes: string[] = [];
  const usedNames = new Set<string>();

  const className = (name: string): string => {
    const pascal = pascalCase(name);
    let unique = pascal;
    let i = 2;
    while (usedNames.has(unique)) {
      unique = `${pascal}${i++}`;
    }
    usedNames.add(unique);
    return unique;
  };

  const pyType = (value: unknown, hint: string): string => {
    if (value === null || value === undefined) return 'Optional[Any]';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'List[Any]';
      return `List[${pyType(value[0], singular(hint))}]`;
    }
    if (typeof value === 'object') {
      return defineClass(value as Record<string, unknown>, hint);
    }
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
    return 'str';
  };

  const defineClass = (obj: Record<string, unknown>, hint: string): string => {
    const name = className(hint);
    const fields = Object.entries(obj).map(([key, value]) => `    ${key}: ${pyType(value, key)}`);
    classes.push(`@dataclass\nclass ${name}:\n${fields.length ? fields.join('\n') : '    pass'}`);
    return name;
  };

  const root = parseLenient(text);
  const rootObj =
    root && typeof root === 'object' && !Array.isArray(root)
      ? (root as Record<string, unknown>)
      : { value: root };
  defineClass(rootObj, rootName);
  const header = 'from __future__ import annotations\nfrom dataclasses import dataclass\nfrom typing import Any, List, Optional';
  return `${header}\n\n\n${classes.reverse().join('\n\n\n')}`;
}
