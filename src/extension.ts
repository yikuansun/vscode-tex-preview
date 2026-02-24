import * as vscode from 'vscode';
import { getHtmlContent } from './preview';

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | undefined;

    const updateWebview = () => {
        if (panel && vscode.window.activeTextEditor) {
            const text = vscode.window.activeTextEditor.document.getText();
            panel.webview.html = getHtmlContent(text);
        }
    };

    let disposable = vscode.commands.registerCommand('instant-latex.showPreview', () => {
        panel = vscode.window.createWebviewPanel(
            'latexPreview',
            'LaTeX Visual Preview',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        updateWebview();

        // Update when the user types
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === vscode.window.activeTextEditor?.document) {
                updateWebview();
            }
        });

        // Clean up when closed
        panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    });

    context.subscriptions.push(disposable);
}