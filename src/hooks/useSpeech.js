import { useCallback, useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useConversation } from '@elevenlabs/react'

export function useSpeech() {
  const { lang, agentId, elevenLabsKey, setConvError } = useApp()
  const [transcript, setTranscript] = useState('')
  const [history, setHistory] = useState([])
  const [questionCount, setQuestionCount] = useState(0)
  const isEndingRef = useRef(false)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)
 
  // Voice Activity Detection (VAD) Logic
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const vadIntervalRef = useRef(null)

  const stopVAD = useCallback(() => {
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)
    if (audioContextRef.current) audioContextRef.current.close()
    audioContextRef.current = null
    analyserRef.current = null
    setIsUserSpeaking(false)
  }, [])

  const startVAD = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioCtx()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i]
        const average = sum / bufferLength
        setIsUserSpeaking(average > 15) // Slightly higher threshold for stability
      }, 100)
    } catch (err) {
      console.warn('VAD Audio Error:', err)
    }
  }, [])

  const conversation = useConversation({
    onConnect: () => {
      setConvError(null)
      startVAD() // Start VAD only when actually connected
    },
    onDisconnect: () => {
      setQuestionCount(0)
      isEndingRef.current = false
      stopVAD()
    },
    onMessage: (msg) => {
      const text = msg.message || msg.text || ""
      const source = msg.source || msg.role || "unknown"
      setHistory(prev => [...prev, { role: source, text: text }])
      
      if (source === 'user') setTranscript(text)

      if (source === 'agent' || source === 'ai' || source === 'assistant') {
        const lowerText = text.toLowerCase()
        const fillerPhrases = ['shall we begin', 'shall we start', 'are you ready', 'are you alright', 'kya hum shuru karein', 'tayyar hain']
        const isFiller = fillerPhrases.some(phrase => lowerText.includes(phrase))
        
        if (text.includes('?') && !isFiller && text.split(' ').length >= 5) {
          setQuestionCount(prev => prev + 1)
        }
        
        const isGoodbye = lowerText.includes('complete') || lowerText.includes('nice day') || lowerText.includes('shukriya')
        if (isGoodbye && questionCount >= 5) isEndingRef.current = true
      }
    },
    onError: (err) => {
      console.error('ElevenLabs SDK Error:', err)
      setConvError(err?.message || 'Connection Error')
      stopVAD()
    },
  })

  const startSession = useCallback(async (resumeData, role) => {
    if (conversation.status === 'connected' || conversation.status === 'connecting') return
    if (!agentId) return setConvError('Missing Agent ID')

    try {
      setConvError(null)
      let conversationToken = null
      if (elevenLabsKey) {
        try {
          const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId.trim()}`, {
            method: 'GET',
            headers: { 'xi-api-key': elevenLabsKey.trim() }
          })
          if (res.ok) {
             const data = await res.json()
             conversationToken = data.token
          }
        } catch (e) {}
      }

      const firstName = resumeData?.name?.split(' ')[0] || 'there'
      const firstMessages = {
        'Hindi': `Namaste ${firstName}! Main Ava hoon. Kya hum shuru karein?`,
        'Hinglish': `Hello ${firstName}! I'm Ava. Maine aapka resume dekha. Shall we start?`,
        'English': `Hello ${firstName}! I'm Ava. I've reviewed your resume and I'm ready to begin. Shall we?`
      }

      await conversation.startSession({
        agentId: agentId.trim(),
        conversationToken,
        overrides: {
          agent: {
            firstMessage: firstMessages[lang] || firstMessages['English'],
            language: lang === 'Hindi' ? 'hi' : 'en',
            prompt: { prompt: `Role: ${role}. Candidate: ${resumeData?.name}. Goal: 5 questions then goodbye.` }
          }
        }
      })
    } catch (err) {
      setConvError(err.message)
    }
  }, [agentId, lang, elevenLabsKey, conversation, setConvError])

  const stopSession = useCallback(async () => {
    await conversation.endSession()
    stopVAD()
  }, [conversation, stopVAD])

  return { 
    startSession, stopSession, 
    isSpeaking: conversation.isSpeaking, 
    isListening: conversation.status === 'connected', 
    isUserSpeaking,
    transcript, history, questionCount, 
    isAutoEnding: isEndingRef.current,
    status: conversation.status,
    isMuted: conversation.isMuted,
    setMuted: conversation.setMuted
  }
}


