// Activation smoke test — runs in `vscode:prepublish` so a broken bundle can
// never be published again (the 1.1.0/1.1.1 "command not found" regression).
//
// It loads the *built* dist/extension.js with a stubbed `vscode` module and
// asserts that the bundle loads and activate() registers the expected commands.
// Because dependencies are external, a require() that cannot be resolved from
// node_modules (the original root cause) makes this fail loudly.
const path = require('path');
const Module = require('module');

const DIST = path.join(__dirname, '..', 'dist', 'extension.js');
const EXPECTED = [
  'jsonXmlToolkit.json.prettify',
  'jsonXmlToolkit.convert.jsonToYaml',
  'jsonXmlToolkit.json.validateSchema',
  'jsonXmlToolkit.diff'
];

const registered = [];
const anyProxy = new Proxy(function () {}, {
  get: (_t, p) => (p === Symbol.toPrimitive || p === 'then' || p === Symbol.iterator ? undefined : anyProxy),
  apply: () => anyProxy,
  construct: () => anyProxy
});
const ns = ['window', 'workspace', 'languages', 'env', 'Uri', 'EventEmitter', 'ThemeIcon', 'TreeItem',
  'Range', 'Position', 'Selection', 'Diagnostic', 'MarkdownString', 'RelativePattern'];
const target = {
  commands: { registerCommand: (id) => { registered.push(id); return { dispose() {} }; }, executeCommand: () => {} },
  StatusBarAlignment: { Right: 2, Left: 1 },
  ViewColumn: { One: 1, Beside: -2 },
  TreeItemCollapsibleState: { None: 0, Collapsed: 1 },
  DiagnosticSeverity: { Error: 0, Warning: 1 },
  TextEditorRevealType: { InCenter: 2 }
};
for (const n of ns) target[n] = anyProxy;
const fakeVscode = new Proxy(target, { get: (t, p) => (p in t ? t[p] : anyProxy) });

const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'vscode') return fakeVscode;
  return origLoad.apply(this, arguments);
};

function fail(msg, err) {
  console.error(`\n✗ Activation smoke test FAILED: ${msg}`);
  if (err) console.error(err.stack || err);
  process.exit(1);
}

let ext;
try {
  ext = require(DIST);
} catch (e) {
  fail('bundle failed to load (a dependency could not be required?)', e);
}
try {
  ext.activate({ subscriptions: { push() {} }, extensionUri: anyProxy, extensionPath: '.' });
} catch (e) {
  fail('activate() threw', e);
}

const missing = EXPECTED.filter((id) => !registered.includes(id));
if (missing.length) {
  fail(`activate() did not register: ${missing.join(', ')}`);
}

console.log(`✓ Activation smoke test passed — ${registered.length} commands registered.`);
