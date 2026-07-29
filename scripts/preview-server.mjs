/**
 * Start the production preview as a detached process.
 *
 * The detached child does not inherit the calling terminal's output handles,
 * so automation can return immediately instead of hanging while Next.js runs.
 *
 * Usage:
 *   npm run preview:start
 *   npm run preview:status
 *   npm run preview:stop
 */

import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { get } from 'node:http'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const stateDir = join(root, '.preview')
const statePath = join(stateDir, 'server.json')
const stdoutPath = join(stateDir, 'stdout.log')
const stderrPath = join(stateDir, 'stderr.log')
const nextCli = join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const port = Number.parseInt(process.env.TFH_PREVIEW_PORT || '3214', 10)
const baseUrl = `http://127.0.0.1:${port}`
const command = process.argv[2] || 'status'

function readState() {
  if (!existsSync(statePath)) return null
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'))
  } catch {
    return null
  }
}

function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function healthy() {
  return new Promise(resolve => {
    const request = get(baseUrl, {
      agent: false,
      headers: { 'user-agent': 'TradersFundHubPreviewController/1.0' },
    }, response => {
      response.resume()
      response.once('end', () => {
        resolve(response.statusCode >= 200 && response.statusCode < 500)
      })
    })
    request.setTimeout(2_000, () => request.destroy())
    request.once('error', () => resolve(false))
  })
}

async function waitForHealth(maxWaitMs = 12_000) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    if (await healthy()) return true
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  return false
}

async function start() {
  if (!existsSync(nextCli)) {
    throw new Error('Next.js is not installed. Run npm install before starting the preview.')
  }

  const existing = readState()
  if (existing && processExists(existing.pid)) {
    console.log(`Preview already running at ${baseUrl} (PID ${existing.pid}).`)
    return
  }
  if (await healthy()) {
    throw new Error(
      `${baseUrl} is already in use by a process this controller did not start.`,
    )
  }

  mkdirSync(stateDir, { recursive: true })
  const stdout = openSync(stdoutPath, 'a')
  const stderr = openSync(stderrPath, 'a')
  const child = spawn(process.execPath, [nextCli, 'start', '-p', String(port)], {
    cwd: root,
    detached: true,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', stdout, stderr],
    windowsHide: true,
  })
  child.unref()
  closeSync(stdout)
  closeSync(stderr)

  writeFileSync(
    statePath,
    `${JSON.stringify({
      pid: child.pid,
      port,
      startedAt: new Date().toISOString(),
    }, null, 2)}\n`,
  )

  if (!(await waitForHealth())) {
    throw new Error(
      `Preview process ${child.pid} did not become healthy. Check ${stderrPath}.`,
    )
  }
  console.log(`Preview ready at ${baseUrl} (PID ${child.pid}).`)
}

async function stop() {
  const state = readState()
  if (!state) {
    console.log('No controller-managed preview is recorded.')
    return
  }

  if (processExists(state.pid)) {
    process.kill(state.pid, 'SIGTERM')
    const deadline = Date.now() + 5_000
    while (processExists(state.pid) && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  rmSync(statePath, { force: true })
  console.log(`Stopped controller-managed preview PID ${state.pid}.`)
}

async function status() {
  const state = readState()
  const isHealthy = await healthy()
  if (state && processExists(state.pid)) {
    console.log(
      `Preview PID ${state.pid}: ${isHealthy ? `healthy at ${baseUrl}` : 'running but unhealthy'}.`,
    )
    return
  }
  console.log(isHealthy
    ? `${baseUrl} is healthy but is not controller-managed.`
    : 'Preview is stopped.')
  process.exitCode = isHealthy ? 0 : 1
}

try {
  if (command === 'start') await start()
  else if (command === 'stop') await stop()
  else if (command === 'status') await status()
  else throw new Error(`Unknown command "${command}". Use start, stop, or status.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}

// A detached ChildProcess can keep its Windows launcher bookkeeping handle
// alive even after child.unref(). Health checking is complete by this point,
// so the start command can exit explicitly without affecting the server.
if (command === 'start') process.exit(process.exitCode || 0)
