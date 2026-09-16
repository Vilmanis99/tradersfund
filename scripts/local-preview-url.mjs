import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const statePath = join(projectRoot, '.preview', 'server.json')

/**
 * Resolve the local preview endpoint in the same order a developer expects:
 * an explicit CLI URL wins, then the environment, then the controller's
 * recorded port, and finally the historical 3214 default.
 */
export function localPreviewUrl(explicit) {
  if (explicit) return explicit
  if (process.env.TFH_PREVIEW_PORT) return `http://127.0.0.1:${process.env.TFH_PREVIEW_PORT}`

  try {
    if (existsSync(statePath)) {
      const state = JSON.parse(readFileSync(statePath, 'utf8'))
      if (Number.isInteger(state.port) && state.port > 0 && state.port < 65536) {
        return `http://127.0.0.1:${state.port}`
      }
    }
  } catch {
    // A missing or partially-written controller state file should not make
    // the check itself crash; the fallback gives the caller a useful refusal.
  }

  return 'http://127.0.0.1:3214'
}
