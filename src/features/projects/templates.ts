import type { ProjectTemplate } from '@/types/project'

const viteReactPkg = {
  name: 'react-app',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
  },
  dependencies: {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
  },
  devDependencies: {
    '@vitejs/plugin-react': '^4.3.1',
    vite: '^5.4.0',
  },
}

const viteVanillaPkg = {
  name: 'vanilla-app',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
  },
  devDependencies: {
    vite: '^5.4.0',
  },
}

const nodePkg = {
  name: 'node-app',
  private: true,
  version: '0.0.0',
  type: 'module',
  scripts: {
    start: 'node index.js',
  },
  dependencies: {},
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'An empty project — bring your own files.',
    language: 'text',
    icon: 'file',
    runnable: false,
    files: [{ path: 'README.md', content: '# New Project\n' }],
  },
  {
    id: 'html-css-js',
    name: 'HTML / CSS / JS',
    description: 'A plain static site — no build step, served directly.',
    language: 'html',
    icon: 'globe',
    runnable: true,
    files: [
      {
        path: 'index.html',
        content: `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My Site</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, world!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
      },
      { path: 'style.css', content: 'body {\n  font-family: sans-serif;\n  margin: 2rem;\n}\n' },
      { path: 'script.js', content: "console.log('Hello from script.js');\n" },
    ],
  },
  {
    id: 'react-vite',
    name: 'React + Vite',
    description: 'React 18 with the Vite dev server and HMR.',
    language: 'typescript',
    icon: 'react',
    runnable: true,
    files: [
      { path: 'package.json', content: JSON.stringify(viteReactPkg, null, 2) + '\n' },
      {
        path: 'index.html',
        content:
          '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n',
      },
      {
        path: 'vite.config.js',
        content: "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({ plugins: [react()] })\n",
      },
      {
        path: 'src/main.jsx',
        content:
          "import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App.jsx'\n\ncreateRoot(document.getElementById('root')).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n)\n",
      },
      {
        path: 'src/App.jsx',
        content:
          "import { useState } from 'react'\n\nexport default function App() {\n  const [count, setCount] = useState(0)\n  return (\n    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>\n      <h1>React + Vite</h1>\n      <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>\n    </div>\n  )\n}\n",
      },
    ],
  },
  {
    id: 'vite-vanilla-ts',
    name: 'Vite + TypeScript',
    description: 'A minimal TypeScript project running on Vite.',
    language: 'typescript',
    icon: 'code',
    runnable: true,
    files: [
      { path: 'package.json', content: JSON.stringify(viteVanillaPkg, null, 2) + '\n' },
      {
        path: 'index.html',
        content: '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>TS App</title>\n</head>\n<body>\n  <div id="app"></div>\n  <script type="module" src="/src/main.ts"></script>\n</body>\n</html>\n',
      },
      {
        path: 'src/main.ts',
        content: "const app = document.querySelector<HTMLDivElement>('#app')!\napp.innerHTML = '<h1>Hello, TypeScript!</h1>'\n",
      },
      { path: 'tsconfig.json', content: JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'ESNext', strict: true } }, null, 2) + '\n' },
    ],
  },
  {
    id: 'node',
    name: 'Node.js',
    description: 'A plain Node.js script/server project.',
    language: 'javascript',
    icon: 'server',
    runnable: true,
    files: [
      { path: 'package.json', content: JSON.stringify(nodePkg, null, 2) + '\n' },
      { path: 'index.js', content: "console.log('Hello from Node.js!')\n" },
    ],
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Python source editing. Execution requires a configured backend — see Runtime settings.',
    language: 'python',
    icon: 'python',
    runnable: false,
    files: [{ path: 'main.py', content: "print('Hello, world!')\n" }],
  },
]

export function getTemplate(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id)
}
