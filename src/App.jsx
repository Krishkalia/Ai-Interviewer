import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import PrepareScreen from './pages/PrepareScreen'
import InterviewScreen from './pages/InterviewScreen'
import FeedbackScreen from './pages/FeedbackScreen'
import StepsScreen from './pages/StepsScreen'
import { ConversationProvider } from '@elevenlabs/react'

function AppContent() {
  const { screen } = useApp()
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <Header />
      <div className="flex-grow">
        {screen === 'steps'     && <StepsScreen />}
        {screen === 'prepare'   && <PrepareScreen />}
        {screen === 'interview' && <InterviewScreen />}
        {screen === 'feedback'  && <FeedbackScreen />}
      </div>
      {screen !== 'interview' && (
        <footer className="mt-auto py-16 px-6 bg-surface-container-highest border-t border-outline-variant/20 text-center relative z-20">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
            <a href="https://digitalheroesco.com" target="_blank" rel="noreferrer" className="inline-block px-12 py-5 bg-gradient-to-r from-[#ff3366] to-[#ff6699] text-white font-extrabold rounded-full text-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform uppercase tracking-wider">
              Built for Digital Heroes
            </a>
            
            <div className="bg-surface-container-low p-8 md:p-12 rounded-[2rem] w-full border-2 border-primary/30 shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-black text-on-surface mb-6 font-headline">
                Krish Kalia
              </h2>
              <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 text-2xl font-bold text-on-surface-variant mb-8 font-body">
                <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined text-3xl">phone</span> 8360754129</span>
                <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined text-3xl">mail</span> krishkaliajal10@gmail.com</span>
              </div>
              <a href="https://github.com/Krishkalia/Ai-Interviewer" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-3 text-2xl md:text-3xl font-extrabold text-primary hover:text-primary-container transition-colors break-all">
                <span className="material-symbols-outlined text-4xl">code</span>
                https://github.com/Krishkalia/Ai-Interviewer
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

function ConversationWrapper({ children }) {
  const { elevenLabsKey } = useApp()
  return (
    <ConversationProvider key={elevenLabsKey} apiKey={elevenLabsKey}>
      {children}
    </ConversationProvider>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ConversationWrapper>
        <AppContent />
      </ConversationWrapper>
    </AppProvider>
  )
}
