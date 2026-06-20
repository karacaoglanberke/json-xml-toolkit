import * as vscode from 'vscode';
import * as jsonc from 'jsonc-parser';
import { validateJsonSchema, formatSchemaReport, type SchemaError } from '../core/schema';

/** Map a schema error to a precise range in the data document. */
function rangeForError(
  tree: jsonc.Node | undefined,
  doc: vscode.TextDocument,
  error: SchemaError
): vscode.Range {
  if (!tree) {
    return new vscode.Range(0, 0, 0, 1);
  }
  const segments = error.instancePath === '(root)' ? [] : error.instancePath.split('/').filter(Boolean);
  const path: jsonc.JSONPath = segments.map((s) => (/^\d+$/.test(s) ? Number(s) : s));

  let node = jsonc.findNodeAtLocation(tree, path);
  // For a missing required property, highlight the containing object.
  if (!node && error.keyword === 'required') {
    node = jsonc.findNodeAtLocation(tree, path) ?? tree;
  }
  const target = node ?? tree;
  const start = doc.positionAt(target.offset);
  const end = doc.positionAt(target.offset + Math.max(target.length, 1));
  return new vscode.Range(start, end);
}

async function pickSchema(dataUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  const found = await vscode.workspace.findFiles('**/*.{schema.json,json}', '**/node_modules/**', 200);
  const schemaLike = found.filter((u) => u.fsPath !== dataUri.fsPath);

  const browseItem: vscode.QuickPickItem = { label: '$(folder-opened) Browse for a schema file…' };
  const items: vscode.QuickPickItem[] = [
    browseItem,
    ...schemaLike.map((u) => ({
      label: '$(json) ' + vscode.workspace.asRelativePath(u),
      description: u.fsPath
    }))
  ];

  const choice = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a JSON Schema to validate against'
  });
  if (!choice) {
    return undefined;
  }
  if (choice === browseItem || !choice.description) {
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { 'JSON Schema': ['json'] },
      openLabel: 'Use as schema'
    });
    return picked?.[0];
  }
  return vscode.Uri.file(choice.description);
}

export function registerSchemaValidation(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('jsonXmlToolkit.schema');
  context.subscriptions.push(diagnostics);

  context.subscriptions.push(
    vscode.commands.registerCommand('jsonXmlToolkit.json.validateSchema', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Open a JSON document to validate.');
        return;
      }
      const doc = editor.document;
      const schemaUri = await pickSchema(doc.uri);
      if (!schemaUri) {
        return;
      }

      try {
        const schemaText = Buffer.from(await vscode.workspace.fs.readFile(schemaUri)).toString('utf8');
        const result = validateJsonSchema(doc.getText(), schemaText);

        diagnostics.delete(doc.uri);
        if (result.valid) {
          vscode.window.showInformationMessage('✓ JSON is valid against the schema.');
          return;
        }

        const tree = jsonc.parseTree(doc.getText());
        const diags = result.errors.map((e) => {
          const d = new vscode.Diagnostic(
            rangeForError(tree, doc, e),
            `${e.message}${e.key ? ` (property: ${e.key})` : ''}`,
            vscode.DiagnosticSeverity.Error
          );
          d.source = 'JSON Schema';
          return d;
        });
        diagnostics.set(doc.uri, diags);

        const report = await vscode.workspace.openTextDocument({
          content: formatSchemaReport(result),
          language: 'plaintext'
        });
        await vscode.window.showTextDocument(report, { preview: true, viewColumn: vscode.ViewColumn.Beside });
        vscode.window.showErrorMessage(`✗ ${result.errors.length} schema error(s). See Problems panel.`);
      } catch (e) {
        vscode.window.showErrorMessage(`Schema validation failed: ${(e as Error).message}`);
      }
    })
  );
}
