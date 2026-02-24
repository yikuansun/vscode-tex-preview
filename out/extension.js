"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const preview_1 = require("./preview");
const child_process_1 = require("child_process");
const path = require("path");
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
    // 1. Create the Status Bar Button
    const compileBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    compileBtn.command = 'instant-latex.compilePDF';
    compileBtn.text = `$(rocket) Compile PDF`;
    compileBtn.tooltip = 'Run pdflatex to generate PDF';
    // Show button only if a LaTeX file is active
    const updateBtnVisibility = () => {
        var _a;
        if (((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.languageId) === 'latex') {
            compileBtn.show();
        }
        else {
            compileBtn.hide();
        }
    };
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateBtnVisibility));
    updateBtnVisibility();
    // 2. Register the Compile Command
    let compileCmd = vscode.commands.registerCommand('instant-latex.compilePDF', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const filePath = editor.document.fileName;
        const dir = path.dirname(filePath);
        vscode.window.showInformationMessage('Compiling PDF...');
        // Command: pdflatex in nonstop mode (so it doesn't hang on errors)
        const cmd = `pdflatex -interaction=nonstopmode -output-directory="${dir}" "${filePath}"`;
        (0, child_process_1.exec)(cmd, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Compile Error: ${error.message}`);
                return;
            }
            vscode.window.showInformationMessage('PDF Compiled Successfully!');
        });
    });
    context.subscriptions.push(compileBtn, compileCmd);
}
//# sourceMappingURL=extension.js.map