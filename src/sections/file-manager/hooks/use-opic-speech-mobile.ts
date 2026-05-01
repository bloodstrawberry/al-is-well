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
  const isFirstStartRef = useRef(true);

  const userAnswersRef = useRef<Record<number, string>>({});
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

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

    // MediaRecorder 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // AudioContext 정리
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
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
    
    const timeoutDuration = 5000; // 5초

    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current !== null) {
        stopListening();
        toast.info('5초간 입력이 없어 종료합니다.');
      }
    }, timeoutDuration);
  }, [stopListening]);

  const startListening = useCallback(async (index: number) => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.warning('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    isManualStopRef.current = false;
    accumulatedTranscriptRef.current = '';
    isFirstStartRef.current = true;
    
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    try {
      // 1. 마이크 스트림 획득
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Web Audio API 설정 (마이크 입력 -> AudioContext -> MediaStreamDestination)
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();
      
      // 소스를 데스티네이션에 연결
      source.connect(destination);

      // 3. MediaRecorder 설정 (데스티네이션 스트림 사용)
      const mediaRecorder = new MediaRecorder(destination.stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudios((prev) => ({ ...prev, [index]: audioUrl }));
      };

      mediaRecorder.start();

      // 4. Speech Recognition 설정
      const recognition = new SpeechRecognitionCtor();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(index);
        setIsPreparing(false);
        if (isFirstStartRef.current) {
          resetSilenceTimer();
          isFirstStartRef.current = false;
        }
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer(); 
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const trimmedTranscript = transcript.trim();

        if (result.isFinal) {
          const currentAcc = accumulatedTranscriptRef.current.trim();
          if (trimmedTranscript && !currentAcc.toLowerCase().endsWith(trimmedTranscript.toLowerCase())) {
            accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + transcript).trim();
          }
          const fullText = accumulatedTranscriptRef.current;
          setUserAnswers((prev) => ({ ...prev, [index]: fullText }));
          if (inputRefs.current[index]) {
            inputRefs.current[index].value = fullText;
          }
        } else {
          const fullText = (accumulatedTranscriptRef.current + ' ' + transcript).trim();
          setUserAnswers((prev) => ({ ...prev, [index]: fullText }));
          if (inputRefs.current[index]) {
            inputRefs.current[index].value = fullText;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') return;
        if (event.error === 'not-allowed') {
          toast.error('마이크 권한이 거부되었습니다.');
          stopListening();
        }
      };

      recognition.onend = () => {
        if (!isManualStopRef.current && isListeningRef.current === index) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.start();
      setIsPreparing(true);
      if (inputRefs.current[index]) {
        inputRefs.current[index].focus();
      }
    } catch (err) {
      console.error('Error starting listening:', err);
      toast.error('마이크 접근 또는 녹음 시작에 실패했습니다.');
      setIsPreparing(false);
      stopListening();
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