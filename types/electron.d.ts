export interface ElectronTerminalRunResult {
  id: string
}

export interface ElectronTerminalExitPayload {
  code: number
  error?: string
}

export interface ElectronProcessInfo {
  id: string
  pid: number
  cwd: string
  command: string
}

export interface ElectronFilesystemEntry {
  name: string
  path: string
  type: 'file' | 'directory'
}

export interface ElectronSystemInfo {
  platform: string
  release: string
  arch: string
  cpus: number
  totalMem: number
  freeMem: number
  homeDir: string
  projectRoot: string
  isDev: boolean
}

export interface ElectronTerminalAPI {
  run(
    command: string,
    options?: {
      cwd?: string
    }
  ): Promise<ElectronTerminalRunResult>
  kill(id: string): Promise<{ ok: boolean; message?: string }>
  onData(id: string, listener: (data: string) => void): () => void
  onExit(id: string, listener: (payload: ElectronTerminalExitPayload) => void): () => void
}

export interface ElectronFilesystemAPI {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<{ ok: boolean }>
  listDir(path?: string): Promise<ElectronFilesystemEntry[]>
}

export interface ElectronProcessesAPI {
  list(): Promise<ElectronProcessInfo[]>
  kill(id: string): Promise<{ ok: boolean; message?: string }>
}

export interface ElectronWebsitesAPI {
  detectURLs(text: string): Promise<string[]>
  open(url: string, title?: string): Promise<{ ok: boolean; message?: string; reused?: boolean }>
  close(url: string): Promise<{ ok: boolean; message?: string }>
  onOpened(
    listener: (payload: { url: string; title?: string }) => void
  ): () => void
  onClosed(
    listener: (payload: { url: string }) => void
  ): () => void
}

export interface ElectronSystemAPI {
  getInfo(): Promise<ElectronSystemInfo>
  exit(): Promise<{ ok: boolean }>
  ping(): Promise<string>
}

export interface ElectronAPI {
  terminal: ElectronTerminalAPI
  filesystem: ElectronFilesystemAPI
  processes: ElectronProcessesAPI
  websites: ElectronWebsitesAPI
  system: ElectronSystemAPI
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}


