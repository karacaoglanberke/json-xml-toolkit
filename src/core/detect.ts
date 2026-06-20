export type DetectedFormat = 'json' | 'xml' | 'yaml' | 'csv' | 'unknown';

/** Best-effort format detection based on content shape. */
export function detectFormat(text: string): DetectedFormat {
  const trimmed = text.trim();
  if (!trimmed) {
    return 'unknown';
  }
  if (trimmed.startsWith('<')) {
    return 'xml';
  }
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return 'json';
  }
  // CSV: multiple comma-separated columns across the first lines, no YAML markers.
  const lines = trimmed.split('\n').slice(0, 5);
  const looksCsv =
    lines.length >= 2 &&
    lines.every((l) => l.includes(',')) &&
    !/^[\w.-]+\s*:\s/.test(lines[0]);
  if (looksCsv) {
    return 'csv';
  }
  // YAML: "key: value" lines or list markers.
  if (/^[\s-]*[\w.-]+\s*:\s/m.test(trimmed) || /^---/.test(trimmed)) {
    return 'yaml';
  }
  return 'unknown';
}
