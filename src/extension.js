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
        });
        // Clean up when closed
        panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    });
    context.subscriptions.push(disposable);
}
//# sourceMappingURL=extension.js.map