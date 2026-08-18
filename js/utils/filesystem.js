/**
 * File System Utility
 * Handles file operations and manipulation
 */

export class FileSystem {
    /**
     * Parse file path into components
     */
    static parsePath(path) {
        const parts = path.split('/').filter(p => p);
        return {
            full: path,
            parts,
            name: parts[parts.length - 1],
            extension: parts[parts.length - 1]?.split('.').pop(),
            directory: '/' + parts.slice(0, -1).join('/'),
        };
    }

    /**
     * Create directory structure from file paths
     */
    static createTree(files) {
        const tree = {};

        files.forEach(file => {
            const parts = file.path.split('/').filter(p => p);
            let current = tree;

            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    current[part] = { type: 'file', file };
                } else {
                    if (!current[part]) {
                        current[part] = { type: 'folder', children: {} };
                    }
                    current = current[part].children || current[part];
                }
            });
        });

        return tree;
    }

    /**
     * Flatten tree back to file list
     */
    static flattenTree(tree) {
        const files = [];

        const traverse = (node, path = '') => {
            Object.entries(node).forEach(([name, item]) => {
                const fullPath = path ? `${path}/${name}` : name;
                if (item.type === 'file') {
                    files.push(item.file);
                } else if (item.children) {
                    traverse(item.children, fullPath);
                }
            });
        };

        traverse(tree);
        return files;
    }

    /**
     * Get MIME type from extension
     */
    static getMimeType(extension) {
        const mimes = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'text/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'svg': 'image/svg+xml',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'gif': 'image/gif',
            'md': 'text/markdown',
            'txt': 'text/plain',
        };
        return mimes[extension] || 'application/octet-stream';
    }

    /**
     * Calculate file size in human readable format
     */
    static formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}
