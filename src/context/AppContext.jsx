import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [screen, setScreen] = useState('steps')          // 'steps' | 'prepare' | 'interview' | 'feedback'
  const [apiKey, setApiKey] = useState('')
  const [elevenLabsKey, setElevenLabsKey] = useState('')
  const [agentId, setAgentId] = useState(import.meta.env.VITE_ELEVENLABS_AGENT_ID || '')
  const [lang, setLang] = useState('English')
  const [role, setRole] = useState('Software Engineer')
  const [resumeData, setResumeData] = useState(null)       // parsed resume JSON
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])               // [{question,answer,score,emotion,coaching}]
  const [report, setReport] = useState(null)
  const [sessionStart, setSessionStart] = useState(null)
  const [selectedMic, setSelectedMic] = useState('')
  const [convError, setConvError] = useState(null)
  const [offlineMode, setOfflineMode] = useState(false)
  const [modelProgress, setModelProgress] = useState(0)

  const clearAICache = useCallback(async () => {
    try {
      // 1. Clear Caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (name.includes('webllm') || name.includes('transformers') || name.includes('mlc') || name.includes('tvm')) {
            await caches.delete(name);
          }
        }
      }
      // 2. Clear IndexedDB (WebLLM fallback)
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name.includes('webllm') || db.name.includes('mlc') || db.name.includes('transformers')) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
      return true;
    } catch (e) {
      console.error('Clear Cache Error:', e);
      return false;
    }
  }, []);

  const addAnswer = useCallback((ans) => setAnswers(prev => [...prev, ans]), [])
  const resetInterview = useCallback(() => {
    setAnswers([])
    setQuestions([])
    setCurrentQ(0)
    setReport(null)
    setSessionStart(null)
    setResumeData(null)
  }, [])

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      apiKey, setApiKey,
      elevenLabsKey, setElevenLabsKey,
      agentId, setAgentId,
      lang, setLang,
      role, setRole,
      resumeData, setResumeData,
      questions, setQuestions,
      currentQ, setCurrentQ,
      answers, addAnswer,
      report, setReport,
      sessionStart, setSessionStart,
      selectedMic, setSelectedMic,
      convError, setConvError,
      offlineMode, setOfflineMode,
      modelProgress, setModelProgress,
      clearAICache,
      resetInterview,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
