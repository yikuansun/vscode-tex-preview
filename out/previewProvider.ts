import * as vscode from 'vscode';
import * as katex from 'katex'; // You'll need to bundle this

const LATEX_CSS = `
:root {
    --latex-font: "Latin Modern Roman", "Computer Modern", serif;
}

body {
    background-color: var(--vscode-editor-background);
    display: flex;
    justify-content: center;
    padding: 20px;
}

.paper {
    background-color: white;
    color: #1a1a1a; /* LaTeX text is usually deep black */
    width: 100%;
    max-width: 800px; /* Mimics A4/Letter width */
    min-height: 100vh;
    padding: 80px; /* Standard LaTeX wide margins */
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    font-family: var(--latex-font);
    line-height: 1.5;
    text-align: justify;
}

h1 { font-size: 2em; text-align: center; margin-bottom: 1.5em; }
h2 { font-size: 1.5em; border-bottom: none; margin-top: 1.2em; }
h3 { font-size: 1.2em; }

/* Indent paragraphs unless they follow a heading */
p { margin: 0; text-indent: 1.5em; }
h1 + p, h2 + p, h3 + p { text-indent: 0; }

/* LaTeX-style Blockquote */
blockquote {
    margin: 1.5em 2.5em;
    font-size: 0.95em;
}
`;

export function getHtmlContent(text: string): string {
    // 1. Simple Preamble Stripping
    const bodyMatch = text.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
    let content = bodyMatch ? bodyMatch[1] : text;

    // 2. Transformations
    let html = content
        .replace(/\\section\{(.*?)\}/g, '<h1>$1</h1>')
        .replace(/\\subsection\{(.*?)\}/g, '<h2>$1</h2>')
        .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
        .replace(/\n\s*\n/g, '</p><p>') // Double newlines to paragraphs

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dgadelha/latin-modern-webfont@master/style.css">
            <style>
                /* Paste the CSS from above here */
                ${LATEX_CSS}
            </style>
        </head>
        <body>
            <div class="paper">
                <p>${html}</p>
            </div>
        </body>
        </html>`;
}