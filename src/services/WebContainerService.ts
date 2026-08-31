import { WebContainer } from '@webcontainer/api'
import type { WebContainerProcess } from '@webcontainer/api'

export type RuntimeLogListener = (chunk: string) => void
export type ServerReadyListener = (port: number, url: string) => void

/**
 * Thin singleton wrapper around @webcontainer/api. WebContainer only
 * supports one booted instance per page/tab, so this module owns that
 * lifecycle and every feature (terminal, run, preview) shares it.
 *
 * Requires the page to be cross-origin isolated (COOP/COEP headers — see
 * vite.config.ts) and, for non-localhost production domains, StackBlitz's
 * WebContainer API may require the deploying origin to be registered with
 * them. This is a real external-configuration caveat, documented in the
 * README rather than hidden.
 */
class WebContainerServiceImpl {
  private bootPromise: Promise<WebContainer> | null = null
  private currentProcess: WebContainerProcess | null = null

  get isSupported(): boolean {
    return typeof SharedArrayBuffer !== 'undefined' && window.crossOriginIsolated === true
  }

  private async getInstance(): Promise<WebContainer> {
    if (!this.isSupported) {
      throw new Error(
        'This browser context is not cross-origin isolated, so the in-browser runtime (WebContainer) cannot boot. Serve the app with COOP/COEP headers.',
      )
    }
    if (!this.bootPromise) {
      // WebContainer.boot() loads a hosted runtime from stackblitz.com. On a
      // network that can't reach it, the promise can hang indefinitely
      // instead of rejecting — wrap it in a timeout so callers (terminal,
      // run, preview) get a real error instead of an endless spinner.
      this.bootPromise = Promise.race([
        WebContainer.boot(),
        new Promise<WebContainer>((_, reject) =>
          setTimeout(
            () => reject(new Error('Timed out starting the in-browser runtime. It requires network access to stackblitz.com — check your connection or network policy.')),
            20000,
          ),
        ),
      ])
      this.bootPromise.catch(() => {
        this.bootPromise = null // allow retrying (e.g. Run again) instead of caching a dead promise
      })
    }
    return this.bootPromise
  }

  async mount(tree: Record<string, unknown>): Promise<void> {
    const instance = await this.getInstance()
    // @webcontainer/api types its tree as FileSystemTree; we build it
    // structurally in FileSystemService.toFileSystemTree() to avoid a
    // second full copy of the file model.
    await instance.mount(tree as Parameters<WebContainer['mount']>[0])
  }

  async writeFile(path: string, content: string): Promise<void> {
    const instance = await this.getInstance()
    await instance.fs.writeFile(path, content)
  }

  /** Reads a file back out of WebContainer's own fs — e.g. package.json
   *  and its lockfile after `npm install` changes them there, so the
   *  change can be copied into the project's own virtual fs. */
  async readFile(path: string): Promise<string> {
    const instance = await this.getInstance()
    return instance.fs.readFile(path, 'utf-8')
  }

  async fileExists(path: string): Promise<boolean> {
    const instance = await this.getInstance()
    try {
      await instance.fs.readFile(path, 'utf-8')
      return true
    } catch {
      return false
    }
  }

  onServerReady(listener: ServerReadyListener): () => void {
    let unsubscribe = () => {}
    let cancelled = false
    this.getInstance().then((instance) => {
      if (cancelled) return
      unsubscribe = instance.on('server-ready', listener)
    }).catch(() => {
      // A boot failure here is already surfaced to the caller through
      // whatever else awaited getInstance() (e.g. mount()/run()) — this
      // registration racing that same failure must not also produce an
      // unhandled promise rejection.
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }

  /** Runs a command to completion, streaming output via onOutput. Returns the exit code. */
  async run(command: string[], onOutput: RuntimeLogListener): Promise<number> {
    const instance = await this.getInstance()
    if (command.length === 0) return 0
    const [cmd, ...args] = command
    const process = await instance.spawn(cmd, args)
    process.output.pipeTo(
      new WritableStream({
        write: (chunk) => onOutput(chunk),
      }),
    )
    return process.exit
  }

  /** Starts a long-running process (e.g. a dev server) and keeps a handle so it can be stopped. */
  async start(command: string[], onOutput: RuntimeLogListener): Promise<void> {
    await this.stop()
    const instance = await this.getInstance()
    const [cmd, ...args] = command
    this.currentProcess = await instance.spawn(cmd, args)
    this.currentProcess.output.pipeTo(
      new WritableStream({
        write: (chunk) => onOutput(chunk),
      }),
    )
  }

  async stop(): Promise<void> {
    this.currentProcess?.kill()
    this.currentProcess = null
  }

  /**
   * Fully tears down the booted instance (not just the running process),
   * so the next project opened gets a genuinely clean sandbox. Without
   * this, WebContainer's page-lifetime singleton kept whatever a previous
   * project mounted — `mount()` only ever merges a tree in, it never wipes
   * one — so a second project's Run could see the first project's leftover
   * files (node_modules included) still sitting in the same container.
   * Safe to call even if nothing ever booted.
   */
  async teardown(): Promise<void> {
    this.currentProcess?.kill()
    this.currentProcess = null
    const pending = this.bootPromise
    this.bootPromise = null
    if (!pending) return
    try {
      const instance = await pending
      instance.teardown()
    } catch {
      // Never booted, or boot itself failed — nothing to tear down.
    }
  }

  async spawnShell(
    onOutput: RuntimeLogListener,
  ): Promise<{ process: WebContainerProcess; write: (data: string) => void }> {
    const instance = await this.getInstance()
    const shellProcess = await instance.spawn('jsh', [], { terminal: { cols: 80, rows: 24 } })
    shellProcess.output.pipeTo(
      new WritableStream({
        write: (chunk) => onOutput(chunk),
      }),
    )
    const writer = shellProcess.input.getWriter()
    return {
      process: shellProcess,
      write: (data: string) => {
        void writer.write(data)
      },
    }
  }
}

export const WebContainerService = new WebContainerServiceImpl()
