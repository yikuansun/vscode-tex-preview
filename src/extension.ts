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

            // Send the current line number to the webview
            const editor = vscode.window.activeTextEditor;
            if (editor && panel) {
                const line = editor.selection.active.line;
                panel.webview.postMessage({ command: 'scrollToLine', line: line });
            }
        });

        // Clean up when closed
        panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    });

    context.subscriptions.push(disposable);

    // Inside the activate function
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(e => {
            if (panel && e.textEditor.document.languageId === 'latex') {
                const line = e.selections[0].active.line + 1; // +1 because VS Code is 0-indexed
                panel.webview.postMessage({
                    command: 'scrollToLine',
                    line: line
                });
            }
        })
    );
}