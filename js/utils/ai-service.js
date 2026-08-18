/**
 * AI Assistant Service
 * Handles AI-powered code generation and analysis
 * SECURITY: API keys must be stored securely on backend
 */

export class AIService {
    constructor(stateManager) {
        this.state = stateManager;
        this.provider = 'openai'; // Can be openai, claude, ollama
        this.context = {
            projectId: null,
            files: [],
            selectedFile: null,
            selectedCode: null,
        };
    }

    /**
     * Initialize AI service
     */
    async initialize() {
        const provider = this.state.get('aiSettings.provider') || 'openai';
        this.provider = provider;
        console.log(`[AI] Initialized with provider: ${provider}`);
    }

    /**
     * Set project context for AI
     */
    setContext(projectId, files, selectedFile = null) {
        this.context = {
            projectId,
            files: files.slice(0, 10), // Limit to 10 files for context
            selectedFile,
            selectedCode: selectedFile?.content,
        };
    }

    /**
     * Generate code based on description
     */
    async generateCode(description, language = 'javascript') {
        try {
            console.log('[AI] Generating code...');

            const prompt = `Generate ${language} code for: ${description}\n\nContext: ${this.getContextString()}`;

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    provider: this.provider,
                    temperature: 0.7,
                    maxTokens: 1000,
                })
            });

            if (!response.ok) {
                throw new Error('Code generation failed');
            }

            const data = await response.json();
            return data.code;
        } catch (error) {
            console.error('Failed to generate code:', error);
            return null;
        }
    }

    /**
     * Explain selected code
     */
    async explainCode(code) {
        try {
            console.log('[AI] Analyzing code...');

            const response = await fetch('/api/ai/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    provider: this.provider,
                })
            });

            if (!response.ok) {
                throw new Error('Code explanation failed');
            }

            const data = await response.json();
            return data.explanation;
        } catch (error) {
            console.error('Failed to explain code:', error);
            return 'Unable to analyze code';
        }
    }

    /**
     * Refactor code
     */
    async refactorCode(code, improvements = []) {
        try {
            console.log('[AI] Refactoring code...');

            const prompt = `Refactor this code with focus on: ${improvements.join(', ')}\n\n${code}`;

            const response = await fetch('/api/ai/refactor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    code,
                    improvements,
                    provider: this.provider,
                })
            });

            if (!response.ok) {
                throw new Error('Refactoring failed');
            }

            const data = await response.json();
            return data.refactored;
        } catch (error) {
            console.error('Failed to refactor code:', error);
            return null;
        }
    }

    /**
     * Fix errors in code
     */
    async fixErrors(code, error) {
        try {
            console.log('[AI] Fixing errors...');

            const prompt = `Fix the following error in this code:\nError: ${error}\n\nCode:\n${code}`;

            const response = await fetch('/api/ai/fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    code,
                    error,
                    provider: this.provider,
                })
            });

            if (!response.ok) {
                throw new Error('Error fixing failed');
            }

            const data = await response.json();
            return data.fixed;
        } catch (error) {
            console.error('Failed to fix errors:', error);
            return null;
        }
    }

    /**
     * Get code review
     */
    async reviewCode(code, focusAreas = ['performance', 'security', 'readability']) {
        try {
            console.log('[AI] Reviewing code...');

            const prompt = `Review this code focusing on: ${focusAreas.join(', ')}\n\n${code}`;

            const response = await fetch('/api/ai/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    code,
                    focusAreas,
                    provider: this.provider,
                })
            });

            if (!response.ok) {
                throw new Error('Code review failed');
            }

            const data = await response.json();
            return data.review;
        } catch (error) {
            console.error('Failed to review code:', error);
            return null;
        }
    }

    /**
     * Get context string for prompts
     */
    getContextString() {
        const fileNames = this.context.files.map(f => f.name).join(', ');
        return `Project files: ${fileNames || 'none'}`;
    }

    /**
     * Set AI provider
     */
    setProvider(provider) {
        if (['openai', 'claude', 'ollama'].includes(provider)) {
            this.provider = provider;
            this.state.set('aiSettings.provider', provider);
        }
    }
}
