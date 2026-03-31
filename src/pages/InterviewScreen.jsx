import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useSpeech } from '../hooks/useSpeech'
import { generateReport } from '../utils/gemini'
import Swal from 'sweetalert2'

// ─── Animated AI Avatar ───────────────────────────────
import { ThreeDAvatar } from '../components/ThreeDAvatar'

// ─── Interview Screen ─────────────────────────────────

// ─── Interview Screen ─────────────────────────────────
export default function InterviewScreen() {
  const { apiKey, role, resumeData, selectedMic, setSelectedMic, setReport, setScreen, convError, setConvError } = useApp()
  const { startSession, stopSession, isSpeaking, isListening, transcript, history, questionCount, isAutoEnding, detectEmotion, status, isMuted, setMuted } = useSpeech()
 
  const [aiStatusLabel, setAiStatusLabel] = useState('Connecting…')
  const [confidence, setConfidence] = useState(null)
  const [emotion, setEmotion] = useState(null)
  const [timer, setTimer] = useState('00:00')
  const [devices, setDevices] = useState([])
  const [showMicSettings, setShowMicSettings] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  
  const hasConnectedRef = useRef(false)
  const sessionStartRef = useRef(Date.now())
  const timerRef = useRef(null)
  const isFinishingRef = useRef(false)
 
  // ── Enumerate Devices ──
  useEffect(() => {
    async function getDevices() {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices()
        const audioIn = devs.filter(d => d.kind === 'audioinput')
        setDevices(audioIn)
        // Set default if none selected
        if (!selectedMic && audioIn.length > 0) {
          setSelectedMic(audioIn[0].deviceId)
        }
      } catch (err) {
        console.warn('Device enumeration failed', err)
      }
    }
    getDevices()
  }, [selectedMic, setSelectedMic])

  // ── Timer Start only on Connect ──
  useEffect(() => {
    if (status === 'connected' && !timerRef.current) {
        hasConnectedRef.current = true
        sessionStartRef.current = Date.now()
        timerRef.current = setInterval(() => {
          const s = Math.floor((Date.now() - sessionStartRef.current) / 1000)
          setTimer(`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`)
        }, 1000)
    }
    return () => {
        if (!isFinishingRef.current && timerRef.current) {
            // Clean up timer on unmount if not already finishing
            // Actually finish() will handle this, but it's good to clear it.
        }
    }
  }, [status])

  // ── Start Interview logic ──
  const hasStartedRef = useRef(false)
  useEffect(() => {
    if (!sessionStarted || hasStartedRef.current) return
    hasStartedRef.current = true
    if (!apiKey || !resumeData) {
      setConvError('Missing configuration or resume data.')
      return
    }
    startSession(resumeData, role).catch(e => {
        console.error('Session start error', e)
        setConvError(e.message || 'Failed to start session')
    })
  }, [sessionStarted, startSession, resumeData, role, apiKey, setConvError])

  const handleStartSession = () => {
    setSessionStarted(true)
  }

  // ── Handle Disconnect / End ──
  // Removed automatic finish() on 'disconnected' status to prevent 
  // navigating to the feedback screen when an initialization error occurs.
  // Finish will now be triggered ONLY by:
  // 1. Manual click on "End Session"
  // 2. AI Farewell detection (isAutoEnding)

  // ── Cleanup on Unmount ──
  // Use a ref to ensure we have the stable function for the final unmount
  const stopRef = useRef(stopSession)
  useEffect(() => { stopRef.current = stopSession }, [stopSession])

  useEffect(() => {
    return () => {
      // Only call stop if we aren't already finishing manually and session was actually started
      if (!isFinishingRef.current && hasStartedRef.current) {
        stopRef.current?.().catch(e => console.warn('Cleanup stop failed', e))
      }
    }
  }, []) // Empty array ensures this ONLY runs when leaving the screen

  // ── Detect Auto-End (Farewell) ──
  useEffect(() => {
    if (isAutoEnding && isSpeaking === false && !isFinishingRef.current) {
        // Wait 1.5s after the AI finishes saying goodbye before wrapping up
        setTimeout(() => {
           finish()
        }, 1500)
    }
  }, [isAutoEnding, isSpeaking, finish])

  // ── Emotion Detection on transcript change ──
  useEffect(() => {
    if (transcript && detectEmotion) {
      const em = detectEmotion(transcript)
      if (em) {
        setEmotion(em.label)
        setConfidence(prev => {
          const scores = [...(prev ? [prev] : []), em.score]
          return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)
        })
      }
    }
  }, [transcript, detectEmotion])

  useEffect(() => {
    if (status === 'connected') {
      setAiStatusLabel(isSpeaking ? 'AI is speaking…' : 'Listening…')
    } else if (status === 'connecting') {
      setAiStatusLabel('Connecting…')
    } else {
      setAiStatusLabel('Disconnected')
    }
  }, [status, isSpeaking])

  async function finish() {
    if (isFinishingRef.current) return
    isFinishingRef.current = true
    setIsEnding(true)
    setAiStatusLabel('Ending Session…')
    clearInterval(timerRef.current)
    
    try {
      await stopSession()
    } catch (e) {
      console.warn('Error stopping session', e)
    }
    
    setAiStatusLabel('Analyzing…')
    
    // Check if session ended before conversation even reached the user
    // history includes AI greeting + user messages. Check if user responded at all.
    const userMessages = history.filter(m => m.role === 'user')
    
    if (userMessages.length === 0) {
      setReport({ error: "Session ended before interview could start. Please try again." })
    } else {
      try {
        const r = await generateReport(history, resumeData, role, apiKey)
        setReport(r)
      } catch(e) { 
        console.warn('report err', e)
        setReport({ error: "Could not generate full report. Please check your internet and try again." })
      }
    }
    
    setIsEnding(false)
    setScreen('feedback')
  }

  const handleEndManual = async () => {
    const res = await Swal.fire({
      title: 'End Interview?',
      text: 'Are you sure you want to exit early? Your report will be generated based on the progress so far.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, End Session',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ff2052',
      background: '#1a1d33',
      color: '#fff'
    })

    if (res.isConfirmed) {
      finish()
    }
  }

  const statusColors = { 
    connecting: 'bg-indigo-400 animate-pulse', 
    connected: isSpeaking ? 'bg-tertiary animate-pulse' : 'bg-primary animate-pulse',
    disconnected: 'bg-error'
  }

  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]"/>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-tertiary/5 rounded-full blur-[100px]"/>
      </div>

      {/* HUD Left */}
      <div className="fixed left-3 top-20 z-30 flex flex-col gap-3">
        <div className="glass-panel p-4 rounded-xl flex flex-col gap-1 border-l-2 border-primary">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Session</span>
          <span className="font-headline font-bold text-2xl text-primary tabular-nums">{timer}</span>
        </div>
        <div className="glass-panel p-3 rounded-xl flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${convError ? 'bg-error animate-pulse' : (statusColors[status] || 'bg-slate-500')}`}/>
          <div className="flex flex-col">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${convError ? 'text-error' : 'text-on-surface'}`}>
                {convError ? 'Connection Issue' : aiStatusLabel}
            </span>
            {convError && (
              <button 
                onClick={() => { setConvError(null); setSessionStarted(false); hasStartedRef.current = false; }}
                className="mt-1 text-[10px] underline text-on-surface hover:text-primary decoration-primary/50 text-left font-bold"
              >
                Reset & Retry
              </button>
            )}
          </div>
        </div>
        <div className="glass-panel p-3 rounded-xl text-center border-l-2 border-tertiary">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block">Progress</span>
          <span className="font-headline font-bold text-lg text-tertiary">{Math.min(questionCount, 5)}/5</span>
        </div>

        {/* Mic Settings */}
        <div className="relative">
          <button 
            onClick={() => setShowMicSettings(!showMicSettings)}
            className={`glass-panel p-3 rounded-xl flex items-center gap-2 hover:bg-surface-container-high transition-colors ${showMicSettings ? 'bg-surface-container-high' : ''}`}
          >
            <span className="material-symbols-outlined text-sm">settings_voice</span>
            <span className="text-[10px] uppercase tracking-widest font-bold">Mic</span>
          </button>
          
          {showMicSettings && (
            <div className="absolute left-0 top-full mt-2 w-64 glass-panel p-3 rounded-xl z-50 animate-in fade-in slide-in-from-top-1">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 block">Select Microphone</span>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                {devices.map(d => (
                  <button
                    key={d.deviceId}
                    onClick={() => { setSelectedMic(d.deviceId); setShowMicSettings(false) }}
                    className={`text-left text-xs p-2 rounded-lg transition-colors ${selectedMic === d.deviceId ? 'bg-primary text-on-primary' : 'hover:bg-white/5 text-on-surface'}`}
                  >
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                  </button>
                ))}
                {devices.length === 0 && <span className="text-[10px] italic opacity-50">No devices found</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HUD Right */}
      <div className="fixed right-3 top-20 z-30 flex flex-col gap-3 items-end">
        <div className="glass-panel p-4 rounded-xl flex flex-col items-end gap-2">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Confidence</span>
          <div className="flex items-baseline gap-1">
            <span className="font-headline font-bold text-2xl text-tertiary">{confidence ?? '—'}</span>
            {confidence && <span className="text-xs text-on-surface-variant">%</span>}
          </div>
          <div className="w-24 h-1 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-tertiary transition-all duration-700" style={{ width: `${confidence ?? 0}%` }}/>
          </div>
        </div>
        {emotion && (
          <div className="glass-panel p-3 rounded-xl text-right">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block">Mood</span>
            <span className="text-sm text-tertiary font-bold">{emotion}</span>
          </div>
        )}
      </div>

      {/* Avatar Display */}
      <div className="relative z-20 flex flex-col items-center mt-8 w-full max-w-lg">
        <ThreeDAvatar isSpeaking={isSpeaking} />
        
        {!sessionStarted && (
           <div className="mt-10 animate-in fade-in zoom-in duration-500">
             <button
               onClick={handleStartSession}
               className="px-10 py-4 bg-primary text-on-primary rounded-full font-headline font-bold text-xl neon-glow hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3"
             >
               <span className="material-symbols-outlined">play_circle</span>
               Begin Discussion
             </button>
             <p className="mt-4 text-xs text-on-surface-variant font-medium opacity-60">Click to initialize voice interviewer</p>
           </div>
        )}

        {sessionStarted && (
          <div className="mt-8 max-w-2xl px-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
            <p className="text-xl md:text-2xl font-headline font-medium text-on-surface leading-relaxed drop-shadow-lg min-h-[3rem]">
              {isSpeaking ? 'Interviewer is communicating...' : 'Talk naturally with the AI...'}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 w-full z-40 px-6 pb-10 flex flex-col items-center gap-5">
        {/* Transcript */}
        <div className="w-full max-w-3xl glass-panel px-6 py-4 rounded-2xl flex items-start gap-4">
          <span className="material-symbols-outlined text-primary mt-1">account_circle</span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1 block">Live Transcript</span>
            <p className="transcript-text text-on-surface-variant italic font-medium">
              {(isAutoEnding && !isSpeaking) ? 'Finalizing interview...' : (transcript || (status === 'connected' ? 'Listening…' : 'Waiting…'))}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-12">
          <button 
            onClick={handleEndManual} 
            disabled={isEnding}
            title="End interview"
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isEnding ? 'bg-surface-variant opacity-50 cursor-not-allowed' : 'bg-error/20 text-error hover:bg-error shadow-lg hover:shadow-error/20'}`}>
            <span className={`material-symbols-outlined text-3xl ${isEnding ? 'animate-spin' : ''}`}>
              {isEnding ? 'progress_activity' : 'call_end'}
            </span>
          </button>

          {/* Manual Mic Toggle */}
          <div className="relative">
            <div className={`absolute -inset-6 rounded-full blur-2xl transition-all duration-500 ${isMuted ? 'bg-error/20' : (isListening ? 'bg-tertiary/30' : 'bg-primary/20')}`}/>
            <button 
              onClick={() => setMuted(!isMuted)}
              disabled={status !== 'connected'}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl border-4 ${status !== 'connected' ? 'opacity-50 grayscale' : ''} ${isMuted ? 'bg-surface-variant text-error border-error/50 scale-95' : 'bg-gradient-to-br from-[#c0c1ff] to-[#8083ff] text-[#1000a9] border-white/30 scale-100 neon-glow hover:scale-105 active:scale-95'}`}>
               <span className="material-symbols-outlined text-4xl mb-1">
                 {isMuted ? 'mic_off' : (isSpeaking ? 'volume_up' : 'mic')}
               </span>
               <span className="text-[10px] font-bold uppercase tracking-tighter">
                 {isMuted ? 'Muted' : 'Live'}
               </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
