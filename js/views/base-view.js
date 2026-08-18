/**
 * Base View Class
 * All views extend this class
 */

export class BaseView {
    constructor(app) {
        this.app = app;
        this.container = null;
    }

    /**
     * Create element from HTML string
     */
    createElement(html) {
        const container = document.createElement('div');
        container.innerHTML = html.trim();
        return container.firstChild;
    }

    /**
     * Render view (to be overridden)
     */
    async render(params = {}) {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loader = this.createElement(`
            <div class="flex items-center justify-center min-h-screen bg-background">
                <div class="text-center">
                    <div class="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p class="text-on-surface-variant">Loading...</p>
                </div>
            </div>
        `);
        return loader;
    }

    /**
     * Show error state
     */
    showError(message, action = null) {
        const errorHtml = `
            <div class="flex flex-col items-center justify-center min-h-screen bg-background">
                <div class="text-center max-w-md glass-panel rounded-xl p-lg">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h2 class="font-headline-md text-headline-md text-on-surface mb-2">Error</h2>
                    <p class="text-on-surface-variant mb-6">${message}</p>
                    ${action ? `<button class="px-6 py-2 bg-primary text-on-primary rounded hover:bg-primary-fixed transition-colors">${action.label}</button>` : ''}
                </div>
            </div>
        `;
        return this.createElement(errorHtml);
    }

    /**
     * Show empty state
     */
    showEmpty(title, description, action = null) {
        const emptyHtml = `
            <div class="flex flex-col items-center justify-center min-h-screen bg-background">
                <div class="text-center max-w-md">
                    <div class="text-6xl mb-4">📭</div>
                    <h2 class="font-headline-md text-headline-md text-on-surface mb-2">${title}</h2>
                    <p class="text-on-surface-variant mb-6">${description}</p>
                    ${action ? `<button class="px-6 py-2 bg-primary text-on-primary rounded hover:bg-primary-fixed transition-colors">${action.label}</button>` : ''}
                </div>
            </div>
        `;
        return this.createElement(emptyHtml);
    }
}
