/**
 * Terminal View
 * Development terminal and build output
 */

import { BaseView } from './base-view.js';

export class TerminalView extends BaseView {
    constructor(app) {
        super(app);
        this.logs = [];
    }

    async render(params = {}) {
        const project = this.app.projectManager.currentProject;

        if (!project) {
            return this.showError('No project selected');
        }

        const container = document.createElement('div');
        container.className = 'w-full flex flex-col';

        // Header
        container.appendChild(this.renderHeader(project));

        // Terminal area
        const terminalArea = document.createElement('div');
        terminalArea.className = 'flex-1 p-lg';

        const terminal = document.createElement('div');
        terminal.className = 'w-full h-full glass-panel rounded-xl overflow-hidden flex flex-col bg-[#0a0d14]';

        // Terminal toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'p-md border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-low';
        toolbar.innerHTML = `
            <div class="flex items-center gap-md">
                <span class="font-label-caps text-label-caps text-on-surface">Terminal</span>
                <span class="text-xs text-on-surface-variant">PowerShell</span>
            </div>
            <div class="flex gap-2">
                <button class="p-1 hover:bg-white/5 rounded transition-colors" title="Clear">
                    <span class="material-symbols-outlined text-sm">delete_sweep</span>
                </button>
                <button class="p-1 hover:bg-white/5 rounded transition-colors" title="Close">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        `;
        terminal.appendChild(toolbar);

        // Terminal output
        const output = document.createElement('div');
        output.className = 'flex-1 overflow-y-auto p-md font-code-sm text-sm space-y-1 text-on-surface-variant';
        output.id = 'terminal-output';

        this.addTerminalLog(output, 'Terminal ready', 'info');
        this.addTerminalLog(output, 'Type commands below to get started', 'info');

        terminal.appendChild(output);

        // Terminal input
        const inputArea = document.createElement('div');
        inputArea.className = 'p-md border-t border-outline-variant/10 bg-surface-container-low flex items-center gap-2';

        const prompt = document.createElement('span');
        prompt.className = 'text-primary font-code-sm';
        prompt.textContent = '$ ';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'flex-1 bg-transparent text-on-surface font-code-sm focus:outline-none';
        input.placeholder = 'Type a command...';

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(input.value, output);
                input.value = '';
            }
        });

        inputArea.appendChild(prompt);
        inputArea.appendChild(input);
        terminal.appendChild(inputArea);

        terminalArea.appendChild(terminal);
        container.appendChild(terminalArea);

        return container;
    }

    renderHeader(project) {
        const header = document.createElement('div');
        header.className = 'glass-panel border-b border-outline-variant/10 p-lg';

        header.innerHTML = `
            <div class="flex items-center gap-md">
                <span class="material-symbols-outlined text-primary text-xl">terminal</span>
                <div>
                    <h2 class="font-headline-md text-on-surface">Terminal</h2>
                    <p class="text-xs text-on-surface-variant font-code-sm">${project.name} • Development Terminal</p>
                </div>
            </div>
        `;

        return header;
    }

    addTerminalLog(output, message, type = 'info') {
        const line = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString();

        const colorClass = {
            info: 'text-secondary',
            warn: 'text-tertiary',
            error: 'text-error',
            success: 'text-primary',
        }[type] || 'text-on-surface-variant';

        line.innerHTML = `
            <span class="text-outline">[${timestamp}]</span>
            <span class="${colorClass}">${message}</span>
        `;

        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    executeCommand(command, output) {
        const trimmed = command.trim();

        // Show command
        const cmdLine = document.createElement('div');
        cmdLine.className = 'text-on-surface';
        cmdLine.innerHTML = `<span class="text-primary">$ </span>${trimmed}`;
        output.appendChild(cmdLine);

        // Note: Real command execution requires backend
        this.addTerminalLog(output, `Command not executed (backend integration required): ${trimmed}`, 'warn');
    }
}
