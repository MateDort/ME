import { NextRequest, NextResponse } from 'next/server'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import path from 'path'
import { randomUUID } from 'crypto'

const PROJECT_ROOT = process.cwd()
const SAFE_COMMANDS = [
  'ls',
  'pwd',
  'cat',
  'npm',
  'npx',
  'pnpm',
  'yarn',
  'bun',
  'node',
  'python',
  'python3',
  'pip',
  'pip3',
  'go',
  'cargo',
  'git',
]
const ACTIVE_PROCESSES = new Map<string, { child: ChildProcessWithoutNullStreams; timeout: NodeJS.Timeout }>()

function sanitizeCommand(input: string) {
  if (!input || typeof input !== 'string') {
    throw new Error('Command is required.')
  }
  if (/[;&|><]/.test(input)) {
    throw new Error('Command chaining and redirection are not allowed.')
  }
  const parts = input.trim().split(/\s+/)
  const base = parts[0]
  if (!SAFE_COMMANDS.includes(base)) {
    throw new Error(`"${base}" is not permitted in the MEOS terminal.`)
  }
  return { base, args: parts.slice(1) }
}

function resolveCwd(requestedCwd?: string) {
  if (!requestedCwd) return PROJECT_ROOT
  const resolved = path.resolve(PROJECT_ROOT, requestedCwd)
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error('Invalid working directory.')
  }
  return resolved
}

export async function POST(req: NextRequest) {
  try {
    const { command, cwd } = await req.json()
    const { base, args } = sanitizeCommand(command)
    const workingDirectory = resolveCwd(cwd)

    // Get comprehensive PATH that includes all common locations
    const defaultPath = '/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
    const systemPath = process.env.PATH 
      ? `${process.env.PATH}:${defaultPath}`
      : defaultPath

    // Build the command with args
    const fullCommand = args.length > 0 ? `${base} ${args.join(' ')}` : base
    
    // Use /usr/bin/env which should always exist and will find commands in PATH
    // This is more reliable than using shell: true in some Next.js environments
    // /usr/bin/env is a standard utility that exists on all Unix systems
    const child = spawn('/usr/bin/env', [base, ...args], {
      cwd: workingDirectory,
      env: {
        ...process.env,
        PATH: systemPath,
      },
    })
    const commandId = randomUUID()
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      ACTIVE_PROCESSES.delete(commandId)
    }, 60_000)
    ACTIVE_PROCESSES.set(commandId, { child, timeout })
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        let isClosed = false
        
        const safeEnqueue = (data: Buffer | string) => {
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(data.toString()))
            } catch (error) {
              // Controller might be closed, ignore
              isClosed = true
            }
          }
        }
        
        const cleanup = () => {
          if (isClosed) return
          isClosed = true
          clearTimeout(timeout)
          ACTIVE_PROCESSES.delete(commandId)
          
          // Remove all listeners to prevent further events
          child.stdout.removeAllListeners()
          child.stderr.removeAllListeners()
          child.removeAllListeners()
          
          try {
            controller.close()
          } catch (error) {
            // Controller might already be closed, ignore
          }
        }

        child.stdout.on('data', safeEnqueue)
        child.stderr.on('data', safeEnqueue)
        
        child.on('close', (code) => {
          if (!isClosed) {
            safeEnqueue(`\nProcess exited with code ${code ?? '0'}\n`)
          }
          cleanup()
        })
        
        child.on('error', (error) => {
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(`\nError: ${error.message}\n`))
            } catch (e) {
              // Controller might be closed, ignore
            }
          }
          cleanup()
        })
      },
      cancel() {
        child.kill('SIGTERM')
        clearTimeout(timeout)
        ACTIVE_PROCESSES.delete(commandId)
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'x-terminal-id': commandId,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unable to run command.' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Command id is required.' }, { status: 400 })
  }
  const entry = ACTIVE_PROCESSES.get(id)
  if (!entry) {
    return NextResponse.json({ error: 'Command not found or already finished.' }, { status: 404 })
  }
  entry.child.kill('SIGTERM')
  clearTimeout(entry.timeout)
  ACTIVE_PROCESSES.delete(id)
  return NextResponse.json({ success: true })
}

