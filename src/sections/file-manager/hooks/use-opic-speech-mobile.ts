'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    webkitAudioContext: any;
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
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isManualStopRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const isListeningRef = useRef<number | null>(null);

  const userAnswersRef = useRef<Record<number, string>>({});
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // 1. 중지 함수
  const stopListening = useCallback(() => {
    isManualStopRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
      } catch (e) { /* 이미 중지됨 */ }
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsListening(null);
    setIsPreparing(false);
  }, []);

  // 2. 10초 침묵 타이머 (테스트를 위해 10초로 연장)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    const timeoutDuration = 10000; // 10초

    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current !== null) {
        stopListening();
        toast.info('10초간 입력이 없어 종료합니다.');
      }
    }, timeoutDuration);
  }, [stopListening]);

  // 3. 리스닝 시작 (가장 단순한 구조로 변경)
  const startListening = useCallback((index: number) => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.warning('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    // 초기화
    isManualStopRef.current = false;
    accumulatedTranscriptRef.current = '';
    
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    // 🌟 핵심: User Gesture 유지를 위해 setTimeout이나 await 없이 즉시 실행
    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(index);
      setIsPreparing(false);
      resetSilenceTimer();
      toast.success('음성 인식이 시작되었습니다. 말씀해 주세요.');
    };

    recognition.onresult = (event: any) => {
      resetSilenceTimer(); 
      
      let sessionTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        sessionTranscript += event.results[i][0].transcript;
      }

      const fullTranscript = (accumulatedTranscriptRef.current + ' ' + sessionTranscript).trim();
      setUserAnswers((prev) => ({ ...prev, [index]: fullTranscript }));
      
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = fullTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('마이크 권한이 거부되었습니다.');
      }
      stopListening();
    };

    recognition.onend = () => {
      const currentText = (userAnswersRef.current[index] || '');
      accumulatedTranscriptRef.current = currentText;

      if (!isManualStopRef.current && isListeningRef.current === index) {
        try { recognition.start(); } catch (e) {}
      }
    };

    try {
      recognition.start();
      setIsPreparing(true);
      if (inputRefs.current[index]) {
        inputRefs.current[index].focus();
      }
    } catch (err) {
      console.error('Recognition start failed:', err);
      toast.error('음성 인식 시작에 실패했습니다.');
    }
  }, [resetSilenceTimer, stopListening]);

  const playRecordedAudio = useCallback((index: number) => {
    if (playingIndex === index && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingIndex(null);
      return;
    }
    if (currentAudioRef.current) currentAudioRef.current.pause();

    const url = recordedAudios[index];
    if (url) {
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      setPlayingIndex(index);
      audio.onended = () => setPlayingIndex(null);
      audio.play().catch(() => setPlayingIndex(null));
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
    utterance.onend = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
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