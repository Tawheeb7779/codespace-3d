/**
 * GitHub API Integration
 * Handles GitHub authentication and API calls
 * SECURITY NOTE: API key/token storage requires secure backend
 */

export class GitHubService {
    constructor(stateManager) {
        this.state = stateManager;
        this.apiBase = 'https://api.github.com';
        this.token = null;
    }

    /**
     * Initialize GitHub authentication
     * In production, this would use OAuth flow with backend
     */
    async initialize() {
        // Check if token exists in secure storage (not frontend)
        const hasAuth = this.state.get('githubConnected');
        if (!hasAuth) {
            console.log('[GitHub] Not authenticated. OAuth flow required.');
        }
    }

    /**
     * Start OAuth flow
     * This should redirect to backend OAuth endpoint
     */
    async startOAuthFlow() {
        const clientId = 'REPLACE_WITH_CLIENT_ID'; // From backend config
        const redirectUri = window.location.origin + '/auth/github/callback';
        const scope = 'repo,user,gist';
        const state = this.generateState();

        // Store state for verification
        sessionStorage.setItem('github_oauth_state', state);

        const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
        window.location.href = url;
    }

    /**
     * Handle OAuth callback
     * Backend should exchange code for token
     */
    async handleOAuthCallback(code, state) {
        const storedState = sessionStorage.getItem('github_oauth_state');
        
        if (state !== storedState) {
            throw new Error('Invalid OAuth state parameter');
        }

        try {
            // Call backend to exchange code for token
            const response = await fetch('/api/auth/github/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error('OAuth exchange failed');
            }

            const data = await response.json();
            this.state.set('githubConnected', true);
            this.state.set('githubUser', data.user);

            return data;
        } catch (error) {
            console.error('GitHub OAuth failed:', error);
            throw error;
        }
    }

    /**
     * Get authenticated user
     */
    async getUser() {
        if (!this.state.get('githubConnected')) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            const response = await fetch('/api/github/user', {
                headers: { 'Authorization': 'Bearer token' } // Token from secure backend
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to get GitHub user:', error);
            return null;
        }
    }

    /**
     * Search repositories
     */
    async searchRepositories(query, options = {}) {
        const params = new URLSearchParams({
            q: query,
            sort: options.sort || 'stars',
            order: options.order || 'desc',
            per_page: options.perPage || 30,
            page: options.page || 1,
        });

        try {
            const response = await fetch(`/api/github/search/repos?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to search repositories:', error);
            return { items: [] };
        }
    }

    /**
     * Get repository details
     */
    async getRepository(owner, repo) {
        try {
            const response = await fetch(`/api/github/repos/${owner}/${repo}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get repository:', error);
            return null;
        }
    }

    /**
     * Get repository contents
     */
    async getRepositoryContents(owner, repo, path = '') {
        try {
            const response = await fetch(`/api/github/repos/${owner}/${repo}/contents/${path}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get repository contents:', error);
            return [];
        }
    }

    /**
     * Import repository to project
     */
    async importRepository(projectId, owner, repo, branch = 'main') {
        try {
            console.log(`[GitHub] Importing ${owner}/${repo} into project ${projectId}`);

            // Fetch repository contents
            const contents = await this.getRepositoryContents(owner, repo);
            
            // This would be implemented with proper file downloading
            console.log('[GitHub] Import started (backend implementation required)');

            return { status: 'pending', owner, repo, branch };
        } catch (error) {
            console.error('Failed to import repository:', error);
            throw error;
        }
    }

    /**
     * Get user repositories
     */
    async getUserRepositories(options = {}) {
        try {
            const params = new URLSearchParams({
                per_page: options.perPage || 30,
                page: options.page || 1,
                sort: options.sort || 'updated',
                direction: options.direction || 'desc',
            });

            const response = await fetch(`/api/github/user/repos?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get user repositories:', error);
            return [];
        }
    }

    /**
     * Disconnect GitHub
     */
    async disconnect() {
        try {
            await fetch('/api/auth/github/disconnect', { method: 'POST' });
            this.state.set('githubConnected', false);
            this.state.set('githubUser', null);
        } catch (error) {
            console.error('Failed to disconnect GitHub:', error);
        }
    }

    /**
     * Generate random state for OAuth
     */
    generateState() {
        return Math.random().toString(36).substring(7);
    }
}
