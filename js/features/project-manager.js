/**
 * Project Manager
 * Handles project creation, loading, and management
 */

export class ProjectManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.projects = [];
        this.currentProject = null;
    }

    /**
     * Load projects from storage
     */
    async loadProjects() {
        try {
            const projects = this.state.get('projects') || [];
            this.projects = projects;
            
            // Load current project if exists
            const currentProjectId = this.state.get('currentProject');
            if (currentProjectId) {
                this.currentProject = this.projects.find(p => p.id === currentProjectId);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            this.projects = [];
        }
    }

    /**
     * Create new project
     */
    async createProject(name, description = '', template = 'empty') {
        const project = {
            id: this.generateId(),
            name,
            description,
            template,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            path: '/',
            files: [],
            settings: {
                buildCommand: '',
                startCommand: '',
                previewUrl: '',
            },
            git: {
                remote: null,
                branch: 'main',
                status: 'clean',
            }
        };

        this.projects.push(project);
        this.state.set('projects', this.projects);
        
        return project;
    }

    /**
     * Open project
     */
    async openProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        this.currentProject = project;
        this.state.set('currentProject', projectId);

        return project;
    }

    /**
     * Delete project
     */
    async deleteProject(projectId) {
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.state.set('projects', this.projects);

        if (this.currentProject?.id === projectId) {
            this.currentProject = null;
            this.state.set('currentProject', null);
        }
    }

    /**
     * Update project settings
     */
    async updateProject(projectId, updates) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        Object.assign(project, updates, { updated: new Date().toISOString() });
        this.state.set('projects', this.projects);

        if (this.currentProject?.id === projectId) {
            this.currentProject = project;
        }
    }

    /**
     * Get project file tree
     */
    getFileTree(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return null;

        return project.files;
    }

    /**
     * Add file to project
     */
    async addFile(projectId, path, content = '') {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const file = {
            id: this.generateId(),
            path,
            name: this.getFileName(path),
            content,
            language: this.detectLanguage(path),
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
        };

        project.files.push(file);
        this.state.set('projects', this.projects);

        return file;
    }

    /**
     * Update file content
     */
    async updateFile(projectId, fileId, content) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const file = project.files.find(f => f.id === fileId);
        if (!file) {
            throw new Error(`File not found: ${fileId}`);
        }

        file.content = content;
        file.modified = new Date().toISOString();
        this.state.set('projects', this.projects);

        return file;
    }

    /**
     * Delete file from project
     */
    async deleteFile(projectId, fileId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        project.files = project.files.filter(f => f.id !== fileId);
        this.state.set('projects', this.projects);
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Detect file language from extension
     */
    detectLanguage(path) {
        const ext = path.split('.').pop().toLowerCase();
        const languages = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'py': 'python',
            'rb': 'ruby',
            'java': 'java',
            'cs': 'csharp',
            'php': 'php',
            'go': 'go',
            'rs': 'rust',
            'c': 'c',
            'cpp': 'cpp',
            'h': 'c',
            'html': 'html',
            'xml': 'xml',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'toml': 'toml',
            'sh': 'bash',
            'bash': 'bash',
            'md': 'markdown',
            'sql': 'sql',
        };
        return languages[ext] || 'text';
    }

    /**
     * Get file name from path
     */
    getFileName(path) {
        return path.split('/').pop();
    }

    /**
     * Search files
     */
    searchFiles(projectId, query) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return [];

        const lowerQuery = query.toLowerCase();
        return project.files.filter(f =>
            f.name.toLowerCase().includes(lowerQuery) ||
            f.path.toLowerCase().includes(lowerQuery) ||
            f.content.toLowerCase().includes(lowerQuery)
        );
    }
}
