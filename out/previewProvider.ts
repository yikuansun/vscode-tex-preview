import * as vscode from 'vscode';
import * as katex from 'katex'; // You'll need to bundle this

export function getHtmlContent(text: string): string {
    let html = text
        // 1. Handle Sections
        .replace(/\\section\{(.*?)\}/g, '<h1>$1</h1>')
        .replace(/\\subsection\{(.*?)\}/g, '<h2>$1</h2>')
        
        // 2. Handle Bold/Italic
        .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
        .replace(/\\textit\{(.*?)\}/g, '<i>$1</i>')
        
        // 3. Handle Math (Simplified example)
        // In a real app, you'd find $...$ and run it through katex.renderToString()
        .replace(/\$(.*?)\$/g, (match, math) => {
            return katex.renderToString(math, { throwOnError: false });
        });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
            <style>
                body { font-family: 'Computer Modern', serif; line-height: 1.6; padding: 20px; }
                h1 { color: var(--vscode-editor-foreground); border-bottom: 1px solid #ccc; }
            </style>
        </head>
        <body>${html}</body>
        </html>`;
}