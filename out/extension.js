"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const preview_1 = require("./preview");
function activate(context) {
    let panel;
    const updateWebview = () => {
        if (panel && vscode.window.activeTextEditor) {
            const text = vscode.window.activeTextEditor.document.getText();
            panel.webview.html = (0, preview_1.getHtmlContent)(text);
        }
    };
    let disposable = vscode.commands.registerCommand('instant-latex.showPreview', () => {
        panel = vscode.window.createWebviewPanel('latexPreview', 'LaTeX Visual Preview', vscode.ViewColumn.Beside, { enableScripts: true });
        updateWebview();
        // Update when the user types
        vscode.workspace.onDidChangeTextDocument(e => {
            var _a;
            if (e.document === ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document)) {
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
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
        if (panel && e.textEditor.document.languageId === 'latex') {
            const line = e.selections[0].active.line + 1; // +1 because VS Code is 0-indexed
            panel.webview.postMessage({
                command: 'scrollToLine',
                line: line
            });
        }
    }));
}
//# sourceMappingURL=extension.js.map