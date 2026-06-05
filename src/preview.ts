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

    // 3. Handle Text Styles
    content = content
        .replace(/\\textbf\{([^}]*)\}/g, '<strong>$1</strong>')
        .replace(/\\textit\{([^}]*)\}/g, '<em>$1</em>')
        .replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');

    // 4. Handle Lists (Itemize and Enumerate)
    // Map \begin{itemize} -> <ul> and \item -> <li>
    content = content
        .replace(/\\begin\{itemize\}/g, '<ul>')
        .replace(/\\end\{itemize\}/g, '</ul>')
        .replace(/\\begin\{enumerate\}/g, '<ol>')
        .replace(/\\end\{enumerate\}/g, '</ol>')
        .replace(/\\item\s+(.*)/g, '<li>$1</li>');

    // 5. Basic Structure
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

    // 6. Paragraphs: split on double line breaks (blank lines)
    processed = processed
        .split(/\n\s*\n/)
        .map(block => block.trim())
        .filter(block => block.length > 0)
        .map(block => {
            // Don't wrap blocks that already start with an HTML block-level tag
            if (/^<(h[1-6]|ul|ol|li|div|table|blockquote)/i.test(block)) {
                return block;
            }
            return `<p>${block.replace(/\n/g, ' ')}</p>`;
        })
        .join('\n');

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
                <button id="zoom-out">−</button>
                <span id="zoom-level">100%</span>
                <button id="zoom-in">+</button>
            </div>
            <div class="content" id="content">
                ${processed}
            </div>
            <script>
                (function() {
                    const content = document.getElementById('content');
                    const pageWidth = 8.5 * 96;  // 8.5in in px
                    const pageHeight = 11 * 96;   // 11in in px
                    const margin = 1 * 96;        // 1in in px
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

                    // Wait for fonts/KaTeX to render
                    setTimeout(() => {
                        const scrollWidth = content.scrollWidth;
                        const numPages = Math.max(1, Math.ceil(scrollWidth / contentWidth));

                        // Create page wrappers
                        const body = document.body;
                        const zoomControls = document.getElementById('zoom-controls');
                        body.innerHTML = '';
                        body.appendChild(zoomControls);

                        for (let i = 0; i < numPages; i++) {
                            const page = document.createElement('div');
                            page.className = 'page';
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

                        // Re-add message listener for scroll sync
                        window.addEventListener('message', event => {
                            const message = event.data;
                            if (message.command === 'scrollToLine') {
                                const line = message.line;
                                const syncPoints = Array.from(document.querySelectorAll('.sync-point'));
                                const target = syncPoints
                                    .filter(el => parseInt(el.id.replace('line-', '')) <= line)
                                    .pop();
                                if (target) {
                                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }
                        });
                    }, 100);
                })();
            </script>
        </body>
        </html>`;
}