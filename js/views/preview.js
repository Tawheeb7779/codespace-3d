/**
 * Preview View
 * Application preview and build output
 */

import { BaseView } from './base-view.js';

export class PreviewView extends BaseView {
    async render(params = {}) {
        const project = this.app.projectManager.currentProject;

        if (!project) {
            return this.showError('No project selected');
        }

        const container = document.createElement('div');
        container.className = 'w-full flex flex-col';

        // Header
        container.appendChild(this.renderHeader(project));

        // Preview area
        const previewArea = document.createElement('div');
        previewArea.className = 'flex-1 p-lg';

        const previewFrame = document.createElement('div');
        previewFrame.className = 'w-full h-full glass-panel rounded-xl overflow-hidden flex flex-col';

        const toolbar = document.createElement('div');
        toolbar.className = 'p-md border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low';
        toolbar.innerHTML = `
            <div class="flex items-center gap-md">
                <button class="px-3 py-1 glass-elevated rounded hover:border-primary/50 text-sm text-on-surface-variant hover:text-on-surface">
                    <span class="material-symbols-outlined text-sm">refresh</span>
                </button>
                <select class="px-2 py-1 bg-surface-container border border-outline-variant/20 rounded text-sm text-on-surface">
                    <option>Desktop (1200px)</option>
                    <option>Tablet (768px)</option>
                    <option>Mobile (375px)</option>
                </select>
            </div>
            <input type="text" placeholder="Preview URL..." class="px-3 py-1 bg-surface-container border border-outline-variant/20 rounded text-sm text-on-surface placeholder-on-surface-variant" />
        `;
        previewFrame.appendChild(toolbar);

        const iframeContainer = document.createElement('div');
        iframeContainer.className = 'flex-1 bg-surface';

        const iframe = document.createElement('iframe');
        iframe.className = 'w-full h-full border-none';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-popups';
        iframe.srcdoc = this.getPreviewHTML(project);

        iframeContainer.appendChild(iframe);
        previewFrame.appendChild(iframeContainer);
        previewArea.appendChild(previewFrame);

        container.appendChild(previewArea);
        return container;
    }

    renderHeader(project) {
        const header = document.createElement('div');
        header.className = 'glass-panel border-b border-outline-variant/10 p-lg';

        header.innerHTML = `
            <div class="flex items-center gap-md">
                <span class="material-symbols-outlined text-primary text-xl">preview</span>
                <div>
                    <h2 class="font-headline-md text-on-surface">${project.name} - Preview</h2>
                    <p class="text-xs text-on-surface-variant font-code-sm">Live application preview</p>
                </div>
            </div>
        `;

        return header;
    }

    getPreviewHTML(project) {
        // Get HTML file from project
        const htmlFile = project.files?.find(f => f.language === 'html');
        if (htmlFile) {
            return htmlFile.content;
        }

        // Default preview
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0e131d; color: #dee2f1; padding: 40px; }
                    h1 { font-size: 2.5em; margin-bottom: 20px; color: #adc6ff; }
                    p { font-size: 1.1em; line-height: 1.6; opacity: 0.8; }
                </style>
            </head>
            <body>
                <h1>🚀 ${project.name}</h1>
                <p>Add HTML files to your project to see them rendered here.</p>
            </body>
            </html>
        `;
    }
}
