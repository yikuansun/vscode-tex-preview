"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const preview_1 = require("./preview");
const child_process_1 = require("child_process");
const path = require("path");
function activate(context) {
    let panel;
    let lastActiveEditor = vscode.window.activeTextEditor;
    let suppressScrollSync = false;
    let updateTimer;
    // Track the last active text editor
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            lastActiveEditor = editor;
        }
    }));
    const sendBlockUpdate = () => {
        if (panel && lastActiveEditor) {
            const text = lastActiveEditor.document.getText();
            const blocks = (0, preview_1.getProcessedBlocks)(text);
            panel.webview.postMessage({ command: 'updateBlocks', blocks });
        }
    };
    const debouncedUpdate = () => {
        if (updateTimer) {
            clearTimeout(updateTimer);
        }
        updateTimer = setTimeout(() => {
            sendBlockUpdate();
            updateTimer = undefined;
        }, 100);
    };
    let disposable = vscode.commands.registerCommand('instant-latex.showPreview', () => {
        panel = vscode.window.createWebviewPanel('latexPreview', 'LaTeX Visual Preview', vscode.ViewColumn.Beside, { enableScripts: true });
        // Set the HTML shell once — never replaced
        panel.webview.html = (0, preview_1.getWebviewHtml)();
        // Send initial content after a brief delay for the webview to initialize
        setTimeout(() => sendBlockUpdate(), 50);
        // Handle messages from the webview (e.g., click-to-jump)
        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'jumpToLine') {
                const editor = lastActiveEditor;
                if (editor) {
                    suppressScrollSync = true;
                    setTimeout(() => { suppressScrollSync = false; }, 300);
                    const line = Math.max(0, message.line - 1);
                    const position = new vscode.Position(line, 0);
                    editor.selection = new vscode.Selection(position, position);
                    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                    vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
                }
            }
        }, undefined, context.subscriptions);
        // Update when the user types (debounced)
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === (lastActiveEditor === null || lastActiveEditor === void 0 ? void 0 : lastActiveEditor.document)) {
                debouncedUpdate();
            }
        });
        // Clean up when closed
        panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    });
    context.subscriptions.push(disposable);
    // Cursor sync: editor -> preview
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
        if (suppressScrollSync) {
            return;
        }
        if (panel && e.textEditor.document.languageId === 'latex') {
            const line = e.selections[0].active.line + 1;
            panel.webview.postMessage({
                command: 'scrollToLine',
                line: line
            });
        }
    }));
    // Status Bar Button
    const compileBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    compileBtn.command = 'instant-latex.compilePDF';
    compileBtn.text = `$(rocket) Compile PDF`;
    compileBtn.tooltip = 'Run pdflatex to generate PDF';
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
    // Compile Command
    let compileCmd = vscode.commands.registerCommand('instant-latex.compilePDF', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const filePath = editor.document.fileName;
        const dir = path.dirname(filePath);
        vscode.window.showInformationMessage('Compiling PDF...');
        const cmd = `pdflatex -interaction=nonstopmode -output-directory="${dir}" "${filePath}"`;
        (0, child_process_1.exec)(cmd, (error) => {
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