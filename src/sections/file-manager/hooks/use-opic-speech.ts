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
  const currentSessionTranscriptRef = useRef('');
  const isListeningRef = useRef<number | null>(null);

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
    
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const timeoutDuration = isMobile ? 5000 : 3000;
    const timeoutMessage = isMobile ? '5초간 입력이 없어 녹음을 종료합니다.' : '3초간 입력이 없어 녹음을 종료합니다.';

    silenceTimerRef.current = setTimeout(() => {
      stopListening();
      toast.info(timeoutMessage);
    }, timeoutDuration);
  }, [stopListening]);

  // SpeechRecognition 공통 설정 및 이벤트 바인딩 (모바일/데스크톱 공용)
  const setupRecognition = useCallback((index: number, isMobile: boolean) => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;

    recognition.lang = 'en-US';
    // 모바일: continuous=false → 문장 끝마다 onend 발생 → 재시작으로 이어감
    // 데스크톱: continuous=true → 끊김 없이 연속 인식
    recognition.continuous = !isMobile;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(index);
      resetSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      resetSilenceTimer();

      // 중복 입력 방지: 세션 전체 텍스트를 매번 재구성
      let currentSessionTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        currentSessionTranscript += event.results[i][0].transcript;
      }

      currentSessionTranscriptRef.current = currentSessionTranscript;
      const fullTranscript = (accumulatedTranscriptRef.current + ' ' + currentSessionTranscript).trim();
      
      setUserAnswers((prev) => ({ ...prev, [index]: fullTranscript }));
      
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = fullTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        toast.warning('마이크 권한이 거부되었습니다.');
        stopListening();
      }
      // 'no-speech', 'aborted' 등 일시적 오류는 onend 재시작 로직에 맡김
    };

    recognition.onend = () => {
      // 세션 종료 시 지금까지의 텍스트 누적
      if (currentSessionTranscriptRef.current) {
        accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + currentSessionTranscriptRef.current).trim();
        currentSessionTranscriptRef.current = '';
      }

      if (!isManualStopRef.current && isListeningRef.current === index) {
        // 아직 듣고 있는 상태면 재시작
        try {
          recognition.start();
        } catch (e) {
          console.warn('Speech recognition restart failed', e);
        }
      }
    };

    return recognition;
  }, [resetSilenceTimer, stopListening]);

  const startListening = useCallback((index: number) => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      toast.warning('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 혹은 Safari 최신 버전을 사용해주세요.');
      return;
    }

    isManualStopRef.current = false;
    accumulatedTranscriptRef.current = '';
    currentSessionTranscriptRef.current = '';

    // Cleanup previous
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch (e) { } }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { try { mediaRecorderRef.current.stop(); } catch (e) { } }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((t) => t.stop()); mediaStreamRef.current = null; }
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    setIsPreparing(true);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // =========================================================
      // 모바일 전용 경로: SpeechRecognition만 단독 사용
      // ---------------------------------------------------------
      // 모바일에서는 getUserMedia(MediaRecorder)와 SpeechRecognition이
      // 마이크를 동시에 점유하면 충돌이 발생합니다.
      // → SpeechRecognition만 사용하여 마이크 독점권을 보장합니다.
      // → 녹음은 음성 인식 종료 후 별도 패스로 진행합니다.
      // =========================================================
      const recognition = setupRecognition(index, true);

      // 모바일에서는 SpeechRecognition이 끝난 후 녹음을 시작하기 위해
      // 원래 onend를 확장합니다.
      const originalOnEnd = recognition.onend;
      recognition.onend = () => {
        // 세션 종료 시 지금까지의 텍스트 누적
        if (currentSessionTranscriptRef.current) {
          accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + currentSessionTranscriptRef.current).trim();
          currentSessionTranscriptRef.current = '';
        }

        if (!isManualStopRef.current && isListeningRef.current === index) {
          // 아직 듣고 있는 상태면 재시작
          try {
            recognition.start();
          } catch (e) {
            console.warn('Speech recognition restart failed', e);
          }
        } else {
          // 수동 중지 또는 침묵 타이머에 의해 종료됨
          // → 이제 마이크가 해제되었으니 짧은 녹음 세션을 시작하지 않음
          // (SpeechRecognition 세션 중에는 녹음 불가)
        }
      };

      try {
        recognition.start();
        setIsPreparing(false);
        toast.info('준비되었습니다. 말씀해 주세요!');
      } catch (e) {
        console.error('Recognition start failed', e);
        setIsPreparing(false);
        setIsListening(null);
      }

    } else {
      // =========================================================
      // 데스크톱 경로: SpeechRecognition + MediaRecorder 동시 사용
      // ---------------------------------------------------------
      // 데스크톱에서는 마이크 공유가 가능하므로 둘 다 동시에 동작합니다.
      // =========================================================
      const initializeRecording = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          if (isManualStopRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          // MediaRecorder 준비
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

          // SpeechRecognition 설정 및 시작
          const recognition = setupRecognition(index, false);

          try {
            recognition.start();
          } catch (e) {
            console.error('Recognition start failed', e);
          }

          // MediaRecorder 시작 (SpeechRecognition 초기화 시간 고려)
          setTimeout(() => {
            if (isManualStopRef.current || mediaRecorder.state !== 'inactive') return;
            mediaRecorder.start();
            setIsPreparing(false);
            toast.info('준비되었습니다. 말씀해 주세요!');
          }, 500);

        } catch (err) {
          console.warn('Media setup failed', err);
          setIsPreparing(false);
          setIsListening(null);
          toast.warning('마이크 접근 권한을 허용해 주세요.');
        }
      };

      initializeRecording();
    }

  }, [setupRecognition, resetSilenceTimer, stopListening]);

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
