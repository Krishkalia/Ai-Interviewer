import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'

function AnimatedScore({ value, color = 'primary' }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let i = 0
    const step = Math.ceil(value / 50)
    const t = setInterval(() => {
      i = Math.min(i + step, value)
      setDisplay(i)
      if (i >= value) clearInterval(t)
    }, 25)
    return () => clearInterval(t)
  }, [value])
  return <>{display}</>
}

function ScoreCard({ label, icon, id, value, color }) {
  const textColor = color === 'tertiary' ? 'text-tertiary' : 'text-primary'
  const barColor = color === 'tertiary' ? 'bg-tertiary' : 'bg-gradient-to-r from-primary to-primary-container'
  return (
    <div className="bg-surface-container-low p-8 rounded-3xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className="material-symbols-outlined text-8xl">{icon}</span>
      </div>
      <div className="relative z-10">
        <span className="text-on-surface-variant font-label text-sm uppercase tracking-widest mb-2 block">{label}</span>
        <div className={`flex items-baseline gap-2 ${textColor}`}>
          <span className="font-headline text-6xl font-extrabold"><AnimatedScore value={value}/></span>
          <span className="text-2xl font-bold">%</span>
        </div>
        <div className="mt-6 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${value}%` }}/>
        </div>
      </div>
    </div>
  )
}

export default function FeedbackScreen() {
  const { report, resumeData, role, answers, setScreen, resetInterview } = useApp()

  function handleNewInterview() {
    resetInterview()
    setScreen('prepare')
  }

  if (report?.error) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-24 flex flex-col items-center justify-center text-center mt-16">
        <div className="w-24 h-24 rounded-3xl bg-error/10 flex items-center justify-center mb-8 border-2 border-error/20">
          <span className="material-symbols-outlined text-error text-5xl">warning</span>
        </div>
        <h1 className="font-headline text-4xl font-extrabold text-on-background mb-4">
          Interview Interrupted
        </h1>
        <p className="text-on-surface-variant text-lg max-w-md mb-12 italic">
          "{report.error}"
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleNewInterview}
            className="px-10 py-4 rounded-full bg-primary text-on-primary font-headline font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">refresh</span> Try Again
          </button>
          <button 
            onClick={() => setScreen('prepare')}
            className="px-10 py-4 rounded-full bg-surface-container-highest text-on-surface font-headline font-bold text-lg hover:bg-surface-bright transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span> Back to Setup
          </button>
        </div>
      </main>
    )
  }

  // Fallback data if report data is missing (not an explicit error)
  const avgScore = answers.length
    ? Math.round(answers.reduce((s,a) => s+(a.score||50),0)/answers.length)
    : 65
  const r = report || {
    confidence_score: avgScore,
    communication_score: Math.min(100, avgScore + 5),
    technical_score: Math.max(0, avgScore - 8),
    competencies: (resumeData?.skills||[]).slice(0,5).map((s,i) => ({ name:s, score: Math.max(50, avgScore - i*4) })),
    strengths: resumeData?.strengths || ['Strong project background'],
    growth_areas: resumeData?.weaknesses || ['Continue practicing technical questions'],
    coaching: answers.slice(0,2).map(a => ({ tip: a.coaching || 'Review your answer for this question.', tags: ['Improvement'] })),
  }

  function handleNewInterview() {
    resetInterview()
    setScreen('prepare')
  }

  function exportReport() {
    const txt = [
      'COGNITIVE ECHO — Interview Report',
      `Candidate: ${resumeData?.name || 'Unknown'} | Role: ${role}`,
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      `SCORES`,
      `Confidence:    ${r.confidence_score}%`,
      `Communication: ${r.communication_score}%`,
      `Technical:     ${r.technical_score}%`,
      '',
      'Q&A TRANSCRIPT',
      ...answers.map((a,i) => `Q${i+1}: ${a.question}\nA: ${a.answer}\nScore: ${a.score}/100\n`),
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }))
    a.download = `cognitive-echo-report.txt`
    a.click()
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10 pb-32 mt-16">
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider mb-4 uppercase">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"/>
          Analysis Complete
        </div>
        <h1 className="font-headline text-5xl font-extrabold tracking-tight text-on-background mb-4">
          Session Analysis Complete
        </h1>
        <p className="text-on-surface-variant max-w-2xl text-lg">
          Your cognitive footprint from the <strong className="text-on-surface">{role}</strong> interview has been mapped.
          Explore your performance metrics and AI-driven growth vectors below.
        </p>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <ScoreCard label="Confidence" icon="bolt" value={r.confidence_score} color="primary"/>
        <ScoreCard label="Communication" icon="forum" value={r.communication_score} color="primary"/>
        <ScoreCard label="Technical Depth" icon="terminal" value={r.technical_score} color="tertiary"/>
      </div>

      {/* Breakdown + Strengths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Competency bars */}
        <div className="bg-surface-container-low p-10 rounded-3xl">
          <h2 className="font-headline text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            Core Competency Breakdown
          </h2>
          <div className="space-y-6">
            {(r.competencies||[]).slice(0,5).map(c => (
              <div key={c.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="font-headline font-semibold text-on-surface">{c.name}</span>
                  <span className="text-on-surface-variant text-sm">{c.score}%</span>
                </div>
                <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container rounded-full transition-all duration-1000" style={{ width: `${c.score}%` }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths + Growth */}
        <div className="grid grid-rows-2 gap-8">
          <div className="bg-surface-container-high p-8 rounded-3xl border-l-4 border-primary">
            <h3 className="font-headline text-xl font-bold mb-4 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined">verified</span> Key Strengths
            </h3>
            <ul className="space-y-4">
              {(r.strengths||[]).map((s,i) => (
                <li key={i} className="flex gap-4">
                  <span className="material-symbols-outlined text-primary-container shrink-0">check_circle</span>
                  <p className="text-on-surface-variant text-sm">{s}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface-container-high p-8 rounded-3xl border-l-4 border-tertiary">
            <h3 className="font-headline text-xl font-bold mb-4 flex items-center gap-2 text-tertiary">
              <span className="material-symbols-outlined">trending_up</span> Growth Areas
            </h3>
            <ul className="space-y-4">
              {(r.growth_areas||[]).map((g,i) => (
                <li key={i} className="flex gap-4">
                  <span className="material-symbols-outlined text-tertiary shrink-0">priority_high</span>
                  <p className="text-on-surface-variant text-sm">{g}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* AI Coaching */}
      <section className="mb-12">
        <h2 className="font-headline text-2xl font-bold mb-8">Actionable AI Coaching</h2>
        <div className="space-y-6">
          {(r.coaching||[]).map((c,i) => (
            <div key={i} className="flex gap-6 items-start">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${i%2===0 ? 'bg-primary/20' : 'bg-tertiary/20'}`}>
                <span className={`material-symbols-outlined ${i%2===0 ? 'text-primary' : 'text-tertiary'}`}>
                  {i%2===0 ? 'auto_awesome' : 'psychology_alt'}
                </span>
              </div>
              <div className="bg-surface-container-low p-6 rounded-3xl asymmetric-bubble flex-1">
                <p className="text-on-surface mb-3 italic">"{c.tip}"</p>
                <div className="flex gap-2 flex-wrap">
                  {(c.tags||[]).map(t => (
                    <span key={t} className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-medium">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center py-10">
        <button onClick={handleNewInterview}
          className="px-8 py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg hover:shadow-[0_0_24px_rgba(192,193,255,0.4)] transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">refresh</span> New Interview
        </button>
        <button onClick={exportReport}
          className="px-8 py-4 rounded-full bg-surface-container-highest text-on-surface font-headline font-bold text-lg hover:bg-surface-bright transition-all border border-outline-variant/30 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">ios_share</span> Export Analysis
        </button>
      </div>
    </main>
  )
}
