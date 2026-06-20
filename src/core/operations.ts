import * as J from './json';
import * as X from './xml';
import * as C from './convert';
import type { Indent } from './json';

export interface OpOptions {
  indent: Indent;
  sortDirection: 'asc' | 'desc';
  useJson5: boolean;
  /** JSONPath / XPath expression for query operations. */
  expression?: string;
}

export type OutputMode = 'replace' | 'document' | 'info';

export interface OpResult {
  output: string;
  /** Extra info to show the user (e.g. "12 matches"). */
  meta?: string;
}

export interface Operation {
  id: string;
  label: string;
  /** Whether the operation needs an extra text expression (query). */
  needsExpression?: boolean;
  /** How the command-palette flow should surface the result. */
  outputMode: OutputMode;
  /** Language id for a fresh document when outputMode === 'document'. */
  language?: string;
  run: (input: string, opts: OpOptions) => OpResult;
}

const text = (output: string): OpResult => ({ output });

export const operations: Record<string, Operation> = {
  // ----- JSON -----
  'jsonXmlToolkit.json.prettify': {
    id: 'jsonXmlToolkit.json.prettify',
    label: 'JSON: Prettify',
    outputMode: 'replace',
    run: (i, o) => text(J.prettifyJson(i, o.indent))
  },
  'jsonXmlToolkit.json.minify': {
    id: 'jsonXmlToolkit.json.minify',
    label: 'JSON: Minify',
    outputMode: 'replace',
    run: (i) => text(J.minifyJson(i))
  },
  'jsonXmlToolkit.json.sortKeys': {
    id: 'jsonXmlToolkit.json.sortKeys',
    label: 'JSON: Sort Keys',
    outputMode: 'replace',
    run: (i, o) => text(J.sortKeys(i, o.sortDirection, o.indent))
  },
  'jsonXmlToolkit.json.escape': {
    id: 'jsonXmlToolkit.json.escape',
    label: 'JSON: Escape String',
    outputMode: 'replace',
    run: (i) => text(J.escapeString(i))
  },
  'jsonXmlToolkit.json.unescape': {
    id: 'jsonXmlToolkit.json.unescape',
    label: 'JSON: Unescape String',
    outputMode: 'replace',
    run: (i) => text(J.unescapeString(i))
  },
  'jsonXmlToolkit.json.stringify': {
    id: 'jsonXmlToolkit.json.stringify',
    label: 'JSON: Stringify (Wrap as String)',
    outputMode: 'replace',
    run: (i) => text(J.stringifyJson(i))
  },
  'jsonXmlToolkit.json.parse': {
    id: 'jsonXmlToolkit.json.parse',
    label: 'JSON: Parse (Unwrap String)',
    outputMode: 'replace',
    run: (i, o) => text(J.parseJsonString(i, o.indent))
  },
  'jsonXmlToolkit.json.repair': {
    id: 'jsonXmlToolkit.json.repair',
    label: 'JSON: Repair / Fix',
    outputMode: 'replace',
    run: (i, o) => text(J.repairJson(i, o.useJson5, o.indent))
  },
  'jsonXmlToolkit.json.flatten': {
    id: 'jsonXmlToolkit.json.flatten',
    label: 'JSON: Flatten',
    outputMode: 'replace',
    run: (i, o) => text(J.flatten(i, o.indent))
  },
  'jsonXmlToolkit.json.unflatten': {
    id: 'jsonXmlToolkit.json.unflatten',
    label: 'JSON: Unflatten',
    outputMode: 'replace',
    run: (i, o) => text(J.unflatten(i, o.indent))
  },
  'jsonXmlToolkit.json.removeEmpty': {
    id: 'jsonXmlToolkit.json.removeEmpty',
    label: 'JSON: Remove Null & Empty Values',
    outputMode: 'replace',
    run: (i, o) => text(J.removeEmpty(i, o.indent))
  },
  'jsonXmlToolkit.json.unicodeEscape': {
    id: 'jsonXmlToolkit.json.unicodeEscape',
    label: 'JSON: Escape Unicode',
    outputMode: 'replace',
    run: (i) => text(J.unicodeEscape(i))
  },
  'jsonXmlToolkit.json.unicodeUnescape': {
    id: 'jsonXmlToolkit.json.unicodeUnescape',
    label: 'JSON: Decode Unicode',
    outputMode: 'replace',
    run: (i) => text(J.unicodeUnescape(i))
  },
  'jsonXmlToolkit.json.query': {
    id: 'jsonXmlToolkit.json.query',
    label: 'JSON: Query (JSONPath)',
    needsExpression: true,
    outputMode: 'document',
    language: 'json',
    run: (i, o) => {
      const r = J.queryJsonPath(i, o.expression ?? '$', o.indent);
      return { output: r.output, meta: `${r.count} match(es)` };
    }
  },
  'jsonXmlToolkit.json.stats': {
    id: 'jsonXmlToolkit.json.stats',
    label: 'JSON: Analyze (Stats)',
    outputMode: 'info',
    run: (i) => ({ output: JSON.stringify(J.analyzeJson(i), null, 2) })
  },

  // ----- XML -----
  'jsonXmlToolkit.xml.prettify': {
    id: 'jsonXmlToolkit.xml.prettify',
    label: 'XML: Prettify',
    outputMode: 'replace',
    run: (i, o) => text(X.prettifyXml(i, o.indent))
  },
  'jsonXmlToolkit.xml.minify': {
    id: 'jsonXmlToolkit.xml.minify',
    label: 'XML: Minify',
    outputMode: 'replace',
    run: (i) => text(X.minifyXml(i))
  },
  'jsonXmlToolkit.xml.escape': {
    id: 'jsonXmlToolkit.xml.escape',
    label: 'XML: Escape',
    outputMode: 'replace',
    run: (i) => text(X.escapeXml(i))
  },
  'jsonXmlToolkit.xml.unescape': {
    id: 'jsonXmlToolkit.xml.unescape',
    label: 'XML: Unescape',
    outputMode: 'replace',
    run: (i) => text(X.unescapeXml(i))
  },
  'jsonXmlToolkit.xml.query': {
    id: 'jsonXmlToolkit.xml.query',
    label: 'XML: Query (XPath)',
    needsExpression: true,
    outputMode: 'document',
    language: 'xml',
    run: (i, o) => {
      const r = X.queryXPath(i, o.expression ?? '/');
      return { output: r.output, meta: `${r.count} match(es)` };
    }
  },
  'jsonXmlToolkit.xml.stats': {
    id: 'jsonXmlToolkit.xml.stats',
    label: 'XML: Analyze (Stats)',
    outputMode: 'info',
    run: (i) => ({ output: JSON.stringify(X.analyzeXml(i), null, 2) })
  },

  // ----- Convert -----
  'jsonXmlToolkit.convert.jsonToYaml': {
    id: 'jsonXmlToolkit.convert.jsonToYaml',
    label: 'Convert: JSON → YAML',
    outputMode: 'document',
    language: 'yaml',
    run: (i) => text(C.jsonToYaml(i))
  },
  'jsonXmlToolkit.convert.yamlToJson': {
    id: 'jsonXmlToolkit.convert.yamlToJson',
    label: 'Convert: YAML → JSON',
    outputMode: 'document',
    language: 'json',
    run: (i, o) => text(C.yamlToJson(i, o.indent))
  },
  'jsonXmlToolkit.convert.jsonToXml': {
    id: 'jsonXmlToolkit.convert.jsonToXml',
    label: 'Convert: JSON → XML',
    outputMode: 'document',
    language: 'xml',
    run: (i, o) => text(C.jsonToXml(i, o.indent))
  },
  'jsonXmlToolkit.convert.xmlToJson': {
    id: 'jsonXmlToolkit.convert.xmlToJson',
    label: 'Convert: XML → JSON',
    outputMode: 'document',
    language: 'json',
    run: (i, o) => text(C.xmlToJson(i, o.indent))
  },
  'jsonXmlToolkit.convert.jsonToCsv': {
    id: 'jsonXmlToolkit.convert.jsonToCsv',
    label: 'Convert: JSON → CSV',
    outputMode: 'document',
    language: 'csv',
    run: (i) => text(C.jsonToCsv(i))
  },
  'jsonXmlToolkit.convert.csvToJson': {
    id: 'jsonXmlToolkit.convert.csvToJson',
    label: 'Convert: CSV → JSON',
    outputMode: 'document',
    language: 'json',
    run: (i, o) => text(C.csvToJson(i, o.indent))
  },
  'jsonXmlToolkit.convert.jsonToTypeScript': {
    id: 'jsonXmlToolkit.convert.jsonToTypeScript',
    label: 'Convert: JSON → TypeScript',
    outputMode: 'document',
    language: 'typescript',
    run: (i) => text(C.jsonToTypeScript(i))
  },
  'jsonXmlToolkit.convert.jsonToGo': {
    id: 'jsonXmlToolkit.convert.jsonToGo',
    label: 'Convert: JSON → Go struct',
    outputMode: 'document',
    language: 'go',
    run: (i) => text(C.jsonToGo(i))
  },
  'jsonXmlToolkit.convert.jsonToProto': {
    id: 'jsonXmlToolkit.convert.jsonToProto',
    label: 'Convert: JSON → Protobuf',
    outputMode: 'document',
    language: 'proto3',
    run: (i) => text(C.jsonToProto(i))
  },
  'jsonXmlToolkit.convert.jsonToPython': {
    id: 'jsonXmlToolkit.convert.jsonToPython',
    label: 'Convert: JSON → Python dataclass',
    outputMode: 'document',
    language: 'python',
    run: (i) => text(C.jsonToPythonDataclass(i))
  }
};
