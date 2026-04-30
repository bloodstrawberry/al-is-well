'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'src/components/snackbar';

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
  const currentSessionTranscriptRef = useRef('');
  const isListeningRef = useRef<number | null>(null);

  // 현재 청취 중인 인덱스 동기화
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
        recognitionRef.current.stop();
        recognitionRef.current.onend = null; // 재시작 방지
      } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) { /* ignore */ }
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

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // 모바일은 네트워크 지연 등을 고려해 7초 정도로 약간 늘리는 것을 권장합니다.
    const timeoutDuration = 7000; 

    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current !== null) {
        stopListening();
        toast.info('7초간 입력이 없어 녹음을 종료합니다.');
      }
    }, timeoutDuration);
  }, [stopListening]);

  const startListening = useCallback(async (index: number) => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.warning('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    // 초기화
    isManualStopRef.current = false;
    accumulatedTranscriptRef.current = '';
    currentSessionTranscriptRef.current = '';
    audioChunksRef.current = [];

    // 기존 작업 정리
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) {}
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    setIsPreparing(true);

    try {
      // 1. 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      });
      mediaStreamRef.current = stream;

      // 2. AudioContext 설정 (VAD)
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;
      
      // iOS 대응: 사용자 제스처 후 resume 필수
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (isManualStopRef.current || isListeningRef.current === null) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 10) resetSilenceTimer(); // 문턱값 조정
        requestAnimationFrame(checkVolume);
      };
      checkVolume();

      // 3. MediaRecorder 설정 (MIME Type 체크)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4'; // iOS/Safari 대응
      
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

      // 4. SpeechRecognition 설정
      const recognition = new SpeechRecognitionCtor();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = true; // 모바일 끊김 방지를 위해 true 권장
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(index);
        setIsPreparing(false);
        resetSilenceTimer();
        // 인식이 시작되면 녹음도 시작
        if (mediaRecorder.state === 'inactive') mediaRecorder.start();
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer();
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            accumulatedTranscriptRef.current += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const fullTranscript = (accumulatedTranscriptRef.current + interimTranscript).trim();
        setUserAnswers((prev) => ({ ...prev, [index]: fullTranscript }));
        if (inputRefs.current[index]) inputRefs.current[index].value = fullTranscript;
      };

      recognition.onerror = (event: any) => {
        console.error('Recognition Error:', event.error);
        if (event.error === 'no-speech') return; // 무시 후 계속 진행
        stopListening();
      };

      recognition.onend = () => {
        // 수동 종료가 아니고 여전히 이 인덱스라면 재시작 시도 (모바일 연결 끊김 대비)
        if (!isManualStopRef.current && isListeningRef.current === index) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.start();

    } catch (err) {
      console.error('Setup failed:', err);
      setIsPreparing(false);
      toast.warning('마이크 권한을 허용해 주세요.');
    }
  }, [resetSilenceTimer, stopListening]);

  // 재생 로직 개선 (Audio 객체 재사용 방지 및 메모리 해제)
  const playRecordedAudio = useCallback((index: number) => {
    if (playingIndex === index && currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingIndex(null);
      return;
    }

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
      };
      
      // 모바일에서 play()는 Promise를 반환하므로 catch 처리 필수
      audio.play().catch(e => {
        console.error("Playback failed", e);
        setPlayingIndex(null);
      });
    }
  }, [recordedAudios, playingIndex]);

  // TTS 및 기타 함수 유지...
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