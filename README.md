<p align="center">
  <img src="https://raw.githubusercontent.com/karacaoglanberke/json-xml-toolkit/main/media/icon.png" alt="JSON & XML Toolkit" width="128" height="128" />
</p>

<h1 align="center">JSON &amp; XML Toolkit</h1>

<p align="center">
  <strong>The whole JSON &amp; XML toolbox in a single extension — 50+ operations, an interactive Workbench, and 100% offline.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=BerkeKaracaoglan.json-xml-toolkit"><img src="https://img.shields.io/visual-studio-marketplace/v/BerkeKaracaoglan.json-xml-toolkit?style=flat-square&label=Marketplace&color=1e1b4b" alt="Marketplace Version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=BerkeKaracaoglan.json-xml-toolkit"><img src="https://img.shields.io/visual-studio-marketplace/i/BerkeKaracaoglan.json-xml-toolkit?style=flat-square&label=Installs&color=1e1b4b" alt="Installs" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=BerkeKaracaoglan.json-xml-toolkit"><img src="https://img.shields.io/visual-studio-marketplace/r/BerkeKaracaoglan.json-xml-toolkit?style=flat-square&label=Rating&color=1e1b4b" alt="Rating" /></a>
  <a href="https://github.com/karacaoglanberke/json-xml-toolkit/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-1e1b4b?style=flat-square" alt="License: MIT" /></a>
</p>

Stop installing five single-purpose extensions. **JSON & XML Toolkit** bundles the entire
data-wrangling toolbox — prettify, minify, sort, repair, flatten, query, validate, diff and
convert — for **both** JSON and XML, plus an **interactive Workbench** you won't find anywhere
else. Everything runs locally, in memory: **no network requests, no telemetry, ever.**

<!--
  📸 TODO — add a hero demo here before publishing.
  Record a short GIF of the Workbench panel (Ctrl/Cmd+Alt+J): paste messy JSON on the left,
  prettify/convert on the right, pipe back to the editor. Save it to media/ and reference it
  with an ABSOLUTE raw-GitHub URL so it renders on the Marketplace, e.g.:

  <p align="center">
    <img src="https://raw.githubusercontent.com/karacaoglanberke/json-xml-toolkit/main/media/demo.gif" alt="Workbench demo" />
  </p>
-->

## ✨ Why this one?

- 🔒 **100% offline & private** — every operation runs locally in memory. No network calls, no telemetry; your data never leaves your machine. See [Privacy](#-privacy).
- 🧰 **One extension, 50+ operations** — the full JSON *and* XML toolkit, instead of five single-purpose add-ons.
- ⚡ **Interactive Workbench** (`Ctrl/Cmd+Alt+J`) — a two-pane scratchpad with live format auto-detection. Paste, transform, query, and pipe the result straight back into your editor.
- 🌳 **Structure tree** — an expandable outline of the active JSON document in the Explorer; click any node to jump to it. Lazy-loaded, so it stays fast on big files.
- ✅ **Schema validation & semantic diff** — validate against any JSON Schema with inline error markers, and diff two documents *after* normalizing formatting and key order so only real changes show.
- 🎯 **Selection or whole file** — every command transforms your selection, or the entire document when nothing is selected.
- 🩹 **Lenient by default** — comments, trailing commas, single quotes and unquoted keys are accepted (JSON5), so messy real-world data just works.
- 📊 **Live status bar** — validity, size, depth and key/element counts for the active JSON/XML file at a glance.

## 🚀 Getting started

1. **Open the Workbench** — press `Ctrl/Cmd+Alt+J` (or right-click → *Send Selection to Toolkit Workbench*) to paste, transform and pipe data back out.
2. **Command Palette** — `Ctrl/Cmd+Shift+P` → type `JSON & XML Toolkit` to browse every command.
3. **Right-click** — in any JSON/XML/YAML file, use the **JSON & XML Toolkit** submenu for the common ones.

> In-place transforms (prettify, minify, sort, escape, repair…) rewrite your selection. Conversions and queries open the result in a fresh editor, so your source stays intact.

## 🧩 Features

Fifty commands, one palette. Everything below works on a selection or the whole document.

### JSON
| Command | What it does |
| --- | --- |
| Prettify / Minify | Format with configurable indent, or compact to one line |
| Sort Keys | Recursively sort object keys (asc/desc) |
| Repair / Fix | Parse JSON5-style input and emit clean, valid JSON |
| Escape / Unescape String | Convert to/from a JSON string literal |
| Stringify / Parse | Wrap a document as a string value, or unwrap one |
| Flatten / Unflatten | Convert between nested and dot/bracket-notation form |
| Remove Null & Empty | Strip `null`, `""`, `[]`, `{}` recursively |
| Escape / Decode Unicode | Convert non-ASCII to `\uXXXX` and back |
| Query (JSONPath) | Run a JSONPath expression and collect matches |
| Validate against Schema | Check the document against a JSON Schema, with inline error markers |
| Analyze | Depth, key counts, type breakdown, byte size |

### XML
| Command | What it does |
| --- | --- |
| Prettify / Minify | Format with configurable indent, or compact to one line |
| Escape / Unescape | Convert to/from XML entities (`&lt;`, `&amp;`, …) |
| Query (XPath) | Run an XPath expression and collect matching nodes |
| Analyze | Elements, attributes, depth, and unique-tag counts |

### Convert
| Command | What it does |
| --- | --- |
| JSON → YAML / YAML → JSON | Round-trip between JSON and YAML |
| JSON → XML / XML → JSON | Round-trip between JSON and XML |
| JSON → CSV / CSV → JSON | Tabular round-trip with proper quoting and type coercion |
| JSON → TypeScript | Generate `interface` definitions from a sample |
| JSON → Go struct | Generate Go structs with `json:` tags |
| JSON → Protobuf | Generate `proto3` message definitions |
| JSON → Python dataclass | Generate `@dataclass` classes with type hints |

### Inspect
| Command | What it does |
| --- | --- |
| Diff (Semantic) | Compare the active document with another file; both sides are normalized (sorted keys, consistent formatting) first, so only meaningful differences show |
| JSON Structure tree | An expandable outline in the Explorer for JSON files; click a node to reveal it in the editor (lazy, so it stays fast on large files) |
| Status bar | Live validity, size, depth and key/element counts for the active JSON/XML file |

## ⚙️ Settings

| Setting | Default | Description |
| --- | --- | --- |
| `jsonXmlToolkit.indent` | `2` | Indentation for prettified output (`2`, `4`, or `tab`). |
| `jsonXmlToolkit.sortDirection` | `asc` | Direction for *Sort Keys*. |
| `jsonXmlToolkit.statusBar.enabled` | `true` | Show the live status-bar info item. |
| `jsonXmlToolkit.repair.useJson5` | `true` | Accept JSON5 syntax when repairing. |

## 🔒 Privacy

**Your data never leaves your machine.** Every transformation, query, conversion and validation
runs entirely in-process, on your local device.

- 🔌 **No network access** — the extension contains no `fetch`, `XMLHttpRequest`, `WebSocket`, or `http`/`https`/`net`/`dns` calls. It works fully offline (airplane mode, air-gapped machines).
- 🔒 **No telemetry, no tracking** — nothing about your documents or usage is collected or sent anywhere.
- 🧱 **Locked-down panel** — the Workbench webview runs under a strict Content-Security-Policy (`default-src 'none'`) that blocks any outbound connection at the browser level.
- 📄 **Schema validation stays local** — schemas are read from your own files and compiled synchronously; remote `$ref`s are **never fetched** (validation fails closed instead of reaching out).

The only addresses you may spot inside the bundle are *identifier strings* (e.g. JSON Schema
`$id`s and XML namespace URIs) that are never contacted.

> Note: VS Code's own telemetry is separate and controlled by your `telemetry.telemetryLevel`
> setting — this extension adds nothing to it.

## 🛠️ Building from source

```bash
npm install
npm run build      # bundles the extension to dist/
npm test           # runs the core unit tests
npm run package    # produces a .vsix
```

> **Publishing:** set `publisher` in `package.json` to your [Marketplace publisher id](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), then `vsce publish`.

## 📄 License

MIT © contributors
