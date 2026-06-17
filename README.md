# Cognitive Echo - AI Interviewer

![Cognitive Echo](https://img.shields.io/badge/Status-Active-success)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

**Cognitive Echo** is an advanced, AI-powered interviewing platform designed to simulate realistic job interviews. It dynamically parses candidate resumes, generates tailored questions, and provides a real-time conversational voice experience. Post-interview, it generates a comprehensive performance report with actionable coaching tips.

## 🚀 Built for Digital Heroes
[Visit Digital Heroes Co.](https://digitalheroesco.com)

---

## 🌟 Key Features

- **📄 Smart Resume Parsing:** Upload a PDF resume, and the AI will analyze skills, experience, and projects to adapt the interview questions contextually.
- **🗣️ Dynamic Conversational AI:** Integrates with ElevenLabs to provide a stunningly realistic voice-first interview experience. The agent adapts to candidate responses in real-time.
- **🌐 Multilingual Support:** Supports English, Hindi, and Hinglish.
- **📊 Detailed Performance Reports:** Once the interview is complete, receive a breakdown of your Confidence, Communication, and Technical Depth, alongside identified Strengths and Growth Areas.
- **🔌 100% Offline Mode (Optional):** Run completely localized via Llama-3 and Whisper without the need for API keys.

---

## 🛠️ Tech Stack
- **Frontend:** React, Vite, Tailwind CSS
- **AI Integration:** Google Gemini API (gemini-3.1-flash-lite), ElevenLabs Conversational AI
- **Parsing:** PDF.js (Local text extraction)
- **Deployment:** Ready for Vercel

---

## 💻 Running Locally

To run this application on your local machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Krishkalia/Ai-Interviewer.git
   cd Ai-Interviewer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` or `.env.local` file in the root directory and add the following keys (Optional, you can also paste them directly into the app UI):
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to `http://localhost:5173`

---

## 👨‍💻 Developer Information

**Krish Kalia**
- 📞 Phone: 8360754129
- 📧 Email: [krishkaliajal10@gmail.com](mailto:krishkaliajal10@gmail.com)
- 🐙 GitHub: [https://github.com/Krishkalia/Ai-Interviewer](https://github.com/Krishkalia/Ai-Interviewer)

*This project was developed entirely with zero expenditures using free-tier services.*
