import * as katex from 'katex';

export interface ProcessedBlock {
    dataLine: number;
    html: string;
}

/**
 * Strips comments and extracts document body, returning lines with offset info.
 */
function prepareText(text: string): { rawContent: string; contentStartOffset: number } {
    // Strip LaTeX comments (preserve line structure)
    text = text.replace(/(?<!\\)%.*$/gm, '');

    const bodyMatch = text.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
    const rawContent = bodyMatch ? bodyMatch[1] : text;
    const contentStartOffset = bodyMatch
        ? text.substring(0, text.indexOf('\\begin{document}') + '\\begin{document}'.length).split('\n').length - 1
        : 0;

    return { rawContent, contentStartOffset };
}

/**
 * Processes a single block of lines into HTML.
 */
function processBlock(blockLines: string[], dataLine: number): string {
    let blockText = blockLines.join('\n');

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

    // If already a block-level tag, return as-is
    if (/^<(h[1-6]|ul|ol|div|table|blockquote)/i.test(blockText.trim())) {
        return blockText;
    }

    // Otherwise, wrap in a paragraph
    return `<p data-line="${dataLine}">${blockText.replace(/\n/g, ' ')}</p>`;
}

/**
 * Returns an array of processed blocks with their source line numbers.
 * Each block's HTML is independently rendered.
 */
export function getProcessedBlocks(text: string): ProcessedBlock[] {
    const { rawContent, contentStartOffset } = prepareText(text);
    const lines = rawContent.split('\n');

    interface RawBlock {
        lines: string[];
        startLine: number;
    }

    const blocks: RawBlock[] = [];
    let currentBlock: RawBlock | null = null;

    for (let i = 0; i < lines.length; i++) {
        const sourceLine = i + 1 + contentStartOffset;
        const line = lines[i];

        if (line.trim() === '') {
            if (currentBlock) {
                blocks.push(currentBlock);
                currentBlock = null;
            }
        } else {
            if (!currentBlock) {
                currentBlock = { lines: [], startLine: sourceLine };
            }
            currentBlock.lines.push(line);
        }
    }
    if (currentBlock) {
        blocks.push(currentBlock);
    }

    return blocks
        .map(block => ({
            dataLine: block.startLine,
            html: processBlock(block.lines, block.startLine)
        }))
        .filter(b => b.html.length > 0);
}

/**
 * Returns the full webview HTML shell. Set once, never replaced.
 */
export function getWebviewHtml(): string {
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
                [data-line] { cursor: pointer; transition: background-color 0.2s; }
                [data-line]:hover { background-color: rgba(66, 135, 245, 0.08); border-radius: 3px; }
                .highlight-sync { background-color: rgba(66, 135, 245, 0.15) !important; border-radius: 3px; transition: background-color 0.3s; }
                
                /* List Styling */
                ul, ol { margin-left: 2em; margin-bottom: 1em; }
                li { margin-bottom: 0.5em; }

                h1 { text-align: center; font-size: 1.8em; margin-top: 0; break-after: avoid; }
                h2 { font-size: 1.4em; margin-top: 1.5em; break-after: avoid; }
                p { margin-bottom: 1em; text-indent: 1.5em; line-height: 1.5; text-align: justify; }
                h1+p, h2+p, li p { text-indent: 0; }
                .math-block { margin: 1em 0; text-align: center; break-inside: avoid; }

                /* Hidden measure container */
                #measure {
                    position: absolute;
                    visibility: hidden;
                    pointer-events: none;
                    width: 6.5in;
                    column-width: 6.5in;
                    column-fill: auto;
                    height: 9in;
                    column-gap: 0;
                }
            </style>
        </head>
        <body>
            <div id="zoom-controls">
                <button id="zoom-out">\u2212</button>
                <span id="zoom-level">100%</span>
                <button id="zoom-in">+</button>
            </div>
            <div id="pages-container"></div>
            <div id="measure"></div>
            <script>
                (function() {
                    const vscodeApi = acquireVsCodeApi();
                    const pagesContainer = document.getElementById('pages-container');
                    const measure = document.getElementById('measure');
                    const pageWidthPx = 8.5 * 96;
                    const pageHeightPx = 11 * 96;
                    const marginPx = 1 * 96;
                    const contentWidth = pageWidthPx - 2 * marginPx;

                    let zoom = 1.0;
                    const zoomStep = 0.1;
                    const minZoom = 0.3;
                    const maxZoom = 2.0;

                    // Block cache: array of { dataLine, html }
                    let cachedBlocks = [];

                    function applyZoom() {
                        document.querySelectorAll('.page').forEach(page => {
                            page.style.transform = 'scale(' + zoom + ')';
                            page.style.marginBottom = (-(1 - zoom) * pageHeightPx + 20) + 'px';
                        });
                        document.getElementById('zoom-level').textContent = Math.round(zoom * 100) + '%';
                    }

                    function getFullHtml() {
                        return cachedBlocks.map(b => b.html).join('\\n');
                    }

                    function rebuildPages() {
                        const scrollY = window.scrollY;
                        const fullHtml = getFullHtml();

                        measure.innerHTML = fullHtml;
                        const scrollWidth = measure.scrollWidth;
                        const numPages = Math.max(1, Math.ceil(scrollWidth / contentWidth));

                        pagesContainer.innerHTML = '';
                        for (let i = 0; i < numPages; i++) {
                            const page = document.createElement('div');
                            page.className = 'page';
                            page.setAttribute('data-page', String(i));
                            const clip = document.createElement('div');
                            clip.className = 'page-clip';
                            const inner = document.createElement('div');
                            inner.className = 'content';
                            inner.innerHTML = fullHtml;
                            inner.style.left = (-i * contentWidth) + 'px';
                            clip.appendChild(inner);
                            page.appendChild(clip);
                            pagesContainer.appendChild(page);
                        }

                        applyZoom();
                        window.scrollTo(0, scrollY);
                    }

                    function applyBlockUpdate(newBlocks) {
                        // Quick check: if block count or any dataLine changed, full rebuild
                        let needsFullRebuild = false;

                        if (newBlocks.length !== cachedBlocks.length) {
                            needsFullRebuild = true;
                        } else {
                            for (let i = 0; i < newBlocks.length; i++) {
                                if (newBlocks[i].dataLine !== cachedBlocks[i].dataLine) {
                                    needsFullRebuild = true;
                                    break;
                                }
                            }
                        }

                        // Find which blocks changed content
                        const changedIndices = [];
                        if (!needsFullRebuild) {
                            for (let i = 0; i < newBlocks.length; i++) {
                                if (newBlocks[i].html !== cachedBlocks[i].html) {
                                    changedIndices.push(i);
                                }
                            }
                        }

                        cachedBlocks = newBlocks;

                        if (needsFullRebuild || changedIndices.length > 3) {
                            // Full rebuild for structural changes or many block changes
                            rebuildPages();
                        } else if (changedIndices.length > 0) {
                            // Incremental update: patch only changed blocks in each page's content
                            const fullHtml = getFullHtml();
                            measure.innerHTML = fullHtml;

                            // Check if page count changed
                            const scrollWidth = measure.scrollWidth;
                            const numPages = Math.max(1, Math.ceil(scrollWidth / contentWidth));
                            const currentPageCount = pagesContainer.querySelectorAll('.page').length;

                            if (numPages !== currentPageCount) {
                                rebuildPages();
                            } else {
                                // Patch each page's content div
                                const scrollY = window.scrollY;
                                const pages = pagesContainer.querySelectorAll('.page');
                                pages.forEach((page, pageIdx) => {
                                    const contentDiv = page.querySelector('.content');
                                    if (contentDiv) {
                                        contentDiv.innerHTML = fullHtml;
                                        contentDiv.style.left = (-pageIdx * contentWidth) + 'px';
                                    }
                                });
                                window.scrollTo(0, scrollY);
                            }
                        }
                        // else: nothing changed, do nothing
                    }

                    function getPageIndexForLine(line) {
                        const elements = Array.from(measure.querySelectorAll('[data-line]'));
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
                        return Math.floor(target.offsetLeft / contentWidth);
                    }

                    function highlightOnPage(pageIndex, line) {
                        document.querySelectorAll('.highlight-sync').forEach(e => e.classList.remove('highlight-sync'));
                        const pages = pagesContainer.querySelectorAll('.page');
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

                    // Zoom controls
                    document.getElementById('zoom-in').addEventListener('click', () => {
                        zoom = Math.min(maxZoom, zoom + zoomStep);
                        applyZoom();
                    });
                    document.getElementById('zoom-out').addEventListener('click', () => {
                        zoom = Math.max(minZoom, zoom - zoomStep);
                        applyZoom();
                    });
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
                            vscodeApi.postMessage({ command: 'jumpToLine', line: line });
                            document.querySelectorAll('.highlight-sync').forEach(el => el.classList.remove('highlight-sync'));
                            target.classList.add('highlight-sync');
                            setTimeout(() => target.classList.remove('highlight-sync'), 1500);
                        }
                    });

                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateBlocks') {
                            applyBlockUpdate(message.blocks);
                        } else if (message.command === 'scrollToLine') {
                            const line = message.line;
                            const pageIndex = getPageIndexForLine(line);
                            const pages = pagesContainer.querySelectorAll('.page');
                            if (pageIndex < pages.length) {
                                pages[pageIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                                highlightOnPage(pageIndex, line);
                            }
                        }
                    });
                })();
            </script>
        </body>
        </html>`;
}
