import * as vscode from 'vscode';
import { sortKeys, prettifyJson } from '../core/json';
import { prettifyXml } from '../core/xml';

const SCHEME = 'json-xml-toolkit-diff';

/** Read-only in-memory documents used as the two sides of the diff. */
class DiffContentProvider implements vscode.TextDocumentContentProvider {
  private readonly store = new Map<string, string>();

  set(key: string, content: string): vscode.Uri {
    this.store.set(key, content);
    return vscode.Uri.parse(`${SCHEME}:${key}`);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.store.get(uri.path) ?? '';
  }
}

/** Normalize so that formatting/key-order noise doesn't show up as a diff. */
function normalize(text: string, languageId: string): { content: string; ext: string } {
  try {
    if (languageId === 'xml') {
      return { content: prettifyXml(text, '2'), ext: 'xml' };
    }
    if (languageId === 'json' || languageId === 'jsonc') {
      return { content: sortKeys(text, 'asc', '2'), ext: 'json' };
    }
    // Best effort: try JSON, else leave as-is.
    return { content: prettifyJson(text, '2'), ext: 'json' };
  } catch {
    return { content: text, ext: 'txt' };
  }
}

export function registerDiff(context: vscode.ExtensionContext): void {
  const provider = new DiffContentProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jsonXmlToolkit.diff', async () => {
      const left = vscode.window.activeTextEditor?.document;
      if (!left) {
        vscode.window.showWarningMessage('Open a document to use as the left side of the diff.');
        return;
      }

      const others = vscode.workspace.textDocuments.filter(
        (d) => d.uri.toString() !== left.uri.toString() && d.uri.scheme !== SCHEME
      );

      const browseItem: vscode.QuickPickItem = { label: '$(folder-opened) Browse for a file…' };
      const items: vscode.QuickPickItem[] = [
        browseItem,
        ...others.map((d) => ({
          label: '$(file) ' + vscode.workspace.asRelativePath(d.uri),
          description: d.uri.toString()
        }))
      ];

      const choice = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select the document to compare against (normalized semantic diff)'
      });
      if (!choice) {
        return;
      }

      let right: vscode.TextDocument;
      if (choice === browseItem || !choice.description) {
        const picked = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Compare' });
        if (!picked?.[0]) {
          return;
        }
        right = await vscode.workspace.openTextDocument(picked[0]);
      } else {
        right = vscode.workspace.textDocuments.find((d) => d.uri.toString() === choice.description)!;
      }

      const a = normalize(left.getText(), left.languageId);
      const b = normalize(right.getText(), right.languageId);

      const leftName = `${nameOf(left.uri)} (normalized)`;
      const rightName = `${nameOf(right.uri)} (normalized)`;
      const leftUri = provider.set(`left/${leftName}.${a.ext}`, a.content);
      const rightUri = provider.set(`right/${rightName}.${b.ext}`, b.content);

      await vscode.commands.executeCommand(
        'vscode.diff',
        leftUri,
        rightUri,
        `${nameOf(left.uri)} ↔ ${nameOf(right.uri)}`
      );
    })
  );
}

function nameOf(uri: vscode.Uri): string {
  const parts = uri.path.split('/');
  return parts[parts.length - 1] || uri.toString();
}
