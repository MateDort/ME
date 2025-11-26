import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Window {
  id: string
  title: string
  component: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  zIndex: number
}

export interface ChatMessage {
  id: string
  text: string
  sender: 'me' | 'assistant'
  timestamp: Date
  actions?: any[]
  widgets?: any[]
}

export interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
}

interface OSState {
  windows: Window[]
  activeWindow: string | null
  notifications: Notification[]
  // Chat state for M+M and Messages sync
  emeseMessages: ChatMessage[]
  meMessages: ChatMessage[]
  addWindow: (window: Omit<Window, 'zIndex'>) => void
  closeWindow: (id: string) => void
  setActiveWindow: (id: string) => void
  updateWindow: (id: string, updates: Partial<Window>) => void
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
  // Chat functions
  addEmeseMessage: (message: ChatMessage) => void
  addMeMessage: (message: ChatMessage) => void
  clearEmeseMessages: () => void
  clearMeMessages: () => void
}

let zIndexCounter = 1000

export const useOSStore = create<OSState>()(
  persist(
    (set) => ({
      windows: [],
      activeWindow: null,
      notifications: [],
      emeseMessages: [],
      meMessages: [],
      addWindow: (window) => {
        const zIndex = zIndexCounter++
        set((state) => ({
          windows: [...state.windows, { ...window, zIndex }],
          activeWindow: window.id,
        }))
      },
      closeWindow: (id) =>
        set((state) => ({
          windows: state.windows.filter((w) => w.id !== id),
          activeWindow:
            state.activeWindow === id
              ? state.windows.find((w) => w.id !== id)?.id || null
              : state.activeWindow,
        })),
      setActiveWindow: (id) => {
        set((state) => {
          const maxZ = Math.max(...state.windows.map((w) => w.zIndex), 0)
          return {
            activeWindow: id,
            windows: state.windows.map((w) =>
              w.id === id ? { ...w, zIndex: maxZ + 1 } : w
            ),
          }
        })
      },
      updateWindow: (id, updates) =>
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),
      addNotification: (notification) =>
        set((state) => ({
          notifications: [...state.notifications, notification],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      addEmeseMessage: (message) =>
        set((state) => ({
          emeseMessages: [...state.emeseMessages, message],
        })),
      addMeMessage: (message) =>
        set((state) => ({
          meMessages: [...state.meMessages, message],
        })),
      clearEmeseMessages: () =>
        set(() => ({
          emeseMessages: [],
        })),
      clearMeMessages: () =>
        set(() => ({
          meMessages: [],
        })),
    }),
    {
      name: 'meos-storage',
      partialize: (state) => ({
        emeseMessages: state.emeseMessages,
        meMessages: state.meMessages,
      }),
    }
  )
)

