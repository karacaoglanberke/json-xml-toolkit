import * as vscode from 'vscode';
import { operations, type OpOptions } from '../core/operations';
import { detectFormat } from '../core/detect';

interface InboundMessage {
  type: 'run' | 'detect' | 'replaceEditor' | 'openDocument';
  commandId?: string;
  input?: string;
  expression?: string;
  language?: string;
}

export class ToolkitPanel {
  public static current: ToolkitPanel | undefined;
  private static readonly viewType = 'jsonXmlToolkit.workbench';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  public static show(context: vscode.ExtensionContext, seed?: string): void {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (ToolkitPanel.current) {
      ToolkitPanel.current.panel.reveal(column);
      if (seed) {
        ToolkitPanel.current.panel.webview.postMessage({ type: 'seed', input: seed });
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      ToolkitPanel.viewType,
      'JSON & XML Toolkit',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );
    ToolkitPanel.current = new ToolkitPanel(panel, context, seed);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    seed?: string
  ) {
    this.panel = panel;
    this.panel.webview.html = this.html(this.panel.webview);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg: InboundMessage) => this.handleMessage(msg),
      null,
      this.disposables
    );

    if (seed) {
      // Give the webview a tick to wire up its listener.
      setTimeout(() => this.panel.webview.postMessage({ type: 'seed', input: seed }), 120);
    }
  }

  private readOptions(expression?: string): OpOptions {
    const cfg = vscode.workspace.getConfiguration('jsonXmlToolkit');
    return {
      indent: cfg.get<'2' | '4' | 'tab'>('indent', '2'),
      sortDirection: cfg.get<'asc' | 'desc'>('sortDirection', 'asc'),
      useJson5: cfg.get<boolean>('repair.useJson5', true),
      expression
    };
  }

  private async handleMessage(msg: InboundMessage): Promise<void> {
    switch (msg.type) {
      case 'detect': {
        this.panel.webview.postMessage({
          type: 'detected',
          format: detectFormat(msg.input ?? '')
        });
        return;
      }
      case 'run': {
        const op = operations[msg.commandId ?? ''];
        if (!op) {
          return;
        }
        try {
          const result = op.run(msg.input ?? '', this.readOptions(msg.expression));
          this.panel.webview.postMessage({
            type: 'result',
            commandId: op.id,
            output: result.output,
            meta: result.meta ?? '',
            language: op.language ?? 'json'
          });
        } catch (e) {
          this.panel.webview.postMessage({ type: 'error', message: (e as Error).message });
        }
        return;
      }
      case 'replaceEditor': {
        const editor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.scheme === 'file' || e.document.uri.scheme === 'untitled'
        );
        if (!editor) {
          vscode.window.showWarningMessage('No editor to write into. Open a file first.');
          return;
        }
        const full = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(editor.document.getText().length)
        );
        await editor.edit((eb) => eb.replace(full, msg.input ?? ''));
        vscode.window.setStatusBarMessage('$(check) Toolkit: editor updated', 3000);
        return;
      }
      case 'openDocument': {
        const doc = await vscode.workspace.openTextDocument({
          content: msg.input ?? '',
          language: msg.language ?? 'json'
        });
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
        return;
      }
    }
  }

  private html(webview: vscode.Webview): string {
    const nonce = getNonce();
    const uri = (file: string) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', file));

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
  <link href="${uri('workbench.css')}" rel="stylesheet" />
  <title>JSON & XML Toolkit</title>
</head>
<body>
  <div id="app">
    <header class="bar">
      <div class="brand"><span class="logo">{ }</span> Toolkit Workbench</div>
      <div class="detected">Format: <span id="format-badge" class="badge">—</span></div>
    </header>

    <section class="toolbar" id="toolbar"></section>

    <section class="query-row" id="query-row" hidden>
      <input id="expression" type="text" placeholder="$.path.to[*].value  (JSONPath)" spellcheck="false" />
      <button id="run-query" class="primary">Run query</button>
    </section>

    <main class="panes">
      <div class="pane">
        <div class="pane-head">
          <span>Input</span>
          <div class="pane-actions">
            <button data-act="paste-sample">Sample</button>
            <button data-act="clear">Clear</button>
          </div>
        </div>
        <textarea id="input" spellcheck="false" placeholder="Paste JSON, XML, YAML or CSV here…"></textarea>
      </div>
      <div class="pane">
        <div class="pane-head">
          <span>Output <span id="meta" class="meta"></span></span>
          <div class="pane-actions">
            <button data-act="copy">Copy</button>
            <button data-act="swap">Use as input ↺</button>
            <button data-act="to-editor">Replace editor</button>
            <button data-act="to-document">New document</button>
          </div>
        </div>
        <textarea id="output" spellcheck="false" readonly placeholder="Result appears here…"></textarea>
      </div>
    </main>

    <footer class="status" id="status">Ready.</footer>
  </div>
  <script nonce="${nonce}" src="${uri('workbench.js')}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    ToolkitPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
