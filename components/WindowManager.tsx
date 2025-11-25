'use client'

import { useOSStore } from '@/lib/store'
import Window from './Window'
import MessagesApp from './apps/MessagesApp'
import MusicPlayer from './apps/MusicPlayer'
import GoogleSearch from './apps/GoogleSearch'
import NewsApp from './apps/NewsApp'
import BrainstormApp from './apps/BrainstormApp'
import HealthApp from './apps/HealthApp'
import AppLauncher from './apps/AppLauncher'
import LanguageApp from './apps/LanguageApp'
import PianoApp from './apps/PianoApp'
import CalendarApp from './apps/CalendarApp'
import MapsApp from './apps/MapsApp'
import SkillShippingApp from './apps/SkillShippingApp'
import NeuraNoteApp from './apps/NeuraNoteApp'
import AIDoormanApp from './apps/AIDoormanApp'

const componentMap: Record<string, React.ComponentType<any>> = {
  messages: MessagesApp,
  music: MusicPlayer,
  search: GoogleSearch,
  news: NewsApp,
  brainstorm: BrainstormApp,
  health: HealthApp,
  launcher: AppLauncher,
  language: LanguageApp,
  piano: PianoApp,
  calendar: CalendarApp,
  maps: MapsApp,
  skillshipping: SkillShippingApp,
  neuranote: NeuraNoteApp,
  doorman: AIDoormanApp,
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
