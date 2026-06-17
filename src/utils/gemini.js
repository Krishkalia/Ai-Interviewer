// ── Gemini API helpers ─────────────────────────────────
// Using gemini-3.1-flash-lite because your API key grants 14,000+ daily requests for it!
const MODEL = 'gemini-3.1-flash-lite'

async function callGemini(prompt, apiKey, asJson = true, retries = 2) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  
  if (!res.ok) {
    const err = await res.json()
    const msg = err.error?.message || 'Gemini API error'
    if (res.status === 429 && retries > 0) {
      console.warn('Google Free Tier limit hit. Waiting 8s to retry...', msg)
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds to satisfy the 20 RPM cooldown
      return callGemini(prompt, apiKey, asJson, retries - 1)
    }
    throw new Error(msg)
  }
  const data = await res.json()
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No candidate returned from API.')
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(`API blocked response (Reason: ${candidate.finishReason})`)
  }
  
  const raw = candidate.content?.parts?.[0]?.text || ''
  if (!raw.trim()) throw new Error('API returned an empty text response.')

  if (asJson) {
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim()
      return JSON.parse(cleaned)
    } catch (e) {
      console.error('Failed to parse JSON:', raw)
      throw new Error('API returned malformed JSON.')
    }
  }
  return raw.trim()
}

// Step 1 — Resume Analyzer
export async function analyzeResume(resumeText, apiKey) {
  const prompt = `You are an expert technical recruiter analyzing a resume for an interview simulation.
Return ONLY valid JSON — no markdown, no explanation:
{
  "name": "candidate full name",
  "skills": ["skill1","skill2"],
  "projects": [{"name":"","description":"one sentence","technologies":[]}],
  "experience_level": "beginner|intermediate|advanced",
  "target_roles": ["role1","role2"],
  "strengths": ["strength1","strength2","strength3"],
  "weaknesses": ["weakness1","weakness2"]
}
Rules: keep all values concise (max 10 words). Infer experience_level from education+projects+skills depth.
Resume:
${resumeText.substring(0, 6000)}`
  return callGemini(prompt, apiKey, true)
}

// Step 2 — Question Generator
export async function generateQuestions(resumeData, role, lang, apiKey) {
  const prompt = `You are a senior ${role} interviewer. Generate exactly 5 interview questions based on this candidate.
Return ONLY a JSON array of 5 strings. Mix: 1 warm intro, 2 technical, 1 behavioral, 1 challenging deep-dive.

LANGUAGE: The interview is in ${lang}. 
- If Hindi: Generate questions in Hindi (Devanagari script).
- If Hinglish: Use a natural mix of Hindi and English written in Latin script (e.g., "Aapka project management experience kaisa raha?").
- If English: Use English.

IMPORTANT for VOICE: 
Keep questions highly conversational and natural. 
Use "..." for brief pauses. 
Include natural fillers (e.g. "Hmm...", "Well,", "Wow!") and emotional markers like (laughs), [sigh], [breath], or [gasp] occasionally to sound human.

Candidate: ${JSON.stringify({ name: resumeData.name, skills: resumeData.skills?.slice(0,6), projects: resumeData.projects?.slice(0,3), experience_level: resumeData.experience_level })}
Role: ${role}
Return only: ["question1","question2","question3","question4","question5"]`
  const result = await callGemini(prompt, apiKey, true)
  return Array.isArray(result) ? result : result.questions || []
}

// Step 3 — Answer Evaluator
export async function evaluateAnswer(question, answer, emotion, lang, resumeData, apiKey) {
  if (!answer || answer.trim().length < 5) {
    const fallback = lang === 'Hindi' ? "Thoda aur btaiye... [breath]" : lang === 'Hinglish' ? "Thoda aur elaborate kijiye... [breath]" : "Take your time — want to give that another try? [breath]"
    return { score: 20, follow_up: fallback, coaching: 'Answer too short.' }
  }
  const prompt = `You are an AI interviewer evaluating an answer. Return ONLY JSON:
{
  "score": 0-100,
  "follow_up": "one short natural follow-up or reaction (max 30 words, highly conversational)",
  "coaching": "one private coaching note for the final report"
}

LANGUAGE: The response must be in ${lang}.
- If Hindi: Use Devanagari script.
- If Hinglish: Use a mix of Hindi/English in Latin script.

IMPORTANT for VOICE:
Use "..." for pauses. Use exclamation marks for energy.
Include conversational markers like (laughs), [sigh], [breath], or [gasp] where appropriate.

Question: "${question}"
Answer: "${answer.substring(0, 500)}"
Candidate emotion: ${emotion}
Experience level: ${resumeData.experience_level}
Rules: if nervous → supportive follow_up. If confident → slightly challenging. If weak → guide gently. If strong → go deeper.`
  return callGemini(prompt, apiKey, true)
}

// Step 6 — Final Report
export async function generateReport(history, resumeData, role, apiKey) {
  const prompt = `Generate a final interview performance report. Analyze the following conversation transcript. Return ONLY JSON:
{
  "confidence_score": 0-100,
  "communication_score": 0-100,
  "technical_score": 0-100,
  "competencies": [{"name":"skill","score":0-100}],
  "strengths": ["observed strength based on transcript"],
  "growth_areas": ["area to improve based on transcript"],
  "coaching": [{"tip":"actionable coaching tip","tags":["tag1","tag2"]}]
}
Candidate: ${resumeData.name}, ${resumeData.experience_level}, role: ${role}
TRANSCRIPT:
${JSON.stringify(history)}`
  return callGemini(prompt, apiKey, true)
}
