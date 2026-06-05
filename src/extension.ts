import * as vscode from 'vscode';
import { getWebviewHtml, getProcessedBlocks } from './preview';
import { exec } from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | undefined;
    let lastActiveEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor;
    let suppressScrollSync = false;
    let updateTimer: ReturnType<typeof setTimeout> | undefined;

    // Track the last active text editor
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                lastActiveEditor = editor;
            }
        })
    );

    const sendBlockUpdate = () => {
        if (panel && lastActiveEditor) {
            const text = lastActiveEditor.document.getText();
            const blocks = getProcessedBlocks(text);
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
        panel = vscode.window.createWebviewPanel(
            'latexPreview',
            'LaTeX Visual Preview',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        // Set the HTML shell once — never replaced
        panel.webview.html = getWebviewHtml();

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
                    editor.revealRange(
                        new vscode.Range(position, position),
                        vscode.TextEditorRevealType.InCenter
                    );
                    vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
                }
            }
        }, undefined, context.subscriptions);

        // Update when the user types (debounced)
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === lastActiveEditor?.document) {
                debouncedUpdate();
            }
        });

        // Clean up when closed
        panel.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    });

    context.subscriptions.push(disposable);

    // Cursor sync: editor -> preview
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(e => {
            if (suppressScrollSync) { return; }
            if (panel && e.textEditor.document.languageId === 'latex') {
                const line = e.selections[0].active.line + 1;
                panel.webview.postMessage({
                    command: 'scrollToLine',
                    line: line
                });
            }
        })
    );

    // Status Bar Button
    const compileBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    compileBtn.command = 'instant-latex.compilePDF';
    compileBtn.text = `$(rocket) Compile PDF`;
    compileBtn.tooltip = 'Run pdflatex to generate PDF';

    const updateBtnVisibility = () => {
        if (vscode.window.activeTextEditor?.document.languageId === 'latex') {
            compileBtn.show();
        } else {
            compileBtn.hide();
        }
    };
    
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateBtnVisibility));
    updateBtnVisibility();

    // Compile Command
    let compileCmd = vscode.commands.registerCommand('instant-latex.compilePDF', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const filePath = editor.document.fileName;
        const dir = path.dirname(filePath);

        vscode.window.showInformationMessage('Compiling PDF...');

        const cmd = `pdflatex -interaction=nonstopmode -output-directory="${dir}" "${filePath}"`;

        exec(cmd, (error) => {
            if (error) {
                vscode.window.showErrorMessage(`Compile Error: ${error.message}`);
                return;
            }
            vscode.window.showInformationMessage('PDF Compiled Successfully!');
        });
    });

    context.subscriptions.push(compileBtn, compileCmd);
}
