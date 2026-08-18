/**
 * UI Controller
 * Manages UI state and interactions across the application
 */

export class UIController {
    constructor() {
        this.sidebarOpen = true;
        this.commandPaletteOpen = false;
        this.notifications = [];
    }

    async initialize() {
        this.setupMainNavigation();
        this.setupSidebar();
        this.setupHeaderActions();
    }

    /**
     * Setup main navigation
     */
    setupMainNavigation() {
        const mainNav = document.getElementById('main-nav');
        if (!mainNav) return;

        mainNav.innerHTML = `
            <a href="#/editor" data-route="editor" class="text-on-surface-variant hover:text-on-surface transition-colors font-body-md text-body-md hover:bg-white/5 px-2 py-1 rounded">
                Editor
            </a>
            <a href="#/preview" data-route="preview" class="text-on-surface-variant hover:text-on-surface transition-colors font-body-md text-body-md hover:bg-white/5 px-2 py-1 rounded">
                Preview
            </a>
            <a href="#/terminal" data-route="terminal" class="text-on-surface-variant hover:text-on-surface transition-colors font-body-md text-body-md hover:bg-white/5 px-2 py-1 rounded">
                Terminal
            </a>
            <a href="#/3d" data-route="3d" class="text-on-surface-variant hover:text-on-surface transition-colors font-body-md text-body-md hover:bg-white/5 px-2 py-1 rounded">
                3D
            </a>
        `;
    }

    /**
     * Setup sidebar navigation
     */
    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <div class="mb-lg px-2 text-center w-full hidden md:block">
                <div class="w-10 h-10 mx-auto rounded-lg bg-surface-container-high border border-outline-variant/20 flex items-center justify-center mb-2">
                    <span class="material-symbols-outlined text-primary">folder</span>
                </div>
                <div class="truncate w-full font-label-caps text-label-caps text-on-surface" id="project-name">No Project</div>
                <div class="truncate w-full text-[10px] text-outline mt-1 font-code-sm" id="project-version">—</div>
            </div>
            <nav class="flex-1 flex flex-col gap-sm w-full">
                <a href="#/editor" data-route="editor" class="flex flex-col items-center justify-center p-2 mx-2 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high scale-95 active:scale-90 transition-transform group cursor-pointer">
                    <span class="material-symbols-outlined mb-1 group-hover:text-primary transition-colors">folder_open</span>
                    <span class="font-label-caps text-[10px] hidden md:block">Explorer</span>
                </a>
                <a href="#/editor" data-route="editor" class="flex flex-col items-center justify-center p-2 mx-2 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high scale-95 active:scale-90 transition-transform group cursor-pointer">
                    <span class="material-symbols-outlined mb-1 group-hover:text-primary transition-colors">search</span>
                    <span class="font-label-caps text-[10px] hidden md:block">Search</span>
                </a>
                <a href="#/editor" data-route="editor" class="flex flex-col items-center justify-center p-2 mx-2 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high scale-95 active:scale-90 transition-transform group cursor-pointer">
                    <span class="material-symbols-outlined mb-1 group-hover:text-primary transition-colors">account_tree</span>
                    <span class="font-label-caps text-[10px] hidden md:block text-center leading-tight">SCM</span>
                </a>
                <a href="#/3d" data-route="3d" class="flex flex-col items-center justify-center p-2 mx-2 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high scale-95 active:scale-90 transition-transform group cursor-pointer">
                    <span class="material-symbols-outlined mb-1 group-hover:text-primary transition-colors">view_in_ar</span>
                    <span class="font-label-caps text-[10px] hidden md:block">3D</span>
                </a>
                <a href="#/editor" data-route="editor" class="flex flex-col items-center justify-center p-2 mx-2 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high scale-95 active:scale-90 transition-transform group cursor-pointer">
                    <span class="material-symbols-outlined mb-1 group-hover:text-primary transition-colors">bug_report</span>
                    <span class="font-label-caps text-[10px] hidden md:block">Debug</span>
                </a>
            </nav>
            <div class="mt-auto flex flex-col gap-sm w-full">
                <a href="#/settings" data-route="settings" class="flex flex-col items-center justify-center p-2 mx-2 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high scale-95 active:scale-90 transition-transform group cursor-pointer">
                    <span class="material-symbols-outlined mb-1 group-hover:text-primary transition-colors">account_circle</span>
                    <span class="font-label-caps text-[10px] hidden md:block">Profile</span>
                </a>
                <a href="#/settings" data-route="settings" class="flex flex-col items-center justify-center p-2 mx-2 rounded-lg text-outline hover:text-on-surface-variant hover:bg-surface-container-high scale-95 active:scale-90 transition-transform group cursor-pointer">
                    <span class="material-symbols-outlined mb-1 group-hover:text-primary transition-colors">settings</span>
                    <span class="font-label-caps text-[10px] hidden md:block">Settings</span>
                </a>
            </div>
        `;
    }

    /**
     * Setup header actions
     */
    setupHeaderActions() {
        const headerActions = document.getElementById('header-actions');
        if (!headerActions) return;

        headerActions.innerHTML = `
            <button class="p-2 rounded hover:bg-white/5 transition-colors text-on-surface-variant hover:text-on-surface" title="Command Palette (Cmd+Shift+P)">
                <span class="material-symbols-outlined">palette</span>
            </button>
            <button class="p-2 rounded hover:bg-white/5 transition-colors text-on-surface-variant hover:text-on-surface" title="Settings">
                <span class="material-symbols-outlined">settings</span>
            </button>
            <button class="p-2 rounded hover:bg-white/5 transition-colors text-on-surface-variant hover:text-on-surface" title="Sync Status">
                <span class="material-symbols-outlined">cloud_done</span>
            </button>
            <button class="p-2 rounded hover:bg-white/5 transition-colors text-on-surface-variant hover:text-on-surface" title="Notifications">
                <span class="material-symbols-outlined">notifications</span>
            </button>
            <div class="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 ml-2 cursor-pointer hover:border-primary/50 transition-colors">
                <div class="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-on-primary">
                    U
                </div>
            </div>
        `;

        // Setup event listeners
        const buttons = headerActions.querySelectorAll('button');
        buttons[0].addEventListener('click', () => this.openCommandPalette());
        buttons[1].addEventListener('click', () => this.openSettings());
        buttons[2].addEventListener('click', () => this.syncProject());
        buttons[3].addEventListener('click', () => this.showNotifications());
    }

    /**
     * Open command palette
     */
    openCommandPalette() {
        console.log('Opening command palette...');
        // This will be implemented in a future phase
    }

    /**
     * Open settings
     */
    openSettings() {
        window.location.hash = '#/settings';
    }

    /**
     * Sync project
     */
    syncProject() {
        this.showNotification('Syncing...', 'info');
        // This will be implemented with backend
    }

    /**
     * Show notifications
     */
    showNotifications() {
        console.log('Showing notifications...');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        this.notifications.push({ message, type, id: Date.now() });
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Update project context
     */
    updateProjectContext() {
        // This will be called when project changes
        console.log('Project context updated');
    }

    /**
     * Update editor context
     */
    updateEditorContext() {
        // This will be called when active file changes
        console.log('Editor context updated');
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        console.log('Sidebar toggled:', this.sidebarOpen);
    }

    /**
     * Toggle file explorer
     */
    toggleFileExplorer() {
        console.log('File explorer toggled');
    }
}
