import * as katex from 'katex';

export function getHtmlContent(text: string): string {
    // 1. Extract content between \begin{document} and \end{document}
    const bodyMatch = text.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
    let content = bodyMatch ? bodyMatch[1] : text;

    // 2. Handle Math BEFORE other transformations
    // Handle Block Math: $$ ... $$ or \[ ... \]
    content = content.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g, (match, p1, p2) => {
        const math = p1 || p2;
        return `<div class="math-block">${katex.renderToString(math, { displayMode: true, throwOnError: false })}</div>`;
    });

    // Handle Inline Math: $ ... $ or \( ... \)
    content = content.replace(/\$([\s\S]*?)\$|\\\(([\s\S]*?)\\\)/g, (match, p1, p2) => {
        const math = p1 || p2;
        return katex.renderToString(math, { displayMode: false, throwOnError: false });
    });

    // 3. Basic Structure (Sections and Bold)
    let processed = content
        .replace(/\\section\{(.*?)\}/g, '<h1>$1</h1>')
        .replace(/\\subsection\{(.*?)\}/g, '<h2>$1</h2>')
        .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
        .replace(/\n\s*\n/g, '</p><p>');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dgadelha/latin-modern-webfont@master/style.css">
            <style>
                body { background-color: #525659; display: flex; justify-content: center; padding: 20px; font-family: "Latin Modern Roman", serif; }
                .paper { background: white; width: 100%; max-width: 800px; padding: 60px; box-shadow: 0 0 10px rgba(0,0,0,0.5); color: black; min-height: 100vh; }
                .math-block { margin: 1em 0; text-align: center; }
                h1 { text-align: center; font-size: 1.8em; }
                h2 { font-size: 1.4em; }
                p { margin-bottom: 1em; text-indent: 1.5em; line-height: 1.5; text-align: justify; }
                h1+p, h2+p { text-indent: 0; }
            </style>
        </head>
        <body>
            <div class="paper">
                <p>${processed}</p>
            </div>
        </body>
        </html>`;
}