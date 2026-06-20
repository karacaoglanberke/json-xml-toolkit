import * as vscode from 'vscode';
import { operations, type OpOptions } from './core/operations';
import { analyzeJson } from './core/json';
import { analyzeXml } from './core/xml';
import { ToolkitPanel } from './panel/toolkitPanel';
import { registerSchemaValidation } from './features/schemaValidation';
import { registerDiff } from './features/diff';
import { registerJsonTree } from './tree/jsonTreeProvider';

function readOptions(): OpOptions {
  const cfg = vscode.workspace.getConfiguration('jsonXmlToolkit');
  return {
    indent: cfg.get<'2' | '4' | 'tab'>('indent', '2'),
    sortDirection: cfg.get<'asc' | 'desc'>('sortDirection', 'asc'),
    useJson5: cfg.get<boolean>('repair.useJson5', true)
  };
}

/** Get the text the command should operate on plus the range to replace. */
function getTarget(editor: vscode.TextEditor): { text: string; range: vscode.Range } {
  const sel = editor.selection;
  if (!sel.isEmpty) {
    return { text: editor.document.getText(sel), range: sel };
  }
  const full = new vscode.Range(
    editor.document.positionAt(0),
    editor.document.positionAt(editor.document.getText().length)
  );
  return { text: editor.document.getText(), range: full };
}

async function openResultDocument(content: string, language: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(doc, { preview: false });
}

async function runOperation(commandId: string): Promise<void> {
  const op = operations[commandId];
  if (!op) {
    return;
  }
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('JSON & XML Toolkit: open a file and try again.');
    return;
  }

  const opts = readOptions();
  const { text, range } = getTarget(editor);

  if (op.needsExpression) {
    const isXml = commandId.includes('.xml.');
    const expression = await vscode.window.showInputBox({
      prompt: isXml ? 'Enter an XPath expression' : 'Enter a JSONPath expression',
      placeHolder: isXml ? '//book[@id]/title' : '$.store.book[*].author',
      value: isXml ? '//*' : '$..*'
    });
    if (expression === undefined) {
      return;
    }
    opts.expression = expression;
  }

  try {
    const result = op.run(text, opts);
    if (op.outputMode === 'replace') {
      await editor.edit((eb) => eb.replace(range, result.output));
      if (result.meta) {
        vscode.window.setStatusBarMessage(`$(check) ${op.label} — ${result.meta}`, 4000);
      }
    } else if (op.outputMode === 'document') {
      await openResultDocument(result.output, op.language ?? 'plaintext');
      if (result.meta) {
        vscode.window.setStatusBarMessage(`$(check) ${op.label} — ${result.meta}`, 4000);
      }
    } else {
      // info
      await openResultDocument(result.output, 'json');
    }
  } catch (e) {
    vscode.window.showErrorMessage(`${op.label} failed: ${(e as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Status bar
// ---------------------------------------------------------------------------

function setupStatusBar(context: vscode.ExtensionContext): void {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'jsonXmlToolkit.openPanel';
  context.subscriptions.push(item);

  const update = () => {
    const cfg = vscode.workspace.getConfiguration('jsonXmlToolkit');
    if (!cfg.get<boolean>('statusBar.enabled', true)) {
      item.hide();
      return;
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      item.hide();
      return;
    }
    const lang = editor.document.languageId;
    const text = editor.document.getText();
    if (lang === 'json' || lang === 'jsonc') {
      const s = analyzeJson(text);
      item.text = s.valid
        ? `$(json) ${formatBytes(s.bytes)} · depth ${s.maxDepth} · ${s.keyCount} keys`
        : `$(error) Invalid JSON`;
      item.tooltip = s.valid
        ? `JSON & XML Toolkit\nObjects: ${s.objectCount}  Arrays: ${s.arrayCount}\nUnique keys: ${s.uniqueKeys}\nClick to open the Toolkit Workbench`
        : s.error;
      item.show();
    } else if (lang === 'xml') {
      const s = analyzeXml(text);
      item.text = s.valid
        ? `$(code) ${formatBytes(s.bytes)} · depth ${s.maxDepth} · ${s.elementCount} els`
        : `$(error) Invalid XML`;
      item.tooltip = s.valid
        ? `JSON & XML Toolkit\nElements: ${s.elementCount}  Attributes: ${s.attributeCount}\nUnique tags: ${s.uniqueTags}\nClick to open the Toolkit Workbench`
        : s.error;
      item.show();
    } else {
      item.hide();
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(update),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) {
        update();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('jsonXmlToolkit.statusBar.enabled')) {
        update();
      }
    })
  );
  update();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
  for (const id of Object.keys(operations)) {
    context.subscriptions.push(vscode.commands.registerCommand(id, () => runOperation(id)));
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('jsonXmlToolkit.openPanel', () => {
      ToolkitPanel.show(context);
    }),
    vscode.commands.registerCommand('jsonXmlToolkit.openPanelWithSelection', () => {
      const editor = vscode.window.activeTextEditor;
      const seed = editor ? getTarget(editor).text : '';
      ToolkitPanel.show(context, seed);
    })
  );

  registerSchemaValidation(context);
  registerDiff(context);
  registerJsonTree(context);

  setupStatusBar(context);
}

export function deactivate(): void {
  // Nothing to clean up beyond context subscriptions.
}
