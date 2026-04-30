'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export function useOpicSpeech() {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [recordedAudios, setRecordedAudios] = useState<Record<number, string>>({});
  const [isListening, setIsListening] = useState<number | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const inputRefs = useRef<Record<number, any>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isManualStopRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');

  const stopListening = useCallback(() => {
    isManualStopRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* already stopped */ }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) { /* already stopped */ }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsListening(null);
    setIsPreparing(false);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
      toast.info('3초간 입력이 없어 녹음을 종료합니다.');
    }, 3000);
  }, [stopListening]);

  const startListening = useCallback((index: number) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.warning('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 혹은 Safari 최신 버전을 사용해주세요.');
      return;
    }

    isManualStopRef.current = false;
    accumulatedTranscriptRef.current = '';

    // Cleanup previous
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch (e) { } }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { try { mediaRecorderRef.current.stop(); } catch (e) { } }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((t) => t.stop()); mediaStreamRef.current = null; }
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    // 1. Initialize SpeechRecognition
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(index);
      setIsPreparing(true);
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      resetSilenceTimer();

      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          accumulatedTranscriptRef.current += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const fullTranscript = (accumulatedTranscriptRef.current + interimTranscript).trim();
      setUserAnswers((prev) => ({ ...prev, [index]: fullTranscript }));
      
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = fullTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        toast.warning('마이크 권한이 거부되었습니다.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.warning(`인식 오류: ${event.error}`);
      }
      stopListening();
    };

    recognition.onend = () => {
      if (!isManualStopRef.current && isListening === index) {
        try {
          recognition.start();
        } catch (e) {
          stopListening();
        }
      } else {
        stopListening();
      }
    };

    // 2. Start SpeechRecognition
    try {
      recognition.start();
    } catch (e) {
      console.error('Recognition start failed', e);
      setIsListening(null);
    }

    // 3. Start MediaRecorder
    setTimeout(async () => {
      if (isManualStopRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            setRecordedAudios((prev) => {
              if (prev[index]) URL.revokeObjectURL(prev[index]);
              return { ...prev, [index]: audioUrl };
            });
          }
        };
        
        mediaRecorder.start();
        setIsPreparing(false);
        toast.info('준비되었습니다. 말씀해 주세요!');
      } catch (err) {
        console.warn('MediaRecorder setup failed', err);
        setIsPreparing(false);
      }
    }, 500);
  }, [isListening, resetSilenceTimer, stopListening]);

  const recordedAudiosRef = useRef<Record<number, string>>({});
  useEffect(() => {
    recordedAudiosRef.current = recordedAudios;
  }, [recordedAudios]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      // Revoke URLs only on unmount
      Object.values(recordedAudiosRef.current).forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      });
    };
  }, []);

  const playRecordedAudio = useCallback((index: number) => {
    // Toggle off if already playing the same one
    if (playingIndex === index && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setPlayingIndex(null);
      return;
    }

    // Stop previous if any
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    const url = recordedAudios[index];
    if (url) {
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      setPlayingIndex(index);
      audio.onended = () => {
        setPlayingIndex(null);
        currentAudioRef.current = null;
      };
      audio.play();
    }
  }, [recordedAudios, playingIndex]);

  const toggleSpeak = useCallback((text: string, index: number | string) => {
    if (speakingIndex === index && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
                    voices.find((v) => v.lang.startsWith('en')) ||
                    voices[0];
    if (enVoice) utterance.voice = enVoice;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    // Short delay to ensure cancel completes
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);
  }, [speakingIndex]);

  const resetStates = useCallback(() => {
    setUserAnswers({});
    setRecordedAudios((prev) => {
      Object.values(prev).forEach(url => URL.revokeObjectURL(url));
      return {};
    });
    setIsListening(null);
    setPlayingIndex(null);
    setSpeakingIndex(null);
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  return {
    userAnswers,
    setUserAnswers,
    recordedAudios,
    setRecordedAudios,
    isListening,
    isPreparing,
    playingIndex,
    speakingIndex,
    inputRefs,
    startListening,
    stopListening,
    playRecordedAudio,
    toggleSpeak,
    resetStates,
  };
}
