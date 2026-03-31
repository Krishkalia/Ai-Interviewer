import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [screen, setScreen] = useState('prepare')          // 'prepare' | 'interview' | 'feedback'
  const [apiKey, setApiKey] = useState('')
  const [elevenLabsKey, setElevenLabsKey] = useState('')
  const [agentId, setAgentId] = useState('agent_9301kmzxwpsmept9ftpkfsmey78v')
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
      resetInterview,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
