import { WebContainerService } from '@/services/WebContainerService'
import { useRuntimeStore } from '@/stores/runtimeStore'

/**
 * Mirrors a file write into a running WebContainer instance so Run/Preview
 * reflects edits made after Run without a full re-run — used by both a
 * manual editor save and an AI agent tool call. Only fires when a
 * container is actually up (`status === 'running'`); never triggers a
 * WebContainer boot on its own, and never fails the caller's own write.
 */
export function syncFileToRunningContainer(path: string, content: string): void {
  if (WebContainerService.isSupported && useRuntimeStore.getState().status === 'running') {
    WebContainerService.writeFile(path, content).catch((err) => {
      console.warn(`Failed to sync "${path}" to the running preview:`, err)
    })
  }
}
