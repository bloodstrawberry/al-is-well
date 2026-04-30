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
        recognitionRef.current.onresult = null; // 결과 전송 차단
        recognitionRef.current.stop();
      } catch (e) { /* 이미 중지됨 */ }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) { /* 이미 중지됨 */ }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(null);
    setIsPreparing(false);
  }, []);

  // 2. 5초 침묵 타이머 (핵심 수정 사항)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    const timeoutDuration = 5000; // 5초

    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current !== null) {
        stopListening();
        toast.info('5초간 입력이 없어 녹음을 종료합니다.');
      }
    }, timeoutDuration);
  }, [stopListening]);

  // 3. 리스닝 시작
  const startListening = useCallback(async (index: number) => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.warning('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    // 초기화
    isManualStopRef.current = false;
    accumulatedTranscriptRef.current = '';
    audioChunksRef.current = [];

    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    setIsPreparing(true);

    // AudioContext (VAD 용) - 사용자 제스처 직후 바로 resume (iOS 정책 대응)
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextCtor();
    audioContextRef.current = audioContext;
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    try {
      // 마이크 권한 및 스트림
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      mediaStreamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (isManualStopRef.current || isListeningRef.current === null) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 8) resetSilenceTimer(); // 문턱값을 8로 낮춰 민감도 상향
        requestAnimationFrame(checkVolume);
      };
      checkVolume();

      // 🚨 임시 비활성화: 모바일 마이크 권한 충돌 원인 파악을 위해 녹음 기능(MediaRecorder) 임시 중단
      /*
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudios((prev) => {
          if (prev[index]) URL.revokeObjectURL(prev[index]);
          return { ...prev, [index]: audioUrl };
        });
      };

      // 즉시 녹음 시작 (모바일 마이크 충돌 방지)
      mediaRecorder.start();
      */

      setIsListening(index);
      setIsPreparing(false);
      resetSilenceTimer();

      // Speech Recognition 설정 (텍스트 입력 핵심)
      const recognition = new SpeechRecognitionCtor();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = true; // 모바일 끊김 방지
      recognition.interimResults = true;

      recognition.onstart = () => {
        // 이미 위에서 상태 업데이트 완료
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer(); // 단어 하나라도 인식되면 타이머 리셋
        
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          sessionTranscript += event.results[i][0].transcript;
        }

        const fullTranscript = (accumulatedTranscriptRef.current + ' ' + sessionTranscript).trim();

        // 1. 상태 업데이트 (UI 갱신용)
        setUserAnswers((prev) => ({ ...prev, [index]: fullTranscript }));
        
        // 2. Ref 직접 업데이트 (입력 지연 방지용)
        if (inputRefs.current[index]) {
          inputRefs.current[index].value = fullTranscript;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') return;
        // 에러 발생 시 완전 종료하지 않고 녹음은 유지 (모바일 안정성)
      };

      recognition.onend = () => {
        // 현재까지의 텍스트를 누적
        const currentText = (userAnswersRef.current[index] || '');
        accumulatedTranscriptRef.current = currentText;

        // 비정상적 종료 시 재시작 (모바일 대응)
        if (!isManualStopRef.current && isListeningRef.current === index) {
          try { recognition.start(); } catch (e) {}
        }
      };

      // 지연 시작 (MediaRecorder 비활성화로 딜레이 축소)
      setTimeout(() => {
        if (isManualStopRef.current) return;
        try { recognition.start(); } catch (e) {}
      }, 100);

    } catch (err) {
      console.error(err);
      setIsPreparing(false);
      toast.warning('마이크 권한을 허용해 주세요.');
    }
  }, [resetSilenceTimer, stopListening]);

  // ... 나머지 playRecordedAudio, toggleSpeak, resetStates 로직은 이전과 동일

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