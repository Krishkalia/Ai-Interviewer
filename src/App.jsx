import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import PrepareScreen from './pages/PrepareScreen'
import InterviewScreen from './pages/InterviewScreen'
import FeedbackScreen from './pages/FeedbackScreen'
import { ConversationProvider } from '@elevenlabs/react'

function AppContent() {
  const { screen } = useApp()
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header />
      {screen === 'prepare'   && <PrepareScreen />}
      {screen === 'interview' && <InterviewScreen />}
      {screen === 'feedback'  && <FeedbackScreen />}
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
