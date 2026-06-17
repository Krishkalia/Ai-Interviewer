import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useSpeech } from '../hooks/useSpeech'
import { useSpeechOffline } from '../hooks/useSpeechOffline'
import { generateReport } from '../utils/gemini'
import Swal from 'sweetalert2'

// ─── Components ───────────────────────────────────────
import { ThreeDAvatar } from '../components/ThreeDAvatar'
import { UserCamera } from '../components/UserCamera'

export default function InterviewScreen() {
  const { apiKey, role, resumeData, selectedMic, setSelectedMic, setReport, setScreen, convError, setConvError, offlineMode, modelProgress } = useApp()
  
  const onlineSpeech = useSpeech()
  const offlineSpeech = useSpeechOffline()
  
  const { 
    startSession, stopSession, isSpeaking, isUserSpeaking, 
    transcript, history, questionCount, status, isMuted, setMuted, streamingText 
  } = offlineMode ? offlineSpeech : onlineSpeech
 
  const [timer, setTimer] = useState('00:00')
  const [devices, setDevices] = useState([])
  const [showMicSettings, setShowMicSettings] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  
  const hStartedRef = useRef(false)
  const timerRef = useRef(null)
  
  // ── Enumerate Devices ──
  useEffect(() => {
    async function getDevices() {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices()
        const audioIn = devs.filter(d => d.kind === 'audioinput')
        setDevices(audioIn)
        if (!selectedMic && audioIn.length > 0) setSelectedMic(audioIn[0].deviceId)
      } catch (err) {}
    }
    getDevices()
  }, [selectedMic, setSelectedMic])

  // ── Timer Logic ──
  useEffect(() => {
    if (status === 'connected') {
        const start = Date.now()
        timerRef.current = setInterval(() => {
          const s = Math.floor((Date.now() - start) / 1000)
          setTimer(`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`)
        }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [status])

  // ── Session Trigger ──
  useEffect(() => {
    if (sessionStarted && !hStartedRef.current) {
      hStartedRef.current = true
      startSession(resumeData, role).catch(e => setConvError(e.message))
    }
  }, [sessionStarted, startSession, resumeData, role, setConvError])

  async function finish() {
    setIsEnding(true)
    clearInterval(timerRef.current)
    try { await stopSession() } catch (e) {}
    
    if (history.length <= 1) { 
      setReport({ error: "Session ended early." })
    } else {
      try {
        const r = await generateReport(history, resumeData, role, apiKey)
        setReport(r)
      } catch(e) { setReport({ error: "Report failed." }) }
    }
    setScreen('feedback')
  }

  const handleEndManual = async () => {
    const res = await Swal.fire({
      title: 'End Call?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Hang up', confirmButtonColor: '#ff0033', background: '#0a0a0f', color: '#fff'
    })
    if (res.isConfirmed) finish()
  }

  const aiMessage = history.filter(m => m.role !== 'user').slice(-1)[0]?.text

  return (
    <div className="relative h-screen w-full flex flex-col bg-[#0b1326] text-on-surface overflow-hidden">
      
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px] animate-pulse"/>
        <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-tertiary/10 rounded-full blur-[140px] animate-pulse [animation-delay:1.5s]"/>
      </div>

      {/* Header Info Icons */}
      <div className="absolute top-0 left-0 w-full z-50 p-6 flex justify-between pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-full pointer-events-auto border border-white/5 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-xs font-bold tabular-nums">{timer}</span>
        </div>
        <div className="glass-panel px-4 py-2 rounded-full pointer-events-auto border border-white/5 text-[10px] uppercase font-bold tracking-widest text-[#8083ff]">
          Que: {Math.min(questionCount, 5)}/5
        </div>
      </div>

      {/* Main Video Call Content - INCREASED SIZE */}
      <div className="flex-1 w-full max-w-[1540px] mx-auto flex flex-col justify-center px-4 md:px-8 py-10 pb-32 h-full z-20">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center justify-items-center">
          
          {/* AI Participant Container */}
          <div className="relative w-full aspect-video bg-[#0a0a0f] rounded-3xl overflow-hidden border-2 transition-all duration-300 shadow-2xl flex flex-col items-center justify-center border-white/5 group">
             {isSpeaking && (
               <div className="absolute inset-0 border-4 border-primary/40 rounded-3xl animate-in fade-in duration-500 pointer-events-none shadow-[inset_0_0_40px_rgba(32,32,255,0.2)]" />
             )}
             
             <ThreeDAvatar isSpeaking={isSpeaking} />
             
             {/* Interaction Controls Mask */}
             {!sessionStarted && (
               <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                 <button onClick={() => setSessionStarted(true)} className="px-10 py-5 bg-primary text-white rounded-full font-headline font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
                   <span className="material-symbols-outlined text-3xl">call</span>
                   Join Meeting
                 </button>
               </div>
             )}

             {/* Internal AI Subtitles Overlay */}
             {isSpeaking && (aiMessage || streamingText) && (
               <div className="absolute bottom-6 left-0 w-full px-6 z-10 animate-in fade-in slide-in-from-bottom-2">
                 <div className="glass-panel px-5 py-3 rounded-2xl border border-white/10 text-center backdrop-blur-xl">
                   <p className={`text-sm md:text-base font-bold text-on-surface line-clamp-3 ${streamingText === 'Thinking...' ? 'animate-pulse text-primary/80' : ''}`}>
                     {streamingText || aiMessage}
                   </p>
                 </div>
               </div>
             )}

             <div className="absolute top-4 left-4 glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-primary" />
               <span className="text-[10px] font-bold uppercase tracking-widest">AVA (AI)</span>
             </div>
          </div>

          {/* Candidate Participant Container */}
          <UserCamera isMuted={isMuted} isCameraOff={isCameraOff} isSpeaking={isUserSpeaking} subtitle={transcript} />

        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-10 py-5 glass-panel rounded-full border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
        <button onClick={() => setIsCameraOff(!isCameraOff)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCameraOff ? 'bg-white/10' : 'bg-[#2a2a35]'}`}>
          <span className="material-symbols-outlined text-xl">{isCameraOff ? 'videocam_off' : 'videocam'}</span>
        </button>

        <button onClick={() => setMuted(!isMuted)} disabled={status !== 'connected'} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${status !== 'connected' ? 'opacity-20' : ''} ${isMuted ? 'bg-error/20 text-error' : 'bg-[#2a2a35] text-white'}`}>
          <span className="material-symbols-outlined text-xl">{isMuted ? 'mic_off' : 'mic'}</span>
        </button>

        <div className="w-[1px] h-8 bg-white/10 mx-2" />

        <button onClick={handleEndManual} disabled={isEnding} className="w-16 h-16 rounded-full bg-[#ff0033] text-white shadow-2xl hover:bg-error hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
          <span className={`material-symbols-outlined text-3xl ${isEnding ? 'animate-spin' : ''}`}>
            {isEnding ? 'progress_activity' : 'call_end'}
          </span>
        </button>

        <div className="w-[1px] h-8 bg-white/10 mx-2" />

        <div className="relative">
          <button onClick={() => setShowMicSettings(!showMicSettings)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showMicSettings ? 'bg-[#8083ff]' : 'bg-[#2a2a35]'}`}>
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
          {showMicSettings && (
            <div className="absolute right-0 bottom-full mb-6 w-64 glass-panel p-4 rounded-2xl z-50 border border-white/5 shadow-2xl">
              <span className="text-[10px] uppercase font-black text-[#8083ff] mb-3 block">Audio Input</span>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {devices.map(d => (
                  <button key={d.deviceId} onClick={() => { setSelectedMic(d.deviceId); setShowMicSettings(false) }} className={`text-left text-xs p-3 rounded-xl transition-all ${selectedMic === d.deviceId ? 'bg-[#8083ff] text-white' : 'hover:bg-white/5 text-on-surface-variant'}`}>
                    {d.label || 'Microphone'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conv Error Overlay */}
      {convError && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 text-center">
           <div className="glass-panel p-8 rounded-3xl border border-error/20 max-w-md animate-in zoom-in duration-300">
             <span className="material-symbols-outlined text-error text-5xl mb-4">error</span>
             <h3 className="text-xl font-bold mb-2">Connection Problem</h3>
             <p className="text-sm text-on-surface-variant mb-6">{convError}</p>
             <button onClick={() => window.location.reload()} className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all">Reload Session</button>
           </div>
        </div>
      )}

      {/* Model Loading Overlay (Offline Mode Only) */}
      {offlineMode && status === 'loading' && (
        <div className="absolute inset-0 z-[70] bg-[#0b1326] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full">
            <div className="mb-8 relative">
              <div className="w-32 h-32 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <div className="absolute inset-0 flex items-center justify-center font-headline font-black text-2xl text-primary">
                {modelProgress}%
              </div>
            </div>
            <h3 className="text-2xl font-black mb-4 tracking-tight">Initializing Brain...</h3>
            <p className="text-on-surface-variant mb-8 leading-relaxed">
              We're loading <strong>Llama-3</strong> and <strong>Whisper</strong> into your GPU. This 5GB download happens only once and enables a 100% private, offline experience.
            </p>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
               <div className="h-full bg-primary transition-all duration-500" style={{ width: `${modelProgress}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


