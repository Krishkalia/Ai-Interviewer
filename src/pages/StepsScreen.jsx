import { useApp } from '../context/AppContext'

export default function StepsScreen() {
  const { setScreen } = useApp()

  return (
    <main className="min-h-screen pt-24 pb-28 px-6 relative bg-grid-subtle">
      {/* Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full"/>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary blur-[120px] rounded-full opacity-50"/>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-14">
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tighter mb-4">
            Welcome to Cognitive Echo
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto leading-relaxed">
            Your personal AI interviewer. We parse your resume, ask tailored questions, and give a comprehensive report on your performance including your strengths and weaknesses.
          </p>
        </div>

        <div className="bg-surface-container-low p-8 md:p-12 rounded-[2rem] shadow-xl border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/10 pb-6">
            <span className="material-symbols-outlined text-primary text-3xl">integration_instructions</span>
            <h2 className="font-headline text-2xl md:text-3xl font-bold">How to use it</h2>
          </div>

          <div className="space-y-8 font-body">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">1</div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Fill your API Key and Agent ID</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Provide your Gemini API Key and ElevenLabs Agent ID. <span className="font-semibold text-green-400">Rest assured, your API keys are never stored and it is completely safe locally.</span>
                </p>
                <p className="text-on-surface-variant leading-relaxed mt-2 font-medium">
                  <span className="text-primary font-bold">OR</span> enable <strong>100% Offline Mode</strong> by Llama without needing any API keys.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">2</div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Add your Resume</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Upload your resume in PDF format. We will parse it to generate personalized interview questions based on your background and experience.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">3</div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Choose Role and Language</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Select your target job role and preferred language for the interview. 
                  <span className="block mt-2 text-sm italic opacity-80 text-secondary">Note: The language only works if you have configured it in your ElevenLabs agent. English is the default.</span>
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">4</div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Start Interview</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Click on "Start Interview". The AI will dynamically adjust to your responses in real-time.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">5</div>
              <div>
                <h3 className="text-lg font-bold text-on-surface mb-2">Review Your Report</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  After completing the interview, we will generate a detailed report outlining your performance, highlighting your strengths, and identifying areas for improvement.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setScreen('prepare')}
              className="px-12 py-5 bg-gradient-to-r from-[#c0c1ff] to-[#8083ff] rounded-full text-[#1000a9] font-headline font-extrabold text-xl tracking-wide neon-glow hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}


