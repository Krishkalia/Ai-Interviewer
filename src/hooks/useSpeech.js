import { useCallback, useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useConversation } from '@elevenlabs/react'

export function useSpeech() {
  const { lang, agentId, setConvError } = useApp()
  const [transcript, setTranscript] = useState('')
  const [history, setHistory] = useState([])
  const [questionCount, setQuestionCount] = useState(0)
  const isEndingRef = useRef(false)
 
  const conversation = useConversation({
    onConnect: () => {
      setConvError(null)
    },
    onDisconnect: () => {
      setQuestionCount(0)
      isEndingRef.current = false
    },
    onMessage: (msg) => {
      const text = msg.message || msg.text || ""
      const source = msg.source || msg.role || "unknown"

      setHistory(prev => [...prev, { role: source, text: text }])
      
      if (source === 'user') {
        setTranscript(text)
      }

      if (source === 'agent' || source === 'ai' || source === 'assistant') {
        if (text.includes('?')) {
          setQuestionCount(prev => prev + 1)
        }
        
        const lowerText = text.toLowerCase()
        const isGoodbye = lowerText.includes('interview is now complete') || 
                          lowerText.includes('have a nice day') || 
                          lowerText.includes('shukriya') || 
                          lowerText.includes('alvida')
                          
        if (isGoodbye && questionCount >= 5) {
           isEndingRef.current = true
        }
      }
    },
    onError: (err) => {
      console.error('ElevenLabs Error:', err)
      setConvError(err?.message || 'Connection Error')
    },
  })

  const startSession = useCallback(async (resumeData, role) => {
    if (conversation.status === 'connected' || conversation.status === 'connecting') return
    if (!agentId) return

    try {
      setConvError(null)
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await new Promise(r => setTimeout(r, 200))

      const firstName = resumeData?.name?.split(' ')[0] || 'there'
      const topSkill = resumeData?.skills?.[0] || 'your profile'
      const resumeSummary = `Name: ${resumeData?.name}, Skills: ${resumeData?.skills?.slice(0, 8).join(', ')}`

      const firstMessages = {
        'Hindi': `Namaste ${firstName}! Main Ava hoon. Aapka resume impressive hai. Kya hum shuru karein?`,
        'Hinglish': `Hello ${firstName}! I'm Ava. Maine aapka resume dekha, it looks great. Background with ${topSkill} is interesting. Shall we start?`,
        'English': `Hello ${firstName}! I'm Ava. I've reviewed your resume and I'm impressed with your background in ${topSkill}. Shall we begin?`
      }

      const langMap = { 'English': 'en', 'Hindi': 'hi', 'Hinglish': 'en' }

      await conversation.startSession({
        agentId: agentId.trim(),
        overrides: {
          agent: {
            firstMessage: firstMessages[lang] || firstMessages['English'],
            language: langMap[lang] || 'en',
            prompt: {
              prompt: `Interviewer: Ava. Role: ${role}. Candidate: ${resumeData?.name}. Background: ${resumeSummary}. Goal: 5 questions then goodbye.`
            }
          }
        }
      })
    } catch (err) {
      setConvError('Failed to start session')
    }
  }, [agentId, lang, conversation])

  const stopSession = useCallback(async () => {
    await conversation.endSession()
  }, [conversation])

  const detectEmotion = useCallback((text) => {
    const fillers = /\b(uh+|um+|er+|hmm+|like|you know|basically)\b/gi
    const fillerCount = (text.match(fillers) || []).length
    const wordCount = text.split(/\s+/).filter(Boolean).length || 1
    let score = Math.max(10, Math.min(100, 50 - (fillerCount * 5)))
    const label = score >= 70 ? 'Confident' : score >= 40 ? 'Calm' : 'Nervous'
    return { score, label }
  }, [])

  return { 
    startSession, stopSession, 
    isSpeaking: conversation.isSpeaking, 
    isListening: conversation.status === 'connected', 
    transcript, history, questionCount, 
    isAutoEnding: isEndingRef.current,
    detectEmotion,
    status: conversation.status,
    isMuted: conversation.isMuted,
    setMuted: conversation.setMuted
  }
}
