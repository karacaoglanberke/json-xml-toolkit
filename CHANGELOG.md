# Change Log

All notable changes to the **JSON & XML Toolkit** extension are documented here.

## [1.1.0] - 2026-06-21

### Added
- **JSON Schema validation** — validate the active document against any JSON Schema with inline error diagnostics and a readable report.
- **Semantic Diff** — compare two documents after normalizing formatting and key order so only real changes show.
- **JSON Structure tree** — an Explorer outline of the active JSON document with click-to-reveal.
- **JSON → Protobuf (proto3)** and **JSON → Python dataclass** converters.

## [1.0.0] - 2026-06-21

Initial release.

### Added
- Interactive **Toolkit Workbench** panel with live format auto-detection, two-pane input/output, query box, and "replace editor / new document" actions.
- **JSON** operations: prettify, minify, sort keys, repair (JSON5), escape/unescape string, stringify/parse, flatten/unflatten, remove null & empty, unicode escape/decode, JSONPath query, analyze.
- **XML** operations: prettify, minify, escape/unescape, XPath query, analyze.
- **Conversions**: JSON ⇄ YAML, JSON ⇄ XML, JSON ⇄ CSV, JSON → TypeScript interfaces, JSON → Go structs.
- Live status-bar item showing validity, size, depth and key/element counts.
- Editor context-menu submenu and `Ctrl/Cmd+Alt+J` keybinding.
- Configurable indentation, sort direction, status-bar toggle and JSON5 repair toggle.
