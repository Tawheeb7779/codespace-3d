/**
 * Editor View
 * Main code editor with file explorer and tabs
 */

import { BaseView } from './base-view.js';

export class EditorView extends BaseView {
    async render(params = {}) {
        const project = this.app.projectManager.currentProject;

        if (!project) {
            return this.showError('No project selected', { label: 'Go to Dashboard' });
        }

        const container = document.createElement('div');
        container.className = 'flex flex-col h-full';

        // Header
        container.appendChild(this.renderHeader(project));

        // Main editor area
        const editorArea = document.createElement('div');
        editorArea.className = 'flex flex-1 gap-lg overflow-hidden';

        // File explorer sidebar
        const explorer = this.renderFileExplorer(project);
        editorArea.appendChild(explorer);

        // Editor and preview
        const editorContainer = document.createElement('div');
        editorContainer.className = 'flex-1 flex flex-col';

        // Tabs
        const openFiles = this.app.state.get('openFiles') || [];
        if (openFiles.length > 0) {
            editorContainer.appendChild(this.renderTabs(project, openFiles));
            editorContainer.appendChild(this.renderEditor(project, openFiles));
        } else {
            const emptyEditor = document.createElement('div');
            emptyEditor.className = 'flex-1 flex flex-col items-center justify-center bg-surface';
            emptyEditor.innerHTML = `
                <span class="material-symbols-outlined text-6xl text-outline mb-4">description</span>
                <p class="text-on-surface-variant">No file open. Select a file from the explorer to begin.</p>
            `;
            editorContainer.appendChild(emptyEditor);
        }

        editorArea.appendChild(editorContainer);
        container.appendChild(editorArea);

        // Terminal
        const previewVisible = this.app.state.get('previewVisible');
        if (previewVisible) {
            container.appendChild(this.renderPreview(project));
        }

        return container;
    }

    renderHeader(project) {
        const header = document.createElement('div');
        header.className = 'glass-panel border-b border-outline-variant/10 p-lg flex items-center justify-between';

        header.innerHTML = `
            <div class="flex items-center gap-md">
                <span class="material-symbols-outlined text-primary">code</span>
                <div>
                    <h2 class="font-headline-md text-on-surface">${project.name}</h2>
                    <p class="text-xs text-on-surface-variant font-code-sm">Master • ${project.files?.length || 0} files</p>
                </div>
            </div>
            <div class="flex gap-sm">
                <button class="px-3 py-1 glass-elevated rounded hover:border-primary/50 transition-colors text-sm text-on-surface-variant hover:text-on-surface">
                    <span class="material-symbols-outlined text-sm">run_circle</span>
                </button>
                <button class="px-3 py-1 glass-elevated rounded hover:border-primary/50 transition-colors text-sm text-on-surface-variant hover:text-on-surface">
                    <span class="material-symbols-outlined text-sm">settings</span>
                </button>
            </div>
        `;

        return header;
    }

    renderFileExplorer(project) {
        const explorer = document.createElement('div');
        explorer.className = 'w-64 bg-surface-container-low border-r border-outline-variant/10 flex flex-col';

        const header = document.createElement('div');
        header.className = 'p-md border-b border-outline-variant/10 flex items-center justify-between';
        header.innerHTML = `
            <h3 class="font-label-caps text-label-caps text-on-surface">Files</h3>
            <div class="flex gap-1">
                <button class="p-1 hover:bg-white/5 rounded transition-colors" title="Add file">
                    <span class="material-symbols-outlined text-sm">add</span>
                </button>
                <button class="p-1 hover:bg-white/5 rounded transition-colors" title="Refresh">
                    <span class="material-symbols-outlined text-sm">refresh</span>
                </button>
            </div>
        `;
        explorer.appendChild(header);

        const fileList = document.createElement('div');
        fileList.className = 'flex-1 overflow-y-auto p-md space-y-1';

        if (!project.files || project.files.length === 0) {
            fileList.innerHTML = `
                <div class="text-xs text-on-surface-variant text-center py-8">
                    <p>No files yet</p>
                </div>
            `;
        } else {
            project.files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'p-2 rounded hover:bg-white/5 cursor-pointer transition-colors group flex items-center gap-2 text-on-surface-variant hover:text-on-surface';
                fileItem.innerHTML = `
                    <span class="material-symbols-outlined text-sm">${this.getFileIcon(file.language)}</span>
                    <span class="text-sm truncate font-code-sm">${file.name}</span>
                `;
                fileItem.addEventListener('click', () => this.openFile(project.id, file.id));
                fileList.appendChild(fileItem);
            });
        }

        explorer.appendChild(fileList);
        return explorer;
    }

    renderTabs(project, openFiles) {
        const tabs = document.createElement('div');
        tabs.className = 'bg-surface-container-low border-b border-outline-variant/10 flex items-center gap-sm px-lg overflow-x-auto hide-scrollbar';

        const activeFile = this.app.state.get('activeFile');

        openFiles.forEach(fileId => {
            const file = project.files.find(f => f.id === fileId);
            if (!file) return;

            const tab = document.createElement('button');
            const isActive = fileId === activeFile;
            tab.className = `px-3 py-2 text-sm font-code-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`;

            tab.innerHTML = `
                <span class="material-symbols-outlined text-sm">${this.getFileIcon(file.language)}</span>
                <span>${file.name}</span>
            `;

            tab.addEventListener('click', () => this.openFile(project.id, fileId));
            tabs.appendChild(tab);
        });

        return tabs;
    }

    renderEditor(project, openFiles) {
        const editor = document.createElement('div');
        editor.className = 'flex-1 flex flex-col bg-surface overflow-hidden';

        const activeFile = this.app.state.get('activeFile');
        const file = project.files.find(f => f.id === activeFile);

        if (!file) {
            editor.innerHTML = `
                <div class="flex-1 flex items-center justify-center">
                    <p class="text-on-surface-variant">Select a file to edit</p>
                </div>
            `;
            return editor;
        }

        const editorContent = document.createElement('div');
        editorContent.className = 'flex-1 flex gap-lg overflow-hidden p-lg';

        // Code editor (simplified)
        const codeEditor = document.createElement('div');
        codeEditor.className = 'flex-1 glass-panel rounded-lg p-md overflow-hidden flex flex-col';

        const lineNumbers = document.createElement('div');
        lineNumbers.className = 'text-outline text-xs font-code-sm p-2 bg-surface-container-low rounded mr-2 text-right leading-6 min-w-max';
        const lines = (file.content || '').split('\n').length;
        lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');

        const codeArea = document.createElement('div');
        codeArea.className = 'flex-1 flex overflow-hidden';

        const codeTextarea = document.createElement('textarea');
        codeTextarea.className = 'flex-1 bg-surface text-on-surface font-code-sm resize-none focus:outline-none p-2';
        codeTextarea.value = file.content || '';
        codeTextarea.spellcheck = false;

        codeTextarea.addEventListener('input', () => {
            this.updateFileContent(project.id, file.id, codeTextarea.value);
            lineNumbers.textContent = Array.from({ length: codeTextarea.value.split('\n').length }, (_, i) => i + 1).join('\n');
        });

        codeArea.appendChild(lineNumbers);
        codeArea.appendChild(codeTextarea);
        codeEditor.appendChild(codeArea);
        editorContent.appendChild(codeEditor);

        editor.appendChild(editorContent);
        return editor;
    }

    renderPreview(project) {
        const preview = document.createElement('div');
        preview.className = 'h-64 bg-surface-container-low border-t border-outline-variant/10 p-lg';

        preview.innerHTML = `
            <div class="h-full glass-panel rounded-lg p-md">
                <div class="flex items-center justify-between mb-md">
                    <h3 class="font-label-caps text-label-caps text-on-surface">Preview</h3>
                    <div class="flex gap-2">
                        <button class="p-1 hover:bg-white/5 rounded transition-colors" title="Refresh">
                            <span class="material-symbols-outlined text-sm">refresh</span>
                        </button>
                        <button class="p-1 hover:bg-white/5 rounded transition-colors" title="Expand">
                            <span class="material-symbols-outlined text-sm">open_in_full</span>
                        </button>
                    </div>
                </div>
                <div class="flex-1 bg-surface rounded overflow-hidden">
                    <iframe class="w-full h-full border-none" sandbox="allow-scripts allow-same-origin"></iframe>
                </div>
            </div>
        `;

        return preview;
    }

    openFile(projectId, fileId) {
        const openFiles = this.app.state.get('openFiles') || [];
        if (!openFiles.includes(fileId)) {
            openFiles.push(fileId);
            this.app.state.set('openFiles', openFiles);
        }
        this.app.state.set('activeFile', fileId);
    }

    async updateFileContent(projectId, fileId, content) {
        try {
            await this.app.projectManager.updateFile(projectId, fileId, content);
        } catch (error) {
            console.error('Failed to update file:', error);
        }
    }

    getFileIcon(language) {
        const icons = {
            javascript: 'description',
            typescript: 'description',
            python: 'description',
            html: 'html',
            css: 'style',
            json: 'data_object',
            markdown: 'description',
            default: 'insert_drive_file',
        };
        return icons[language] || icons.default;
    }
}
