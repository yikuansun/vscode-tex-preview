"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtmlContent = getHtmlContent;
function getHtmlContent(text) {
    // 1. Extract content between \begin{document} and \end{document}
    const bodyRegex = /\\begin\{document\}([\s\S]*)\\end\{document\}/;
    const match = text.match(bodyRegex);
    let content = match ? match[1] : "Add \\begin{document} to start previewing!";
    // 2. Simple transformations (The "Rough" part)
    let processed = content
        .replace(/\\section\{(.*?)\}/g, '<h1>$1</h1>')
        .replace(/\\subsection\{(.*?)\}/g, '<h2>$1</h2>')
        .replace(/\\textbf\{(.*?)\}/g, '<b>$1</b>')
        .replace(/\\textit\{(.*?)\}/g, '<i>$1</i>')
        .replace(/\n\s*\n/g, '</p><p>'); // Double newline to paragraph
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dgadelha/latin-modern-webfont@master/style.css">
            <style>
                body { background-color: #525659; display: flex; justify-content: center; padding: 20px; font-family: "Latin Modern Roman", serif; }
                .paper { background: white; width: 100%; max-width: 800px; padding: 60px; box-shadow: 0 0 10px rgba(0,0,0,0.5); color: black; min-height: 100vh; text-align: justify; }
                h1 { text-align: center; font-size: 1.8em; }
                h2 { font-size: 1.4em; border-bottom: 1px solid #eee; }
                p { margin-bottom: 1em; text-indent: 1.5em; }
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
//# sourceMappingURL=preview.js.map