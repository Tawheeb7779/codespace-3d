export interface JsonSchema {
  type: string
  properties?: Record<string, JsonSchema & { description?: string }>
  required?: string[]
  items?: JsonSchema
  description?: string
}

export interface AgentToolDefinition {
  name: string
  description: string
  parameters: JsonSchema
}

const str = (description: string): JsonSchema & { description: string } => ({ type: 'string', description })

/**
 * The AI agent's tool surface (spec §24). Every tool is a thin, bounded
 * wrapper over real project operations — no tool fabricates a result.
 */
export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: 'list_files',
    description: 'List every file and directory path in the project.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'read_file',
    description: 'Read the full contents of one file.',
    parameters: { type: 'object', properties: { path: str('Project-relative file path') }, required: ['path'] },
  },
  {
    name: 'search_project',
    description: 'Search file contents across the project for a substring or regular expression.',
    parameters: {
      type: 'object',
      properties: {
        query: str('Text or regex pattern to search for'),
        regex: { type: 'boolean', description: 'Treat query as a regular expression' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_file',
    description: 'Create a new file with the given content. Fails if the file already exists.',
    parameters: {
      type: 'object',
      properties: { path: str('Project-relative file path'), content: str('Full file content') },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Replace the full contents of an existing file. Fails if the file does not exist.',
    parameters: {
      type: 'object',
      properties: { path: str('Project-relative file path'), content: str('New full file content') },
      required: ['path', 'content'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file or directory (recursively) from the project.',
    parameters: { type: 'object', properties: { path: str('Project-relative path') }, required: ['path'] },
  },
  {
    name: 'rename_file',
    description: 'Rename or move a file or directory.',
    parameters: {
      type: 'object',
      properties: { from: str('Current path'), to: str('New path') },
      required: ['from', 'to'],
    },
  },
  {
    name: 'read_package_json',
    description: 'Read and return the parsed package.json for the project, if one exists.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'install_dependencies',
    description: 'Install project dependencies using the detected package manager.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'run_project',
    description: "Start the project's detected dev server / run command.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'stop_project',
    description: 'Stop the currently running project process.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'run_script',
    description: 'Run a specific package.json script to completion and return its output.',
    parameters: { type: 'object', properties: { script: str('Script name from package.json') }, required: ['script'] },
  },
  {
    name: 'run_build',
    description: "Run the project's build script (if one exists) to completion and return its output.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'read_runtime_errors',
    description: 'Read recent runtime/install/dev-server output, highlighting lines that look like errors.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'read_terminal_output',
    description: 'Read the recent output of the interactive terminal.',
    parameters: { type: 'object', properties: {} },
  },
]
