"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtmlContent = getHtmlContent;
const katex = require("katex");
function getHtmlContent(text) {
    // 1. Extract content between \begin{document} and \end{document}
    const bodyMatch = text.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
    const rawContent = bodyMatch ? bodyMatch[1] : text;
    // Calculate the line offset if we extracted from \begin{document}
    const contentStartOffset = bodyMatch
        ? text.substring(0, text.indexOf('\\begin{document}') + '\\begin{document}'.length).split('\n').length - 1
        : 0;
    // 2. Split into lines and annotate each line with its source line number
    const lines = rawContent.split('\n');
    const blocks = [];
    let currentBlock = null;
    for (let i = 0; i < lines.length; i++) {
        const sourceLine = i + 1 + contentStartOffset; // 1-indexed
        const line = lines[i];
        if (line.trim() === '') {
            // Blank line ends current block
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }
        }
        else {
            if (!currentBlock) {
                currentBlock = { lines: [], startLine: sourceLine };
            }
            currentBlock.lines.push(line);
        }
    }
    if (currentBlock) {
        blocks.push(currentBlock);
    }
    // 4. Process each block into HTML
    const processedBlocks = blocks.map(block => {
        let blockText = block.lines.join('\n');
        const dataLine = block.startLine;
        // Handle display math
        blockText = blockText.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g, (_match, p1, p2) => {
            return `<div class="math-block" data-line="${dataLine}">${katex.renderToString(p1 || p2, { displayMode: true, throwOnError: false })}</div>`;
        });
        // Handle inline math
        blockText = blockText.replace(/\$([\s\S]*?)\$|\\\(([\s\S]*?)\\\)/g, (_match, p1, p2) => {
            return katex.renderToString(p1 || p2, { displayMode: false, throwOnError: false });
        });
        // Handle text styles
        blockText = blockText
            .replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>')
            .replace(/\\textit\{([^}]*)\}/g, '<em>$1</em>')
            .replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');
        // Handle lists
        blockText = blockText
            .replace(/\\begin\{itemize\}/g, '<ul>')
            .replace(/\\end\{itemize\}/g, '</ul>')
            .replace(/\\begin\{enumerate\}/g, '<ol>')
            .replace(/\\end\{enumerate\}/g, '</ol>')
            .replace(/\\item\s+(.*)/g, `<li data-line="${dataLine}">$1</li>`);
        // Handle sections
        blockText = blockText.replace(/\\section\{(.*?)\}/g, (_match, title) => {
            return `<h1 data-line="${dataLine}">${title}</h1>`;
        });
        blockText = blockText.replace(/\\subsection\{(.*?)\}/g, (_match, title) => {
            return `<h2 data-line="${dataLine}">${title}</h2>`;
        });
        // Skip preamble commands
        if (/^\\(documentclass|usepackage|title|author|date|maketitle|begin|end)/.test(blockText.trim())) {
            return '';
        }
        // If the block is already wrapped in a block-level tag, return as-is
        if (/^<(h[1-6]|ul|ol|div|table|blockquote)/i.test(blockText.trim())) {
            return blockText;
        }
        // Otherwise, wrap in a paragraph
        return `<p data-line="${dataLine}">${blockText.replace(/\n/g, ' ')}</p>`;
    });
    const processed = processedBlocks.filter(b => b.length > 0).join('\n');
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dgadelha/latin-modern-webfont@master/style.css">
            <style>
                body {
                    background-color: #525659;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 20px;
                    gap: 20px;
                    font-family: "Latin Modern Roman", serif;
                }
                .page {
                    background: white;
                    width: 8.5in;
                    height: 11in;
                    padding: 1in;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    color: black;
                    box-sizing: border-box;
                    overflow: hidden;
                    flex-shrink: 0;
                    position: relative;
                    transform-origin: top center;
                }
                .page-clip {
                    width: 6.5in;
                    height: 9in;
                    overflow: hidden;
                    position: relative;
                }
                .content {
                    column-width: 6.5in;
                    column-fill: auto;
                    height: 9in;
                    column-gap: 0;
                    position: absolute;
                    top: 0;
                    left: 0;
                }
                #zoom-controls {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(30,30,30,0.85);
                    padding: 6px 10px;
                    border-radius: 6px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                #zoom-controls button {
                    background: #3c3c3c;
                    color: white;
                    border: 1px solid #555;
                    border-radius: 4px;
                    width: 28px;
                    height: 28px;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                #zoom-controls button:hover { background: #505050; }
                #zoom-level {
                    color: white;
                    font-family: sans-serif;
                    font-size: 12px;
                    min-width: 40px;
                    text-align: center;
                }
                [data-line] { cursor: pointer; }
                [data-line]:hover { outline: 2px solid rgba(66, 135, 245, 0.4); outline-offset: 2px; border-radius: 2px; }
                .highlight-sync { outline: 2px solid rgba(66, 135, 245, 0.8) !important; outline-offset: 2px; border-radius: 2px; transition: outline-color 0.3s; }
                
                /* List Styling */
                ul, ol { margin-left: 2em; margin-bottom: 1em; }
                li { margin-bottom: 0.5em; }

                h1 { text-align: center; font-size: 1.8em; margin-top: 0; break-after: avoid; }
                h2 { font-size: 1.4em; margin-top: 1.5em; break-after: avoid; }
                p { margin-bottom: 1em; text-indent: 1.5em; line-height: 1.5; text-align: justify; }
                h1+p, h2+p, li p { text-indent: 0; }
                .math-block { margin: 1em 0; text-align: center; break-inside: avoid; }
            </style>
        </head>
        <body>
            <div id="zoom-controls">
                <button id="zoom-out">\u2212</button>
                <span id="zoom-level">100%</span>
                <button id="zoom-in">+</button>
            </div>
            <div class="content" id="content">
                ${processed}
            </div>
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    const content = document.getElementById('content');
                    const pageWidth = 8.5 * 96;
                    const pageHeight = 11 * 96;
                    const margin = 1 * 96;
                    const contentHeight = pageHeight - 2 * margin;
                    const contentWidth = pageWidth - 2 * margin;

                    let zoom = 1.0;
                    const zoomStep = 0.1;
                    const minZoom = 0.3;
                    const maxZoom = 2.0;

                    function applyZoom() {
                        document.querySelectorAll('.page').forEach(page => {
                            page.style.transform = 'scale(' + zoom + ')';
                            page.style.marginBottom = (-(1 - zoom) * pageHeight + 20) + 'px';
                        });
                        document.getElementById('zoom-level').textContent = Math.round(zoom * 100) + '%';
                    }

                    // Given a data-line value, find which page index it falls on
                    // by checking the element's offsetLeft in the original content column layout
                    function getPageIndexForLine(line) {
                        // Use the first page's content (page index 0) to measure positions
                        const firstPage = document.querySelector('.page');
                        if (!firstPage) return 0;
                        const firstContent = firstPage.querySelector('.content');
                        if (!firstContent) return 0;

                        const elements = Array.from(firstContent.querySelectorAll('[data-line]'));
                        let target = null;
                        let closestDist = Infinity;
                        for (const el of elements) {
                            const elLine = parseInt(el.getAttribute('data-line'));
                            if (elLine <= line) {
                                const dist = line - elLine;
                                if (dist < closestDist) {
                                    closestDist = dist;
                                    target = el;
                                }
                            }
                        }
                        if (!target) return 0;

                        // The element's offsetLeft relative to the content div tells us which column it's in
                        const elLeft = target.offsetLeft;
                        return Math.floor(elLeft / contentWidth);
                    }

                    function highlightOnPage(pageIndex, line) {
                        // Clear all highlights
                        document.querySelectorAll('.highlight-sync').forEach(e => e.classList.remove('highlight-sync'));

                        const pages = document.querySelectorAll('.page');
                        if (pageIndex >= pages.length) return;

                        const pageContent = pages[pageIndex].querySelector('.content');
                        if (!pageContent) return;

                        const elements = Array.from(pageContent.querySelectorAll('[data-line]'));
                        let target = null;
                        let closestDist = Infinity;
                        for (const el of elements) {
                            const elLine = parseInt(el.getAttribute('data-line'));
                            if (elLine <= line) {
                                const dist = line - elLine;
                                if (dist < closestDist) {
                                    closestDist = dist;
                                    target = el;
                                }
                            }
                        }
                        if (target) {
                            target.classList.add('highlight-sync');
                            setTimeout(() => target.classList.remove('highlight-sync'), 1500);
                        }
                    }

                    // Wait for fonts/KaTeX to render
                    setTimeout(() => {
                        const scrollWidth = content.scrollWidth;
                        const numPages = Math.max(1, Math.ceil(scrollWidth / contentWidth));

                        const body = document.body;
                        const zoomControls = document.getElementById('zoom-controls');
                        body.innerHTML = '';
                        body.appendChild(zoomControls);

                        for (let i = 0; i < numPages; i++) {
                            const page = document.createElement('div');
                            page.className = 'page';
                            page.setAttribute('data-page', i);
                            const clip = document.createElement('div');
                            clip.className = 'page-clip';
                            const inner = document.createElement('div');
                            inner.className = 'content';
                            inner.innerHTML = content.innerHTML;
                            inner.style.left = (-i * contentWidth) + 'px';
                            clip.appendChild(inner);
                            page.appendChild(clip);
                            body.appendChild(page);
                        }

                        applyZoom();

                        // Zoom controls
                        document.getElementById('zoom-in').addEventListener('click', () => {
                            zoom = Math.min(maxZoom, zoom + zoomStep);
                            applyZoom();
                        });
                        document.getElementById('zoom-out').addEventListener('click', () => {
                            zoom = Math.max(minZoom, zoom - zoomStep);
                            applyZoom();
                        });

                        // Ctrl+Scroll to zoom
                        window.addEventListener('wheel', (e) => {
                            if (e.ctrlKey) {
                                e.preventDefault();
                                if (e.deltaY < 0) {
                                    zoom = Math.min(maxZoom, zoom + zoomStep);
                                } else {
                                    zoom = Math.max(minZoom, zoom - zoomStep);
                                }
                                applyZoom();
                            }
                        }, { passive: false });

                        // Click in preview -> jump to source line
                        document.addEventListener('click', (e) => {
                            const target = e.target.closest('[data-line]');
                            if (target) {
                                const line = parseInt(target.getAttribute('data-line'));
                                vscode.postMessage({ command: 'jumpToLine', line: line });
                                // Highlight only on the page that was clicked
                                const page = target.closest('.page');
                                if (page) {
                                    document.querySelectorAll('.highlight-sync').forEach(el => el.classList.remove('highlight-sync'));
                                    target.classList.add('highlight-sync');
                                    setTimeout(() => target.classList.remove('highlight-sync'), 1500);
                                }
                            }
                        });

                        // Editor cursor -> scroll preview to the correct page
                        window.addEventListener('message', event => {
                            const message = event.data;
                            if (message.command === 'scrollToLine') {
                                const line = message.line;
                                const pageIndex = getPageIndexForLine(line);
                                const pages = document.querySelectorAll('.page');
                                if (pageIndex < pages.length) {
                                    pages[pageIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    highlightOnPage(pageIndex, line);
                                }
                            }
                        });
                    }, 100);
                })();
            </script>
        </body>
        </html>`;
}
//# sourceMappingURL=preview.js.map