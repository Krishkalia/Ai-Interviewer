import { useApp } from '../context/AppContext'

const SCREENS = ['prepare']
const LABELS = { prepare: 'Prepare', interview: 'Interview', feedback: 'Feedback' }
const ICONS  = { prepare: 'upload_file', interview: 'mic', feedback: 'analytics' }

export default function Header() {
  const { screen, setScreen } = useApp()

  return (
    <header className="bg-[#0b1326] fixed top-0 left-0 w-full z-50 border-b border-outline-variant/10">
      <div className="flex justify-between items-center px-6 h-16 w-full max-w-7xl mx-auto">
        {/* Logo */}
        <button onClick={() => setScreen('prepare')} className="flex items-center gap-3 focus:outline-none">
          <span className="material-symbols-outlined text-indigo-400">psychology</span>
          <span className="text-xl font-bold bg-gradient-to-br from-[#c0c1ff] to-[#8083ff] bg-clip-text text-transparent font-headline tracking-tight">
            Cognitive Echo
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 font-headline font-bold tracking-tight text-sm">
          {SCREENS.map(s => (
            <button
              key={s}
              onClick={() => setScreen(s)}
              className={`transition-colors duration-300 ${screen === s ? 'text-primary' : 'text-slate-400 hover:text-indigo-200'}`}
            >
              {LABELS[s]}
            </button>
          ))}
        </nav>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/15">
          <span className="material-symbols-outlined text-secondary">person</span>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-[#0b1326]/60 backdrop-blur-xl shadow-[0_-4px_24px_rgba(73,75,214,0.06)] rounded-t-2xl">
        {SCREENS.map(s => (
          <button
            key={s}
            onClick={() => setScreen(s)}
            className={`flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-all ${screen === s ? 'bg-surface-container-high text-primary' : 'text-slate-500'}`}
          >
            <span className="material-symbols-outlined">{ICONS[s]}</span>
            <span className="text-xs font-medium">{LABELS[s]}</span>
          </button>
        ))}
      </nav>
    </header>
  )
}
