/**
 * CodeSpace 3D - Main Application Entry Point
 * Handles routing, state management, and application initialization
 */

import { Router } from './core/router.js';
import { StateManager } from './core/state.js';
import { ProjectManager } from './features/project-manager.js';
import { UIController } from './core/ui-controller.js';
import { FileSystem } from './utils/filesystem.js';
import { GitService } from './utils/git-service.js';
import { GitHubService } from './utils/github-service.js';
import { AIService } from './utils/ai-service.js';
import { BuildService } from './utils/build-service.js';

// Application state
const app = {
    // Core systems
    router: null,
    state: null,
    projectManager: null,
    ui: null,
    
    // Services
    fileSystem: FileSystem,
    git: null,
    github: null,
    ai: null,
    build: null,

    initialized: false,

    async initialize() {
        try {
            console.log('🚀 Initializing CodeSpace 3D...');

            // Initialize core systems
            this.state = new StateManager();
            this.projectManager = new ProjectManager(this.state);
            this.ui = new UIController();
            this.router = new Router(this);

            // Initialize services
            this.git = new GitService(this.state);
            this.github = new GitHubService(this.state);
            this.ai = new AIService(this.state);
            this.build = new BuildService(this.state);

            // Load persisted state
            await this.state.initialize();

            // Load projects
            await this.projectManager.loadProjects();

            // Initialize services
            await this.github.initialize();
            await this.ai.initialize();

            // Initialize UI
            await this.ui.initialize();

            // Set up event listeners
            this.setupEventListeners();

            // Handle OAuth callback if present
            if (window.location.search.includes('code=')) {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const state = params.get('state');
                await this.github.handleOAuthCallback(code, state);
                window.location.href = '/';
            }

            // Navigate to default view
            if (this.state.get('currentProject')) {
                this.router.navigate('editor');
            } else {
                this.router.navigate('dashboard');
            }

            this.initialized = true;
            console.log('✅ CodeSpace 3D initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize CodeSpace 3D:', error);
            this.router?.navigate('error', { error: error.message });
        }
    },

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + Shift + P: Command Palette
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {\n                e.preventDefault();
                this.ui.openCommandPalette?.();
            }

            // Cmd/Ctrl + K: Toggle sidebar
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.ui.toggleSidebar?.();
            }

            // Cmd/Ctrl + B: Toggle file explorer
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                this.ui.toggleFileExplorer?.();
            }

            // Cmd/Ctrl + S: Save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                console.log('[Shortcut] Save triggered');
            }

            // Cmd/Ctrl + ': Toggle terminal
            if ((e.metaKey || e.ctrlKey) && e.key === "'") {
                e.preventDefault();
                this.ui.toggleTerminal?.();
            }
        });

        // Handle project changes
        this.state.subscribe('currentProject', (projectId) => {
            console.log('[App] Current project changed:', projectId);
            this.ui.updateProjectContext?.();
        });

        // Handle file changes
        this.state.subscribe('activeFile', (fileId) => {
            console.log('[App] Active file changed:', fileId);
            this.ui.updateEditorContext?.();
        });

        // Handle view changes
        this.state.subscribe('currentView', (view) => {
            console.log('[App] Current view changed:', view);
        });

        // Detect online/offline
        window.addEventListener('online', () => {
            console.log('[App] Online');
            this.ui.showNotification?.('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            console.log('[App] Offline');
            this.ui.showNotification?.('Working offline', 'warn');
        });

        // Prevent unsaved changes
        window.addEventListener('beforeunload', (e) => {
            const openFiles = this.state.get('openFiles') || [];
            if (openFiles.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    },

    /**
     * Create a sample project for demonstration
     */
    async createSampleProject() {
        try {
            console.log('[App] Creating sample project...');

            const project = await this.projectManager.createProject(
                'Sample Project',
                'A sample project to demonstrate CodeSpace 3D',
                'empty'
            );

            // Add sample files
            await this.projectManager.addFile(project.id, 'index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample Project</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0e131d 0%, #1b202a 100%);
            color: #dee2f1;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 40px;
        }
        h1 { font-size: 2.5em; margin-bottom: 20px; color: #adc6ff; }
        p { font-size: 1.1em; opacity: 0.8; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Welcome to CodeSpace 3D</h1>
        <p>Edit this file to get started with your project.</p>
    </div>
</body>
</html>`);

            await this.projectManager.addFile(project.id, 'style.css', `/* Sample CSS */
:root {
    --primary: #adc6ff;
    --surface: #0e131d;
    --on-surface: #dee2f1;
}

body {
    background-color: var(--surface);
    color: var(--on-surface);
    font-family: 'Inter', sans-serif;
}`);

            await this.projectManager.addFile(project.id, 'script.js', `// Sample JavaScript
console.log('CodeSpace 3D is ready!');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
});`);

            await this.projectManager.addFile(project.id, 'README.md', `# Sample Project

This is a sample project created to demonstrate CodeSpace 3D.

## Features
- Code editing
- Live preview
- 3D workspace visualization
- Git integration
- AI-assisted development

## Getting Started
1. Open files in the editor
2. Write your code
3. See the preview in real-time
4. Use AI to help with development
5. Commit and push to GitHub
`);

            this.state.set('projects', this.projectManager.projects);
            console.log('✅ Sample project created');

            return project;
        } catch (error) {
            console.error('Failed to create sample project:', error);
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Export for debugging and external use
window.CodeSpace3D = app;
