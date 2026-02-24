import * as katex from 'katex';

export function getHtmlContent(text: string): string {
    // 1. Extract content
    const bodyMatch = text.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
    let content = bodyMatch ? bodyMatch[1] : text;

    // 2. Handle Math (Keep existing KaTeX logic)
    content = content.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g, (match, p1, p2) => {
        return `<div class="math-block">${katex.renderToString(p1 || p2, { displayMode: true, throwOnError: false })}</div>`;
    });
    content = content.replace(/\$([\s\S]*?)\$|\\\(([\s\S]*?)\\\)/g, (match, p1, p2) => {
        return katex.renderToString(p1 || p2, { displayMode: false, throwOnError: false });
    });

    // 3. Handle Lists (Itemize and Enumerate)
    // Map \begin{itemize} -> <ul> and \item -> <li>
    content = content
        .replace(/\\begin\{itemize\}/g, '<ul>')
        .replace(/\\end\{itemize\}/g, '</ul>')
        .replace(/\\begin\{enumerate\}/g, '<ol>')
        .replace(/\\end\{enumerate\}/g, '</ol>')
        .replace(/\\item\s+(.*)/g, '<li>$1</li>');

    // 4. Basic Structure
    let processed = content
        .replace(/\\section\{(.*?)\}/g, (match, title, offset) => {
            // We calculate a rough line number based on character offset
            const line = text.substring(0, offset).split('\n').length;
            return `<h1 id="line-${line}" class="sync-point">${title}</h1>`;
        })
        .replace(/\\subsection\{(.*?)\}/g, (match, title, offset) => {
            const line = text.substring(0, offset).split('\n').length;
            return `<h2 id="line-${line}" class="sync-point">${title}</h2>`;
        });

    // Now, add this <script> just before the closing </body> tag:
    const script = `
        <script>
            const vscode = acquireVsCodeApi();
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'scrollToLine') {
                    const line = message.line;
                    // Find the closest section header at or above the current line
                    const syncPoints = Array.from(document.querySelectorAll('.sync-point'));
                    const target = syncPoints
                        .filter(el => parseInt(el.id.replace('line-', '')) <= line)
                        .pop();

                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        </script>
    `;

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
                
                /* List Styling */
                ul, ol { margin-left: 2em; margin-bottom: 1em; }
                li { margin-bottom: 0.5em; }

                h1 { text-align: center; font-size: 1.8em; margin-top: 0; }
                h2 { font-size: 1.4em; margin-top: 1.5em; }
                p { margin-bottom: 1em; text-indent: 1.5em; line-height: 1.5; text-align: justify; }
                h1+p, h2+p, li p { text-indent: 0; }
                .math-block { margin: 1em 0; text-align: center; }
            </style>
        </head>
        <body>
            <div class="paper">
                ${processed}
            </div>
            <script>${script}</script>
        </body>
        </html>`;
}