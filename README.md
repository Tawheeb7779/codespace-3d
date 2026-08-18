# CodeSpace 3D - Production Web IDE

A professional, browser-based development environment featuring code editing, project management, file exploration, live preview, and 3D workspace visualization.

## 🚀 Features

### Core IDE Functionality
- **Code Editor** - Professional syntax highlighting, line numbers, and file management
- **File Explorer** - Hierarchical file browsing with create, delete, and rename capabilities
- **Multi-tab Support** - Work with multiple files simultaneously
- **Live Preview** - Real-time application preview with responsive device modes
- **Terminal** - Development terminal with command output (UI/backend integration required)
- **3D Workspace** - Three.js-based visualization of project structure

### Project Management
- **Project Dashboard** - Create, open, and manage multiple projects
- **Project Templates** - Quick start with pre-configured project templates
- **File Operations** - Full file system manipulation within projects
- **Project Settings** - Configure build commands, preview URLs, and environment variables

### Developer Tools
- **Git Integration** - Branch management, staging, committing (requires backend/CLI)
- **GitHub Integration** - Import repositories, manage remote, OAuth authentication (requires backend)
- **Build System** - Custom build command execution and output monitoring
- **Search & Replace** - Find files and code snippets across project

### AI-Assisted Development
- **Code Generation** - Generate code from descriptions
- **Code Explanation** - Understand complex code with AI analysis
- **Code Refactoring** - Improve code quality with AI suggestions
- **Error Fixing** - Get AI-powered solutions for errors
- **Code Review** - Automated code review with best practice suggestions

### UI/UX
- **Dark-First Theme** - Professional glassmorphic interface
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **Keyboard Shortcuts** - Full keyboard navigation support
- **Accessibility** - WCAG compliance with screen reader support
- **Smooth Animations** - High-performance transitions and interactions

## 📁 Project Structure

```
codespace-3d/
├── index.html                 # Main application entry point
├── js/
│   ├── app.js                # Application initialization and orchestration
│   ├── core/
│   │   ├── router.js         # Client-side routing and view management
│   │   ├── state.js          # Centralized state management with persistence
│   │   └── ui-controller.js  # UI interactions and global state
│   ├── views/
│   │   ├── base-view.js      # Base class for all views
│   │   ├── dashboard.js      # Project management dashboard
│   │   ├── editor.js         # Code editor with file explorer
│   │   ├── preview.js        # Application preview and build output
│   │   ├── terminal.js       # Development terminal
│   │   ├── 3d-workspace.js   # 3D project visualization
│   │   └── settings.js       # Application and project settings
│   ├── features/
│   │   └── project-manager.js # Project lifecycle management
│   └── utils/
│       ├── filesystem.js     # File system utilities
│       ├── git-service.js    # Git operations (requires backend)
│       ├── github-service.js # GitHub API integration (requires backend)
│       ├── ai-service.js     # AI-assisted development (requires backend)
│       └── build-service.js  # Build system integration
├── DESIGN.md                 # Design system documentation
├── README.md                 # This file
└── code.html                 # Legacy storage & database manager (retained)
```

## 🏗️ Architecture

### State Management
- **Centralized Store** - Single source of truth for application state
- **Subscriptions** - Reactive updates when state changes
- **Persistence** - Automatic saving to IndexedDB and session storage
- **Type-Safe Access** - Dot-notation path-based state access

### Routing
- **Client-Side Router** - SPA navigation without page reloads
- **History Management** - Browser back/forward support
- **View Switching** - Smooth transitions between different views
- **Parameter Passing** - Route-specific data and context

### Services Architecture
- **Modular Design** - Loosely coupled, independently testable services
- **Dependency Injection** - Services receive state manager as dependency
- **Error Handling** - Comprehensive error handling and logging
- **Promise-Based APIs** - Consistent async/await patterns

## 🔐 Security Notes

### API Keys & Tokens
- ❌ **Never stored in frontend** - API keys must be stored on backend
- ✅ **Secure backend proxy** - Frontend makes requests to backend
- ✅ **OAuth flow** - Use OAuth 2.0 for GitHub authentication
- ✅ **Environment variables** - Backend uses environment variables for secrets

### Data Protection
- IndexedDB used for local project storage only
- No user data sent to external services without consent
- HTTPS required in production
- Content Security Policy headers recommended

## 🚀 Getting Started

### Installation
1. Clone the repository
2. Open `index.html` in a modern browser
3. No build step required - pure client-side application

### Creating a Project
1. Open the dashboard
2. Click "New Project"
3. Enter project name
4. Select template (empty, web, react)
5. Project created and ready for editing

### Writing Code
1. Select project from dashboard
2. Click files in explorer to open
3. Edit code in the editor
4. Save automatically on input
5. See preview in real-time (for HTML/CSS)

### Using AI Assistance
1. Go to Settings
2. Configure AI provider (requires backend)
3. In editor, use AI tools:
   - Generate code from description
   - Explain selected code
   - Refactor for improvements
   - Fix errors
   - Review code quality

## 🔌 Backend Integration Requirements

The following features require backend API integration:

### Git Operations
- Endpoint: `/api/git/*`
- Requires: Git CLI access or Git library
- Operations: commit, push, pull, branch management

### GitHub Integration
- Endpoint: `/api/github/*` 
- Requires: GitHub OAuth app credentials
- Operations: authentication, repository search, import

### AI Services
- Endpoint: `/api/ai/*`
- Requires: AI provider API key (OpenAI, Claude, etc.)
- Operations: code generation, analysis, refactoring

### Build System
- Endpoint: `/api/build/*`
- Requires: Build tool access (npm, python, cargo, etc.)
- Operations: build execution, log streaming

### Terminal
- Endpoint: `/api/terminal/*`
- Requires: Secure terminal emulation
- Operations: command execution, output streaming

## 🎨 Design System

### Colors
- **Primary**: #adc6ff (Light Blue)
- **Surface**: #0e131d (Deep Blue-Black)
- **On-Surface**: #dee2f1 (Off-White)
- **Error**: #ffb4ab (Light Red)

### Typography
- **Display**: Inter 48px Bold
- **Headline**: Inter 32px Semibold
- **Body**: Inter 16px Regular
- **Code**: JetBrains Mono 14px Regular

### Spacing
- **Base Unit**: 4px
- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 40px

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + P` | Command Palette |
| `Cmd/Ctrl + K` | Toggle Sidebar |
| `Cmd/Ctrl + B` | Toggle File Explorer |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + '` | Toggle Terminal |

## 🧪 Testing

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Local Storage
- Projects stored in IndexedDB
- Session state in sessionStorage
- Automatic persistence on state changes

## 📊 Performance Targets

- Initial load: < 2 seconds
- Editor interactions: < 50ms
- File switching: < 100ms
- Preview refresh: < 500ms
- 3D rendering: 60 FPS

## 🐛 Debugging

### Development Console
- `window.CodeSpace3D` - Access app instance
- `window.CodeSpace3D.state.get()` - View all state
- `window.CodeSpace3D.projectManager.projects` - List projects
- `window.CodeSpace3D.router.navigate(view)` - Navigate between views

### Logging
- All major operations logged to console
- Prefixed with `[Component]` for filtering
- Different log levels: info, warn, error

## 📝 Development Notes

### Code Quality
- Modular, single-responsibility components
- Clear naming conventions
- Comprehensive error handling
- Accessibility-first approach

### Browser APIs Used
- IndexedDB for persistent storage
- sessionStorage for temporary state
- ES Modules for code organization
- WebGL for 3D rendering (Three.js)
- Web APIs: Fetch, Promise, async/await

## 🔄 State Flow

```
User Action
    ↓
Event Listener
    ↓
UI Controller / Service
    ↓
State Update (stateManager.set)
    ↓
Persist to Storage
    ↓
Notify Subscribers
    ↓
View Re-render
    ↓
Display Update
```

## 🎯 Roadmap

### Phase 1: Foundation ✅
- Core IDE interface
- Project management
- Code editor
- File explorer

### Phase 2: Enhancement 🔄
- Live preview improvements
- Terminal integration
- 3D workspace refinement
- Build system integration

### Phase 3: Integration 📋
- GitHub OAuth flow
- Git operations
- AI services
- Real-time collaboration

### Phase 4: Polish ⏳
- Performance optimization
- Accessibility audit
- Mobile responsiveness
- Animation refinements

## 📄 License

CodeSpace 3D is built as a production-ready development environment.

## 🤝 Contributing

When contributing:
1. Follow existing code style
2. Add error handling
3. Update documentation
4. Test in multiple browsers
5. Consider accessibility

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify IndexedDB is enabled
3. Test with sample project
4. Review component documentation

---

**CodeSpace 3D** - Professional web development made accessible. Built for developers, by developers.
