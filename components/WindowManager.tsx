'use client'

import { useOSStore } from '@/lib/store'
import Window from './Window'
import MessagesApp from './apps/MessagesApp'
import MusicPlayer from './apps/MusicPlayer'
import GoogleSearch from './apps/GoogleSearch'
import NewsApp from './apps/NewsApp'
import BrainstormApp from './apps/BrainstormApp'
import HealthApp from './apps/HealthApp'
import BuilderApp from './apps/BuilderApp'
import AppLauncher from './apps/AppLauncher'
import LanguageApp from './apps/LanguageApp'
import PianoApp from './apps/PianoApp'

const componentMap: Record<string, React.ComponentType<any>> = {
  messages: MessagesApp,
  music: MusicPlayer,
  search: GoogleSearch,
  news: NewsApp,
  brainstorm: BrainstormApp,
  health: HealthApp,
  builder: BuilderApp,
  launcher: AppLauncher,
  language: LanguageApp,
  piano: PianoApp,
  blank: () => <div className="w-full h-full flex items-center justify-center text-gray-500">Empty Window</div>,
}

export default function WindowManager() {
  const { windows } = useOSStore()

  return (
    <>
      {windows.map((window) => {
        const Component = componentMap[window.component]
        if (!Component) return null

        return (
          <Window key={window.id} window={window}>
            <Component />
          </Window>
        )
      })}
    </>
  )
}

