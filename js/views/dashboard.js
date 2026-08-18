/**
 * Dashboard View
 * Main entry point for creating and managing projects
 */

import { BaseView } from './base-view.js';

export class DashboardView extends BaseView {
    async render(params = {}) {
        const projects = this.app.state.get('projects') || [];

        const container = document.createElement('div');
        container.className = 'w-full';

        if (projects.length === 0) {
            container.appendChild(this.renderEmptyState());
        } else {
            container.appendChild(this.renderProjectsList(projects));
        }

        return container;
    }

    /**
     * Render empty state with create project prompt
     */
    renderEmptyState() {
        const container = document.createElement('div');
        container.className = 'max-w-container-max mx-auto space-y-lg';

        const headerHtml = `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-md mb-xl">
                <div>
                    <h1 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface flex items-center gap-sm">
                        <span class="material-symbols-outlined text-primary text-3xl">folder_open</span>
                        Welcome to CodeSpace 3D
                    </h1>
                    <p class="text-on-surface-variant mt-1">Create a new project or import from GitHub to get started with your development environment.</p>
                </div>
                <div class="flex items-center gap-md">
                    <button id="new-project-btn" class="glass-elevated glow-active px-4 py-2 rounded flex items-center gap-2 text-primary font-body-md text-sm transition-all">
                        <span class="material-symbols-outlined text-sm">add</span>
                        New Project
                    </button>
                    <button id="import-project-btn" class="bg-primary text-on-primary px-4 py-2 rounded flex items-center gap-2 font-body-md text-sm font-semibold hover:bg-primary-fixed transition-colors">
                        <span class="material-symbols-outlined text-sm">cloud_download</span>
                        Import
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = headerHtml;

        // Add event listeners
        const newProjectBtn = container.querySelector('#new-project-btn');
        const importProjectBtn = container.querySelector('#import-project-btn');

        newProjectBtn?.addEventListener('click', () => this.showNewProjectDialog());
        importProjectBtn?.addEventListener('click', () => this.showImportDialog());

        // Add template cards
        const templatesHtml = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-lg mt-xl">
                <div class="glass-panel rounded-xl p-lg cursor-pointer hover:border-primary/50 transition-all group">
                    <span class="material-symbols-outlined text-4xl text-primary mb-4 block">web</span>
                    <h3 class="font-headline-md text-lg text-on-surface mb-2">Web Project</h3>
                    <p class="text-on-surface-variant text-sm">HTML, CSS, JavaScript starter template</p>
                </div>
                <div class="glass-panel rounded-xl p-lg cursor-pointer hover:border-primary/50 transition-all group">
                    <span class="material-symbols-outlined text-4xl text-primary mb-4 block">react</span>
                    <h3 class="font-headline-md text-lg text-on-surface mb-2">React App</h3>
                    <p class="text-on-surface-variant text-sm">React with TypeScript and Vite</p>
                </div>
                <div class="glass-panel rounded-xl p-lg cursor-pointer hover:border-primary/50 transition-all group">
                    <span class="material-symbols-outlined text-4xl text-primary mb-4 block">code</span>
                    <h3 class="font-headline-md text-lg text-on-surface mb-2">Empty Project</h3>
                    <p class="text-on-surface-variant text-sm">Start from scratch with no template</p>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', templatesHtml);

        return container;
    }

    /**
     * Render projects list
     */
    renderProjectsList(projects) {
        const container = document.createElement('div');
        container.className = 'max-w-container-max mx-auto space-y-lg';

        const headerHtml = `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-md mb-xl">
                <div>
                    <h1 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface flex items-center gap-sm">
                        <span class="material-symbols-outlined text-primary text-3xl">folder_open</span>
                        My Projects
                    </h1>
                    <p class="text-on-surface-variant mt-1">Open an existing project or create a new one.</p>
                </div>
                <button id="new-project-btn" class="bg-primary text-on-primary px-4 py-2 rounded flex items-center gap-2 font-body-md text-sm font-semibold hover:bg-primary-fixed transition-colors">
                    <span class="material-symbols-outlined text-sm">add</span>
                    New Project
                </button>
            </div>
        `;

        container.innerHTML = headerHtml;

        // Add projects grid
        const gridHtml = `
            <div id="projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            </div>
        `;

        container.insertAdjacentHTML('beforeend', gridHtml);

        const grid = container.querySelector('#projects-grid');
        projects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            grid.appendChild(projectCard);
        });

        // Add event listener for new project button
        const newProjectBtn = container.querySelector('#new-project-btn');
        newProjectBtn?.addEventListener('click', () => this.showNewProjectDialog());

        return container;
    }

    /**
     * Create project card
     */
    createProjectCard(project) {
        const card = document.createElement('div');
        card.className = 'glass-panel rounded-xl p-lg cursor-pointer hover:border-primary/50 transition-all group';

        const fileCount = project.files?.length || 0;
        const sizeKb = Math.round((project.files?.reduce((sum, f) => sum + (f.content?.length || 0), 0) || 0) / 1024);

        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary">folder</span>
                    </div>
                    <div>
                        <h3 class="font-headline-md text-lg text-on-surface">${project.name}</h3>
                        <p class="text-xs text-on-surface-variant font-code-sm">${new Date(project.created).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
            <p class="text-on-surface-variant text-sm mb-4 line-clamp-2">${project.description || 'No description'}</p>
            <div class="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                <div class="text-xs text-on-surface-variant font-code-sm">
                    <span>${fileCount} files</span> • <span>${sizeKb} KB</span>
                </div>
                <div class="flex gap-2">
                    <button class="open-project p-2 rounded hover:bg-white/5 transition-colors text-on-surface-variant hover:text-primary" data-project-id="${project.id}" title="Open">
                        <span class="material-symbols-outlined">play_arrow</span>
                    </button>
                    <button class="delete-project p-2 rounded hover:bg-white/5 transition-colors text-on-surface-variant hover:text-error" data-project-id="${project.id}" title="Delete">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        card.querySelector('.open-project')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openProject(project.id);
        });

        card.querySelector('.delete-project')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteProject(project.id);
        });

        // Click card to open project
        card.addEventListener('click', () => this.openProject(project.id));

        return card;
    }

    /**
     * Open project
     */
    async openProject(projectId) {
        try {
            await this.app.projectManager.openProject(projectId);
            this.app.router.navigate('editor');
        } catch (error) {
            console.error('Failed to open project:', error);
            this.app.ui.showNotification('Failed to open project', 'error');
        }
    }

    /**
     * Delete project
     */
    async deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project?')) {
            try {
                await this.app.projectManager.deleteProject(projectId);
                this.app.router.navigate('dashboard');
            } catch (error) {
                console.error('Failed to delete project:', error);
                this.app.ui.showNotification('Failed to delete project', 'error');
            }
        }
    }

    /**
     * Show new project dialog
     */
    showNewProjectDialog() {
        const projectName = prompt('Project name:');
        if (projectName) {
            this.createNewProject(projectName);
        }
    }

    /**
     * Show import dialog
     */
    showImportDialog() {
        this.app.ui.showNotification('GitHub import coming soon', 'info');
    }

    /**
     * Create new project
     */
    async createNewProject(name) {
        try {
            const project = await this.app.projectManager.createProject(name, '', 'empty');
            this.app.state.set('projects', this.app.projectManager.projects);
            await this.app.projectManager.openProject(project.id);
            this.app.router.navigate('editor');
        } catch (error) {
            console.error('Failed to create project:', error);
            this.app.ui.showNotification('Failed to create project', 'error');
        }
    }
}
