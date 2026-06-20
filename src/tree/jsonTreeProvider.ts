import * as vscode from 'vscode';
import * as jsonc from 'jsonc-parser';

interface TreeEntry {
  label: string;
  node: jsonc.Node;
}

/** Tree view of the active JSON/JSONC document's structure (lazy, large-file friendly). */
export class JsonTreeProvider implements vscode.TreeDataProvider<TreeEntry> {
  private readonly emitter = new vscode.EventEmitter<TreeEntry | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;

  private root: jsonc.Node | undefined;
  private docUri: vscode.Uri | undefined;
  private debounce: NodeJS.Timeout | undefined;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.refresh()),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          clearTimeout(this.debounce);
          this.debounce = setTimeout(() => this.refresh(), 300);
        }
      })
    );
    this.refresh();
  }

  private refresh(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor && (editor.document.languageId === 'json' || editor.document.languageId === 'jsonc')) {
      this.root = jsonc.parseTree(editor.document.getText());
      this.docUri = editor.document.uri;
    } else {
      this.root = undefined;
      this.docUri = undefined;
    }
    this.emitter.fire(undefined);
  }

  getTreeItem(entry: TreeEntry): vscode.TreeItem {
    const { label, node } = entry;
    const expandable = (node.type === 'object' || node.type === 'array') && !!node.children?.length;
    const item = new vscode.TreeItem(
      label,
      expandable ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );
    item.description = preview(node);
    item.iconPath = iconFor(node);
    item.tooltip = `${label}\nType: ${node.type}`;
    if (this.docUri) {
      item.command = {
        command: 'jsonXmlToolkit.tree.reveal',
        title: 'Reveal',
        arguments: [this.docUri, node.offset, node.length]
      };
    }
    return item;
  }

  getChildren(entry?: TreeEntry): TreeEntry[] {
    const node = entry ? entry.node : this.root;
    if (!node) {
      return [];
    }
    if (node.type === 'object') {
      return (node.children ?? []).map((prop) => {
        const key = prop.children?.[0]?.value ?? '?';
        const value = prop.children?.[1];
        return { label: String(key), node: value ?? prop };
      });
    }
    if (node.type === 'array') {
      return (node.children ?? []).map((child, i) => ({ label: `[${i}]`, node: child }));
    }
    return [];
  }
}

function preview(node: jsonc.Node): string {
  switch (node.type) {
    case 'object':
      return `{${node.children?.length ?? 0}}`;
    case 'array':
      return `[${node.children?.length ?? 0}]`;
    case 'string':
      return JSON.stringify(node.value).slice(0, 60);
    default:
      return String(node.value);
  }
}

function iconFor(node: jsonc.Node): vscode.ThemeIcon {
  switch (node.type) {
    case 'object':
      return new vscode.ThemeIcon('symbol-object');
    case 'array':
      return new vscode.ThemeIcon('symbol-array');
    case 'string':
      return new vscode.ThemeIcon('symbol-string');
    case 'number':
      return new vscode.ThemeIcon('symbol-number');
    case 'boolean':
      return new vscode.ThemeIcon('symbol-boolean');
    default:
      return new vscode.ThemeIcon('symbol-null');
  }
}

export function registerJsonTree(context: vscode.ExtensionContext): void {
  const provider = new JsonTreeProvider(context);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('jsonXmlToolkit.tree', provider),
    vscode.commands.registerCommand(
      'jsonXmlToolkit.tree.reveal',
      async (uri: vscode.Uri, offset: number, length: number) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc, { preserveFocus: false });
        const range = new vscode.Range(doc.positionAt(offset), doc.positionAt(offset + length));
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      }
    )
  );
}
