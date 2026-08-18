/**
 * Settings View
 * Application and project settings
 */

import { BaseView } from './base-view.js';

export class SettingsView extends BaseView {
    async render(params = {}) {
        const container = document.createElement('div');
        container.className = 'w-full flex flex-col';

        // Header
        container.appendChild(this.renderHeader());

        // Settings area
        const settingsArea = document.createElement('div');
        settingsArea.className = 'flex-1 p-lg';

        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'max-w-3xl mx-auto space-y-lg';

        // Editor Settings
        settingsContainer.appendChild(this.renderEditorSettings());

        // GitHub Settings
        settingsContainer.appendChild(this.renderGitHubSettings());

        // AI Settings
        settingsContainer.appendChild(this.renderAISettings());

        settingsArea.appendChild(settingsContainer);
        container.appendChild(settingsArea);

        return container;
    }

    renderHeader() {
        const header = document.createElement('div');
        header.className = 'glass-panel border-b border-outline-variant/10 p-lg';

        header.innerHTML = `
            <div class="flex items-center gap-md">
                <span class="material-symbols-outlined text-primary text-xl">settings</span>
                <h2 class="font-headline-md text-on-surface">Settings</h2>
            </div>
        `;

        return header;
    }

    renderEditorSettings() {
        const section = document.createElement('div');
        section.className = 'glass-panel rounded-xl p-lg';

        const settings = this.app.state.get('editorSettings');

        section.innerHTML = `
            <h3 class="font-headline-md text-lg text-on-surface mb-md">Editor</h3>
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <label class="text-on-surface-variant">Font Size</label>
                    <input type="number" min="8" max="32" value="${settings.fontSize}" class="w-16 px-2 py-1 bg-surface-container border border-outline-variant/20 rounded text-on-surface text-sm" />
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-on-surface-variant">Tab Size</label>
                    <select class="px-2 py-1 bg-surface-container border border-outline-variant/20 rounded text-on-surface text-sm">
                        <option ${settings.tabSize === 2 ? 'selected' : ''}>2 spaces</option>
                        <option ${settings.tabSize === 4 ? 'selected' : ''}>4 spaces</option>
                        <option ${settings.tabSize === 8 ? 'selected' : ''}>8 spaces</option>
                    </select>
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-on-surface-variant">Word Wrap</label>
                    <input type="checkbox" ${settings.wordWrap ? 'checked' : ''} class="w-4 h-4" />
                </div>
                <div class="flex items-center justify-between">
                    <label class="text-on-surface-variant">Minimap</label>
                    <input type="checkbox" ${settings.minimap ? 'checked' : ''} class="w-4 h-4" />
                </div>
            </div>
        `;

        return section;
    }

    renderGitHubSettings() {
        const section = document.createElement('div');
        section.className = 'glass-panel rounded-xl p-lg';

        const isConnected = this.app.state.get('githubConnected');

        if (isConnected) {
            section.innerHTML = `
                <h3 class="font-headline-md text-lg text-on-surface mb-md">GitHub</h3>
                <div class="space-y-4">
                    <div class="p-3 bg-primary/10 rounded border border-primary/20">
                        <p class="text-sm text-on-surface">✓ Connected to GitHub</p>
                    </div>
                    <button class="w-full px-4 py-2 bg-error-container/20 text-error border border-error/30 rounded hover:bg-error-container/40 transition-colors">
                        Disconnect
                    </button>
                </div>
            `;
        } else {
            section.innerHTML = `
                <h3 class="font-headline-md text-lg text-on-surface mb-md">GitHub</h3>
                <div class="space-y-4">
                    <p class="text-sm text-on-surface-variant">Connect your GitHub account to import repositories and manage projects.</p>
                    <button class="w-full px-4 py-2 bg-primary text-on-primary rounded hover:bg-primary-fixed transition-colors font-semibold">
                        Connect to GitHub
                    </button>
                </div>
            `;
        }

        return section;
    }

    renderAISettings() {
        const section = document.createElement('div');
        section.className = 'glass-panel rounded-xl p-lg';

        section.innerHTML = `
            <h3 class="font-headline-md text-lg text-on-surface mb-md">AI Assistant</h3>
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <label class="text-on-surface-variant">AI Provider</label>
                    <select class="px-3 py-1 bg-surface-container border border-outline-variant/20 rounded text-on-surface text-sm">
                        <option>OpenAI</option>
                        <option>Claude</option>
                        <option>Ollama (Local)</option>
                    </select>
                </div>
                <p class="text-xs text-on-surface-variant">API key configuration requires backend setup for security.</p>
                <button class="w-full px-4 py-2 glass-elevated rounded hover:border-primary/50 text-on-surface transition-colors">
                    Configure AI Provider
                </button>
            </div>
        `;

        return section;
    }
}
