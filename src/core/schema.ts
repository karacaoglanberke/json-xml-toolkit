import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { parseLenient } from './json';

export interface SchemaError {
  instancePath: string;
  message: string;
  keyword: string;
  /** The offending property/array key (last path segment), if any. */
  key?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaError[];
}

/** Validate a JSON document (text) against a JSON Schema (text). */
export function validateJsonSchema(dataText: string, schemaText: string): SchemaValidationResult {
  const data = parseLenient(dataText);
  const schema = parseLenient(schemaText);

  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);

  const validate = ajv.compile(schema as object);
  const valid = validate(data) as boolean;

  const errors: SchemaError[] = (validate.errors ?? []).map((e: ErrorObject) => {
    const segments = e.instancePath.split('/').filter(Boolean);
    const key =
      e.keyword === 'required' && e.params && 'missingProperty' in e.params
        ? (e.params as { missingProperty: string }).missingProperty
        : segments[segments.length - 1];
    return {
      instancePath: e.instancePath || '(root)',
      message: e.message ?? 'is invalid',
      keyword: e.keyword,
      key
    };
  });

  return { valid, errors };
}

/** Human-readable report for an output document. */
export function formatSchemaReport(result: SchemaValidationResult): string {
  if (result.valid) {
    return '✓ Valid — the document conforms to the schema.';
  }
  const lines = result.errors.map((e, i) => {
    const where = e.instancePath === '(root)' ? 'root' : e.instancePath;
    return `${i + 1}. ${where} ${e.message}${e.key ? `  (property: ${e.key})` : ''}`;
  });
  return `✗ Invalid — ${result.errors.length} error(s):\n\n${lines.join('\n')}`;
}
