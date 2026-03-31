import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { extractTextFromPdf } from '../utils/pdfParser'
import { analyzeResume } from '../utils/gemini'

const ROLES = ['Software Engineer','Product Manager','Data Scientist','UX Designer','DevOps Architect','ML Engineer','Full Stack Developer']
const LANGS = ['English','Hindi','Hinglish']

export default function PrepareScreen() {
  const { apiKey, setApiKey, elevenLabsKey, setElevenLabsKey, agentId, setAgentId, lang, setLang, role, setRole, setResumeData, setScreen } = useApp()

  // Auto-populate from env var on first mount
  useEffect(() => {
    if (!apiKey && import.meta.env.VITE_GEMINI_API_KEY) {
      setApiKey(import.meta.env.VITE_GEMINI_API_KEY)
    }
    if (!elevenLabsKey && import.meta.env.VITE_ELEVENLABS_API_KEY) {
      setElevenLabsKey(import.meta.env.VITE_ELEVENLABS_API_KEY)
    }
  }, [])
  const [parseState, setParseState] = useState('idle') // 'idle'|'loading'|'success'|'error'
  const [parseMsg, setParseMsg]   = useState('')
  const [dragOver, setDragOver]   = useState(false)
  const inputRef = useRef(null)

  async function processFile(file) {
    if (!file || file.type !== 'application/pdf') { setParseState('error'); setParseMsg('Please upload a PDF file.'); return }
    if (!apiKey.trim()) { setParseState('error'); setParseMsg('Enter your Gemini API key first.'); return }
    setParseState('loading'); setParseMsg(`Reading "${file.name}"…`)
    try {
      const text = await extractTextFromPdf(file)
      setParseMsg('Analyzing with Gemini AI…')
      const data = await analyzeResume(text, apiKey.trim())
      setResumeData(data)
      setParseState('success')
      setParseMsg(`✓ ${data.name || 'Resume'} parsed · ${data.experience_level} · ${(data.skills||[]).slice(0,3).join(', ')}`)
    } catch(err) {
      setParseState('error'); setParseMsg(err.message)
    }
  }

  return (
    <main className="min-h-screen pt-24 pb-28 px-6 relative bg-grid-subtle">
      {/* Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full"/>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary blur-[120px] rounded-full opacity-50"/>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tighter mb-4">
            Initialize Your Session
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto leading-relaxed">
            Upload your resume and let Cognitive Echo generate a personalized, voice-first interview tailored to your background.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Resume Upload */}
          <div className="md:col-span-12 lg:col-span-7 bg-surface-container-low p-8 rounded-[2rem]">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">upload_file</span>
              <h3 className="font-headline text-xl font-bold">Resume Intelligence</h3>
            </div>
            <div
              className={`border-2 border-dashed rounded-2xl bg-surface-container-lowest flex flex-col items-center justify-center py-14 px-6 text-center cursor-pointer transition-all duration-300 ${dragOver ? 'border-primary/70 bg-surface-container-high/30' : 'border-outline-variant/20 hover:border-primary/50'}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }}
            >
              <div className="w-16 h-16 rounded-full bg-surface-container-high mb-4 flex items-center justify-center transition-transform duration-300 hover:scale-110">
                <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
              </div>
              <p className="font-body text-on-surface font-semibold mb-1">Drag and drop your PDF</p>
              <p className="font-body text-on-surface-variant text-sm">or click to browse</p>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => processFile(e.target.files[0])}/>
            </div>

            {/* Status */}
            {parseState !== 'idle' && (
              <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${
                parseState === 'loading' ? 'bg-surface-container-high' :
                parseState === 'success' ? 'bg-green-900/20' : 'bg-error/10'
              }`}>
                <span className={`material-symbols-outlined ${parseState === 'loading' ? 'text-primary animate-spin' : parseState === 'success' ? 'text-green-400' : 'text-error'}`}>
                  {parseState === 'loading' ? 'autorenew' : parseState === 'success' ? 'check_circle' : 'error'}
                </span>
                <span className="text-on-surface-variant text-sm">{parseMsg}</span>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant/60">
              <span className="material-symbols-outlined text-sm">info</span>
              <span>Your data stays local — resume is never stored on servers.</span>
            </div>
          </div>

          {/* Job Role */}
          <div className="md:col-span-6 lg:col-span-5 bg-surface-container-low p-8 rounded-[2rem] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-tertiary">work</span>
                <h3 className="font-headline text-xl font-bold">Target Position</h3>
              </div>
              <label className="block text-sm font-label text-on-surface-variant mb-2 px-1">Select Job Role</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-surface-container-high border-0 rounded-xl py-4 px-4 text-on-surface appearance-none focus:ring-2 focus:ring-primary/50 font-body"
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-outline-variant/10">
              <p className="text-sm text-on-surface-variant">Questions are tailored to your role + resume combination.</p>
            </div>
          </div>

          {/* Language */}
          <div className="md:col-span-6 lg:col-span-5 bg-surface-container-low p-8 rounded-[2rem]">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-secondary">translate</span>
              <h3 className="font-headline text-xl font-bold">Linguistic Preference</h3>
            </div>
            <div className="flex flex-col gap-3">
              {LANGS.map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex items-center justify-between p-4 rounded-xl font-body transition-all ${lang === l ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'}`}
                >
                  <span>{l}</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: lang===l ? "'FILL' 1" : "'FILL' 0", opacity: lang===l?1:0 }}>
                    check_circle
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="md:col-span-6 lg:col-span-7 bg-surface-container-low p-8 rounded-[2rem]">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">key</span>
              <h3 className="font-headline text-xl font-bold">API Configuration</h3>
            </div>
            
            <label className="block text-sm font-label text-on-surface-variant mb-2">Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIza…"
              className="w-full bg-surface-container-high border-0 rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 font-body placeholder:text-on-surface-variant/40 mb-5"
            />

            <label className="block text-sm font-label text-on-surface-variant mb-2">ElevenLabs Voice Key (Optional)</label>
            <input
              type="password"
              value={elevenLabsKey}
              onChange={e => setElevenLabsKey(e.target.value)}
              placeholder="Enter ElevenLabs API key"
              className="w-full bg-surface-container-high border-0 rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-tertiary/50 font-body placeholder:text-on-surface-variant/40 mb-5"
            />

            <label className="block text-sm font-label text-on-surface-variant mb-2">ElevenLabs Agent ID (Optional - for Conversational AI)</label>
            <input
              type="text"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              placeholder="e.g. 21m00Tcm4TlvDq..."
              className="w-full bg-surface-container-high border-0 rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-tertiary/50 font-body placeholder:text-on-surface-variant/40"
            />

            <p className="mt-4 text-xs text-on-surface-variant/60">
              Only Gemini is required (free at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-primary underline">aistudio.google.com</a>). ElevenLabs gives ultra-realistic voices.
            </p>
          </div>

          {/* CTA */}
          <div className="md:col-span-12 bg-gradient-to-br from-primary/10 to-transparent p-10 rounded-[2rem] border border-primary/20 flex flex-col items-center text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
              </div>
              <h3 className="font-headline text-2xl font-black mb-4">Ready to Engage?</h3>
              <p className="text-on-surface-variant mb-8 max-w-sm">
                Ensure your microphone is ready. The session adapts in real-time to your responses.
              </p>
              <button
                onClick={() => setScreen('interview')}
                disabled={parseState !== 'success'}
                className="px-12 py-5 bg-gradient-to-r from-[#c0c1ff] to-[#8083ff] rounded-full text-[#1000a9] font-headline font-extrabold text-xl tracking-wide neon-glow hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                Start Interview
              </button>
              <p className="mt-4 text-xs text-on-surface-variant">
                {parseState === 'success' ? 'You are ready! Click to begin.' : 'Upload and analyze a resume to enable.'}
              </p>
            </div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/20 blur-3xl rounded-full"/>
          </div>
        </div>
      </div>
    </main>
  )
}
