'use client'

import { useOSStore } from '@/lib/store'
import Window from './Window'
import MessagesApp from './apps/MessagesApp'
import MusicPlayer from './apps/MusicPlayer'
import GoogleSearch from './apps/GoogleSearch'
import NewsApp from './apps/NewsApp'
import CursorApp from './apps/CursorApp'
import TerminalApp from './apps/TerminalApp'
import HealthApp from './apps/HealthApp'
import AppLauncher from './apps/AppLauncher'
import LanguageApp from './apps/LanguageApp'
import PianoApp from './apps/PianoApp'
import CalendarApp from './apps/CalendarApp'
import MapsApp from './apps/MapsApp'
import SkillShippingApp from './apps/SkillShippingApp'
import NeuraNoteApp from './apps/NeuraNoteApp'
import AIDoormanApp from './apps/AIDoormanApp'
import FinderApp from './apps/FinderApp'
import NotionApp from './apps/NotionApp'
import SystemPreferencesApp from './apps/SystemPreferencesApp'

const componentMap: Record<string, React.ComponentType<any>> = {
  messages: MessagesApp,
  music: MusicPlayer,
  search: GoogleSearch,
  news: NewsApp,
  cursor: CursorApp,
  terminal: TerminalApp,
  brainstorm: CursorApp, // legacy name for persisted windows
  health: HealthApp,
  launcher: AppLauncher,
  language: LanguageApp,
  piano: PianoApp,
  calendar: CalendarApp,
  maps: MapsApp,
  skillshipping: SkillShippingApp,
  neuranote: NeuraNoteApp,
  doorman: AIDoormanApp,
  finder: FinderApp,
  notion: NotionApp,
  preferences: SystemPreferencesApp,
  blank: () => <div className="w-full h-full flex items-center justify-center text-gray-500">Empty Window</div>,
}

// Apps that require authentication
const restrictedApps = [
  'music',
  'health',
  'notion',
  'calendar',
  'maps',
  'skillshipping',
  'neuranote',
  'doorman',
]

export default function WindowManager() {
  const { windows, isAuthenticated, closeWindow } = useOSStore()

  return (
    <>
      {windows.map((window) => {
        const Component = componentMap[window.component]
        if (!Component) return null

        // Check if app requires authentication
        if (restrictedApps.includes(window.component) && !isAuthenticated) {
          // Close the window if user tries to access restricted app without auth
          setTimeout(() => closeWindow(window.id), 0)
          return null
        }

        return (
          <Window key={window.id} window={window}>
            <Component />
          </Window>
        )
      })}
    </>
  )
}
