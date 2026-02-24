import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | undefined;

    // 1. LIVE PREVIEW (The "Visual" Editor)
    vscode.workspace.onDidChangeTextDocument(e => {
        if (panel && e.document === vscode.window.activeTextEditor?.document) {
            panel.webview.html = getHtmlContent(e.document.getText());
        }
    });

    // 2. FINAL COMPILE (The "Overleaf Compile" Button)
    let compileCmd = vscode.commands.registerCommand('instant-latex.compilePDF', () => {
        vscode.window.showInformationStatusLineItem('Compiling PDF...', 'loading');
        // Run your heavy 'pdflatex' or 'tectonic' command here
        // Then open the resulting PDF in a separate tab
    });

    context.subscriptions.push(compileCmd);
}