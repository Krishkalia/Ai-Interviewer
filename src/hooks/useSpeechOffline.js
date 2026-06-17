import { useState, useCallback, useRef, useEffect } from 'react';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { pipeline, env } from '@xenova/transformers';
import { useApp } from '../context/AppContext';

// Local storage for models
env.allowLocalModels = false;
env.useBrowserCache = true;

export function useSpeechOffline() {
  const { lang, role, resumeData, setConvError, setModelProgress, selectedMic } = useApp();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | loading | connected | disconnected
  const [isMuted, setIsMuted] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const engineRef = useRef(null);
  const sttRef = useRef(null);
  const ttsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Audio Context for playback
  const audioCtxRef = useRef(null);

  const initEngine = useCallback(async () => {
    if (engineRef.current && sttRef.current) {
        setStatus('connected');
        return;
    }
    setStatus('loading');
    try {
      // 0. Detect GPU Capabilities
      const adapter = await navigator.gpu?.requestAdapter();
      const hasF16 = adapter?.features?.has("shader-f16");
      console.log('WebGPU f16 support:', hasF16);

      // 1. LLM Engine (Phi-3.5-mini-instruct) 
      // Optimized for speed on GTX 1070
      const selectedModel = hasF16 
        ? "Phi-3.5-mini-instruct-q4f16_1-MLC" 
        : "Phi-3.5-mini-instruct-q4f32_1-MLC";
      
      engineRef.current = await CreateMLCEngine(selectedModel, {
        initProgressCallback: (report) => {
           const progress = Math.round(report.progress * 100);
           setModelProgress(progress);
        }
      });

      // 2. STT (Whisper Tiny) - Instant for GTX 1070
      sttRef.current = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');

      // 3. TTS (VITS) with Fallback
      try {
        ttsRef.current = await pipeline('text-to-speech', 'Xenova/vits-ljspeech', {
          device: 'webgpu'
        });
      } catch (e) {
        ttsRef.current = 'browser';
      }

      setStatus('connected');
    } catch (err) {
      console.error('Offline AI Init Error:', err);
      setConvError(err.message || 'Failed to load offline models');
      setStatus('disconnected');
    }
  }, [setConvError, setModelProgress]);

  // Utility: Convert Blob to AudioBuffer for Whisper
  const blobToFloat32Array = async (blob) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0);
  };

  const startRecording = useCallback(async () => {
    if (!sttRef.current || isMuted) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true 
      });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        setIsUserSpeaking(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioData = await blobToFloat32Array(audioBlob);
        
        // Transcription
        const transcription = await sttRef.current(audioData, { 
            language: lang.toLowerCase().includes('hindi') ? 'hindi' : 'english',
            task: 'transcribe'
        });
        
        const text = transcription.text.trim();
        if (text && text.length > 2) {
          setTranscript(text);
          setHistory(prev => [...prev, { role: 'user', text }]);
          processAIResponse(text);
        }
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      setIsUserSpeaking(true);
    } catch (err) {
      console.error('Recording Error:', err);
    }
  }, [sttRef, isMuted, selectedMic, lang]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const processAIResponse = useCallback(async (userInput) => {
    if (!engineRef.current) return;
    setIsSpeaking(true);
    setStreamingText('Thinking...');
    try {
       const firstName = resumeData?.name?.split(' ')[0] || 'Candidate';
       const systemPrompt = `You are Ava, a senior interviewer for ${role} position. Candidate: ${firstName}. Resume: ${JSON.stringify(resumeData)}. 
       Goal: Conduct a professional 5-question interview. Start by acknowledging the user's input. Ask only one question at a time. Keep responses concise.`;
       
       const messages = [
         { role: 'system', content: systemPrompt },
         ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
         { role: 'user', content: userInput }
       ];

       const chunks = await engineRef.current.chat.completions.create({ messages, stream: true });
       let fullText = "";
       for await (const chunk of chunks) {
         const delta = chunk.choices[0]?.delta?.content || "";
         fullText += delta;
         setStreamingText(fullText);
       }
       
       setHistory(prev => [...prev, { role: 'agent', text: fullText }]);
       setQuestionCount(prev => prev + 1);
       setStreamingText('');
       
       await speakText(fullText);
    } catch (err) {
       console.error('LLM Error:', err);
       setStreamingText('');
    } finally {
       setIsSpeaking(false);
    }
  }, [history, role, resumeData, questionCount]);

  const speakText = useCallback(async (text) => {
    if (!ttsRef.current) return;
    setIsSpeaking(true);
    try {
      if (ttsRef.current === 'browser') {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
      const result = await ttsRef.current(text);
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      const audioBuffer = audioCtxRef.current.createBuffer(1, result.audio.length, result.sampling_rate);
      audioBuffer.getChannelData(0).set(result.audio);
      
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtxRef.current.destination);
      source.onended = () => setIsSpeaking(false);
      source.start();
    } catch (err) {
      console.error('TTS Error:', err);
      setIsSpeaking(false);
    }
  }, []);

  // Session Initiation
  const startSession = useCallback(async () => {
    await initEngine();
    const greet = `I've initialized. Shall we begin the interview?`;
    setHistory([{ role: 'agent', text: greet }]);
    await speakText(greet);
  }, [initEngine, role, speakText]);

  // VAD Simulation
  useEffect(() => {
      if (status === 'connected' && !isSpeaking && !isListening && !isMuted) {
          startRecording();
      } else if (isSpeaking || isMuted) {
          stopRecording();
      }
  }, [isSpeaking, isListening, status, isMuted, startRecording, stopRecording]);

  return {
    startSession,
    stopSession: () => setStatus('disconnected'),
    isSpeaking,
    isListening,
    isUserSpeaking,
    transcript,
    history,
    questionCount,
    status,
    isMuted,
    setMuted: setIsMuted,
    streamingText
  };
}


