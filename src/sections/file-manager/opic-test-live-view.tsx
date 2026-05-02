'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { getFileScript, getTreeData, saveFileScript } from 'src/api/indexDB';
import { toast } from 'src/components/snackbar';
import { getIsMobile } from 'src/utils/is-mobile';
import { useOpicSpeech } from './hooks/use-opic-speech';
import { OpicScriptItem } from './opic-script-item';

// ----------------------------------------------------------------------

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type PlaylistData = {
  fileIds: string[];
  audioUrlPriority?: boolean;
  randomPlay?: boolean;
  playQuestion?: boolean;
};

type Props = {
  fileId: string;
  fileName: string;
  onBack: () => void;
  onEdit: () => void;
  storageKey?: string;
};

export function OpicTestLiveView({ fileId, fileName, onBack, onEdit, storageKey }: Props) {
  const theme = useTheme();

  const isMobile = getIsMobile();

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scriptData, setScriptData] = useState<any>(null);
  const [currentFileName, setCurrentFileName] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingScript, setLoadingScript] = useState(false);

  const [revealedLines, setRevealedLines] = useState<Record<string, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [audioReady, setAudioReady] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [autoPlay, setAutoPlay] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('opic-auto-play');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const {
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
  } = useOpicSpeech();

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const [testResults, setTestResults] = useState<Record<number, { uWord: string; cWord: string; isCorrect: boolean; masked: string }[]>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  // Pre-load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => { window.speechSynthesis.getVoices(); };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // 1. Load Playlist
  useEffect(() => {
    const loadPlaylist = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId, storageKey);
        const playlistWithDefaults = data && data.fileIds ? {
          ...data,
          audioUrlPriority: data.audioUrlPriority ?? true,
          randomPlay: data.randomPlay ?? false,
          playQuestion: data.playQuestion ?? true,
        } : { 
          fileIds: [fileId],
          audioUrlPriority: true,
          randomPlay: false,
          playQuestion: true,
        };

        const ids = playlistWithDefaults.fileIds;
        let order = Array.from({ length: ids.length }, (_, i) => i);
        
        if (playlistWithDefaults.randomPlay && ids.length > 1) {
          // Fisher-Yates Shuffle
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
        }

        setPlayOrder(order);
        setPlaylist(playlistWithDefaults);
        setCurrentIndex(0);
        
        // Ensure testMode is TRUE for listening mode to enable blur/reveal
        if (storageKey === 'listening') {
          setTestMode(true);
        }
      } catch (error) {
        console.error('Failed to load playlist', error);
      } finally {
        setLoading(false);
      }
    };
    loadPlaylist();
  }, [fileId, storageKey]);

  // 2. Load Current Script
  useEffect(() => {
    const loadCurrentScript = async () => {
      if (!playlist || playlist.fileIds.length === 0 || playOrder.length === 0) return;

      const currentFileIdx = playOrder[currentIndex];
      const currentId = playlist.fileIds[currentFileIdx];
      setLoadingScript(true);
      setAudioReady(false);
      setIsSwitching(true);
      sequenceRef.current = 'idle';
      
      // Reset item-specific states when switching scripts
      setRevealedLines({});
      setAllRevealed(false);
      setUserAnswers({});
      setTestResults({});
      setRevealedAnswers({});
      setRecordedAudios({});

      try {
        const data = await getFileScript(currentId);
        
        // Try current section tree first, then main DRIVE tree
        const treeSection = await getTreeData(storageKey);
        const treeMain = await getTreeData();
        
        const findName = (nodes: any[]): string => {
          for (const node of nodes) {
            if (node.id === currentId) return node.label;
            if (node.children) {
              const res = findName(node.children);
              if (res) return res;
            }
          }
          return '';
        };

        const nameFromSection = findName(treeSection);
        if (nameFromSection) {
          setCurrentFileName(nameFromSection);
        } else {
          const nameFromMain = findName(treeMain);
          setCurrentFileName(nameFromMain || 'Untitled');
        }

        if (data && !data.questions && (data.questionEn || data.question)) {
          data.questions = [{
            en: data.questionEn || data.question || '',
            ko: data.questionKo || ''
          }];
        }
        setScriptData(data);
      } catch (error) {
        console.error('Failed to load script', error);
        toast.error('스크립트를 불러오는데 실패했습니다.');
      } finally {
        setLoadingScript(false);
        // Delay clearing switching flag slightly to ensure UI and effects settle
        setTimeout(() => {
          setIsSwitching(false);
        }, 300);
      }
    };
    loadCurrentScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, currentIndex, playOrder]);

  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const domAudioRef = useRef<HTMLAudioElement | null>(null);
  const sequenceRef = useRef<'idle' | 'question' | 'content'>('idle');
  const playingRef = useRef<HTMLDivElement | null>(null);

  // Use refs to avoid stale closures in callbacks
  const playlistRef = useRef<PlaylistData | null>(null);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    if (playingRef.current) {
      playingRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [speakingIndex, currentLineIndex, isAudioPlaying]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const handleNextPlaylist = useCallback(() => {
    const currentPlaylist = playlistRef.current;
    if (!currentPlaylist) return;
    
    const { fileIds } = currentPlaylist;
    if (fileIds.length <= 1) return;

    setCurrentLineIndex(null); // Reset line index
    setCurrentIndex((prev) => (prev + 1) % fileIds.length);
  }, []);

  const toggleRandomPlay = async () => {
    if (!playlist) return;
    const newRandomPlay = !playlist.randomPlay;
    
    // Update order
    let newOrder = Array.from({ length: playlist.fileIds.length }, (_, i) => i);
    const currentFileIdx = playOrder[currentIndex];

    if (newRandomPlay) {
      // Shuffle
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
      // Move current file to current position if possible to avoid jump
      const pos = newOrder.indexOf(currentFileIdx);
      if (pos !== -1) {
        [newOrder[currentIndex], newOrder[pos]] = [newOrder[pos], newOrder[currentIndex]];
      }
    } else {
      // Restore sequential, but set currentIndex to where the current file is
      setCurrentIndex(currentFileIdx);
    }

    setPlayOrder(newOrder);
    const newPlaylist = { ...playlist, randomPlay: newRandomPlay };
    setPlaylist(newPlaylist);
    try {
      await saveFileScript(fileId, newPlaylist, storageKey);
    } catch (error) {
      console.error('Failed to save random play state', error);
    }
  };

  const playLine = useCallback((index: number) => {
    if (!scriptData || !scriptData.lines || index >= scriptData.lines.length) {
      return;
    }

    setCurrentLineIndex(index);
    const line = scriptData.lines[index];
    toggleSpeak(line.en, `auto-content-line-${index}`);
  }, [scriptData, toggleSpeak]);

  const playContent = useCallback(() => {
    if (!scriptData) return;
    
    // Stop any existing speech/audio before starting
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsAudioPlaying(false);

    sequenceRef.current = 'content';

    const useAudioUrl = !!(playlist?.audioUrlPriority && scriptData.audioUrl);

    if (useAudioUrl) {
      // Use the actual DOM audio element if available
      const audio = domAudioRef.current;
      if (audio) {
        try {
          // If already playing or paused in the middle, just play (resume)
          // audio.currentTime will stay at its current position if we don't reset it
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
               console.warn("Audio play prevented or failed", error);
               // If play fails (e.g. source error), fallback to speech
               playLine(0);
            });
          }
        } catch (err) {
          console.warn("Audio playback failed", err);
          playLine(0);
        }
      } else {
        // Fallback to legacy behavior if DOM element is not yet available
        try {
          const fallbackAudio = new Audio(scriptData.audioUrl);
          audioRef.current = fallbackAudio;
          setIsAudioPlaying(true);
          
          fallbackAudio.onended = () => {
            audioRef.current = null;
            setIsAudioPlaying(false);
            sequenceRef.current = 'idle';
            if (storageKey === 'listening' && autoPlay) {
              setTimeout(() => {
                handleNextPlaylist();
              }, 1000);
            }
          };

          fallbackAudio.onerror = (e) => {
            console.warn('Audio play failed, falling back to speech', e);
            audioRef.current = null;
            setIsAudioPlaying(false);
            playLine(0);
          };

          const playPromise = fallbackAudio.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
               console.warn("Audio play prevented or failed", error);
               if (audioRef.current === fallbackAudio) {
                 fallbackAudio.onerror?.(error as any);
               }
            });
          }
        } catch (err) {
          console.warn("Audio creation failed", err);
          setIsAudioPlaying(false);
          playLine(0);
        }
      }
    } else {
      playLine(0);
    }
  }, [scriptData, playlist, autoPlay, storageKey, handleNextPlaylist, playLine]);

  const playQuestion = useCallback(() => {
    if (!scriptData) return;
    
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const questionText = scriptData.questions?.[0]?.en;
    if (!questionText || playlist?.playQuestion === false) {
      playContent();
      return;
    }

    sequenceRef.current = 'question';
    toggleSpeak(questionText, 'auto-question');
  }, [scriptData, playContent, toggleSpeak]);

  // Effect to start sequence when script changes
  useEffect(() => {
    if (!loadingScript && scriptData && autoPlay && storageKey === 'listening' && !isSwitching) {
      // If we were already in a sequence (from a manual pause/resume), don't reset to question
      if (sequenceRef.current === 'idle') {
        playQuestion();
      }
    } else if (!loadingScript && scriptData && autoPlay && !isSwitching) {
      // Legacy autoPlay behavior for other modes
      const firstQuestion = scriptData.questions?.[0]?.en;
      if (firstQuestion) {
        toggleSpeak(firstQuestion, 'auto-play');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptData, loadingScript, autoPlay, storageKey, isSwitching]);

  // Effect to monitor speech end for sequence transitions
  useEffect(() => {
    // Only trigger when speakingIndex becomes null (speech ended)
    if (speakingIndex === null && storageKey === 'listening' && autoPlay) {
      if (sequenceRef.current === 'question') {
        // Transition Question -> Content
        sequenceRef.current = 'idle';
        setTimeout(() => {
          playContent();
        }, 800);
      } else if (sequenceRef.current === 'content' && !audioRef.current) {
        // Handle next line for Web Speech
        // Use the current state value, but since this effect is triggered by speakingIndex,
        // it will only fire when a speech ends.
        if (currentLineIndex !== null) {
          const nextLineIndex = currentLineIndex + 1;
          // Important: Reset currentLineIndex to null if we've reached the end
          // to prevent the "idle" state from being confused.
          if (scriptData?.lines && nextLineIndex >= scriptData.lines.length) {
            sequenceRef.current = 'idle';
            setCurrentLineIndex(null);
            setTimeout(() => {
              handleNextPlaylist();
            }, 1200);
          } else {
            setTimeout(() => {
              playLine(nextLineIndex);
            }, 500);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakingIndex, storageKey, autoPlay]); // Removed currentLineIndex and other deps that cause re-triggers

  // Reset sequence when index changes manually
  useEffect(() => {
    sequenceRef.current = 'idle';
    setCurrentLineIndex(null);
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (domAudioRef.current) {
      domAudioRef.current.pause();
    }
  }, [currentIndex]);

  // Stop playback when autoPlay is turned off
  useEffect(() => {
    if (!autoPlay && storageKey === 'listening') {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setIsAudioPlaying(false);
      }
      if (domAudioRef.current) {
        domAudioRef.current.pause();
        setIsAudioPlaying(false);
      }
      sequenceRef.current = 'idle';
      setCurrentLineIndex(null);
    }
  }, [autoPlay, storageKey]);

  // Cleanup audio and speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (domAudioRef.current) {
        domAudioRef.current.pause();
      }
    };
  }, []);

  // 4. Persist Auto Play
  useEffect(() => {
    localStorage.setItem('opic-auto-play', JSON.stringify(autoPlay));
  }, [autoPlay]);

  const handleNext = useCallback(() => {
    if (playlist && playlist.fileIds.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % playlist.fileIds.length);
    }
  }, [playlist]);

  const handlePrev = useCallback(() => {
    if (playlist && playlist.fileIds.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + playlist.fileIds.length) % playlist.fileIds.length);
    }
  }, [playlist]);

  const toggleLine = useCallback((index: number) => {
    setRevealedLines((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const toggleAll = () => {
    const newState = !allRevealed;
    setAllRevealed(newState);
    
    const newRevealedLines: Record<string, boolean> = {};
    const newRevealedAnswers: Record<number, boolean> = {};

    if (scriptData?.lines) {
      scriptData.lines.forEach((_: any, index: number) => { 
        newRevealedLines[index.toString()] = newState;
        newRevealedAnswers[index] = newState;
      });
    }
    if (scriptData?.questions) {
      scriptData.questions.forEach((_: any, index: number) => { 
        newRevealedLines[`q-${index}`] = newState; 
      });
    }
    setRevealedLines(newRevealedLines);
    setRevealedAnswers(newRevealedAnswers);
  };

  const userAnswersRef = useRef(userAnswers);
  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  const handleCheckAnswer = useCallback((index: number) => {
    const currentAnswers = userAnswersRef.current;
    const userAnswer = (currentAnswers[index] || '').trim();
    const correctAnswer = (scriptData.lines[index].en || '').trim();
    if (!userAnswer) return;

    const uWords = userAnswer.split(/\s+/);
    const cWords = correctAnswer.split(/\s+/);
    const clean = (str: string) => str?.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") || "";
    const uClean = uWords.map(clean);
    const cClean = cWords.map(clean);

    const dp = Array(uClean.length + 1).fill(0).map(() => Array(cClean.length + 1).fill(0));
    for (let i = 1; i <= uClean.length; i++) {
      for (let j = 1; j <= cClean.length; j++) {
        if (uClean[i - 1] === cClean[j - 1] && uClean[i - 1] !== "") dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }

    const results: any[] = [];
    let i = uClean.length; let j = cClean.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && uClean[i - 1] === cClean[j - 1] && uClean[i - 1] !== "") {
        results.unshift({ uWord: uWords[i - 1], cWord: cWords[j - 1], isCorrect: true, masked: cWords[j - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        results.unshift({ uWord: "", cWord: cWords[j - 1], isCorrect: false, masked: cWords[j - 1].replace(/[a-zA-Z0-9]/g, "*") });
        j--;
      } else {
        results.unshift({ uWord: uWords[i - 1], cWord: "", isCorrect: false, masked: "" });
        i--;
      }
    }
    setTestResults(prev => ({ ...prev, [index]: results }));
    if (results.every(r => r.isCorrect)) setRevealedAnswers(prev => ({ ...prev, [index]: true }));
  }, [scriptData?.lines]);

  const handleChangeAnswer = useCallback((index: number, value: string) => {
    setUserAnswers((prev) => (prev[index] === value ? prev : { ...prev, [index]: value }));
  }, [setUserAnswers]);

  const handleToggleAnswerReveal = useCallback((index: number) => {
    setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const setInputRef = useCallback((index: number, el: any) => {
    inputRefs.current[index] = el;
  }, [inputRefs]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading playlist...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 5 }, px: { xs: 1.5, md: 8 } }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{
          mb: 4,
          position: 'sticky',
          top: 0,
          bgcolor: 'background.default',
          zIndex: 10,
          py: 1.5,
          mx: { xs: -2, md: -8 },
          px: { xs: 2, md: 8 },
          '&:before': {
            content: '""',
            position: 'absolute',
            top: -100,
            left: 0,
            right: 0,
            height: 100,
            bgcolor: 'background.default',
            zIndex: -1,
          },
        }}
      >
        <IconButton onClick={onBack} sx={{ bgcolor: 'background.neutral', mt: { xs: 0.5, md: 0 } }}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1, md: 2 }}
          sx={{ flexGrow: 1 }}
        >
          <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: (sequenceRef.current === 'content' && autoPlay && !isAudioPlaying) ? 'error.main' : 'text.primary',
                transition: (theme) => theme.transitions.create('color'),
                wordBreak: 'break-all',
              }}
            >
              {fileName}
            </Typography>


            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, wordBreak: 'break-all' }}>
              {currentIndex + 1}/{playlist?.fileIds.length || 0} • {currentFileName}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: 'flex-end',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Tooltip title="Previous Script">
              <span>
                <IconButton
                  size="small"
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  sx={{ bgcolor: 'background.neutral' }}
                >
                  <Iconify icon="solar:alt-arrow-left-bold" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Next Script">
              <span>
                <IconButton
                  size="small"
                  disabled={!playlist || playlist.fileIds.length <= 1}
                  onClick={handleNext}
                  sx={{ bgcolor: 'background.neutral' }}
                >
                  <Iconify icon="solar:alt-arrow-right-bold" />
                </IconButton>
              </span>
            </Tooltip>

            {storageKey === 'listening' && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 24, alignSelf: 'center' }} />
                <Tooltip title={playlist?.randomPlay ? "Shuffle: ON" : "Shuffle: OFF"}>
                  <IconButton
                    size="small"
                    color={playlist?.randomPlay ? 'primary' : 'default'}
                    onClick={toggleRandomPlay}
                    sx={{ bgcolor: (theme) => (playlist?.randomPlay ? alpha(theme.palette.primary.main, 0.16) : 'background.neutral') }}
                  >
                    <Iconify icon="solar:shuffle-bold" />
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Tooltip title={allRevealed ? "Hide All" : "Reveal All"}>
              <IconButton
                size="small"
                color={allRevealed ? 'warning' : 'success'}
                onClick={toggleAll}
                sx={{ bgcolor: (theme) => (allRevealed ? alpha(theme.palette.warning.main, 0.16) : alpha(theme.palette.success.main, 0.16)) }}
              >
                <Iconify icon={allRevealed ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Edit Playlist">
              <IconButton size="small" color="primary" onClick={onEdit} sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16) }}>
                <Iconify icon="solar:pen-bold" />
              </IconButton>
            </Tooltip>

            <Tooltip title={autoPlay ? (storageKey === 'listening' ? "Stop" : "Auto Play: ON") : (storageKey === 'listening' ? "Play" : "Auto Play: OFF")}>
              <IconButton
                size="small"
                color={autoPlay ? 'primary' : 'default'}
                onClick={() => {
                  const newAutoPlay = !autoPlay;
                  setAutoPlay(newAutoPlay);
                  
                  // Resume logic when turning ON
                  if (newAutoPlay && storageKey === 'listening') {
                    if (sequenceRef.current === 'question') {
                      playQuestion();
                    } else if (sequenceRef.current === 'content') {
                      playContent();
                    } else {
                      // Initial start or idle
                      if (playlist?.playQuestion === false) {
                        playContent();
                      } else {
                        playQuestion();
                      }
                    }
                  }
                }}
                sx={{ bgcolor: (theme) => (autoPlay ? alpha(theme.palette.primary.main, 0.16) : 'background.neutral') }}
              >
                <Iconify 
                  icon={
                    storageKey === 'listening' 
                      ? (autoPlay ? "solar:stop-circle-bold" : "solar:play-circle-bold")
                      : (autoPlay ? "solar:play-circle-bold" : "solar:play-circle-linear")
                  } 
                />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      <Box>
        {loadingScript ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
            <Typography variant="body1" color="text.secondary">Loading script details...</Typography>
          </Box>
        ) : scriptData ? (
          <Stack spacing={4}>
            {/* Question Section */}
            <Card 
              ref={(speakingIndex === 'auto-question' || (sequenceRef.current === 'question' && autoPlay)) ? playingRef : null}
              sx={{ 
                p: { xs: 2, md: 3 }, 
                border: (theme) => (speakingIndex === 'auto-question' || (sequenceRef.current === 'question' && autoPlay)) 
                  ? `solid 2px ${theme.vars.palette.error.main}` 
                  : `solid 1px ${theme.vars.palette.divider}`, 
                bgcolor: (theme) => (speakingIndex === 'auto-question' || (sequenceRef.current === 'question' && autoPlay))
                  ? alpha(theme.palette.error.main, 0.04)
                  : alpha(theme.palette.background.neutral, 0.5),
                transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
              }}
            >
              <Typography variant="overline" sx={{ color: 'text.disabled', mb: 2, display: 'block' }}>Question</Typography>

              <Stack spacing={3}>
                {scriptData?.questions?.map((q: any, index: number) => (
                  <Stack key={index} spacing={2.5}>
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'flex-start' }} spacing={{ xs: 1.5, md: 2 }}>
                      {/* Mobile Top Header: Q Index + Speaker */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', display: { xs: 'flex', md: 'none' } }}>
                        <Box sx={{ flexShrink: 0 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 900, 
                              color: 'text.disabled', 
                              bgcolor: 'background.neutral', 
                              px: 1, 
                              py: 0.25, 
                              borderRadius: 0.5,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 32
                            }}
                          >
                            Q{index + 1}
                          </Typography>
                        </Box>
                        {q.en && (
                          <IconButton
                            onClick={() => {
                              if (index === 0 && speakingIndex === 'auto-play') {
                                toggleSpeak(q.en, 'auto-play');
                              } else {
                                toggleSpeak(q.en, `q-${index}`);
                              }
                            }}
                            size="small"
                            color={(speakingIndex === `q-${index}` || (index === 0 && speakingIndex === 'auto-play')) ? 'primary' : 'default'}
                            sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08), flexShrink: 0 }}
                          >
                            <Iconify 
                              icon={(speakingIndex === `q-${index}` || (index === 0 && speakingIndex === 'auto-play')) ? 'solar:stop-circle-bold' : 'solar:volume-loud-bold'} 
                              width={20}
                            />
                          </IconButton>
                        )}
                      </Stack>

                      {/* Desktop Q Index */}
                      <Box sx={{ mt: 0.5, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 900, 
                            color: 'text.disabled', 
                            bgcolor: 'background.neutral', 
                            px: 0.75, 
                            py: 0.25, 
                            borderRadius: 0.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 32
                          }}
                        >
                          Q{index + 1}
                        </Typography>
                      </Box>

                      <Typography
                        variant="h6"
                        onClick={() => { if (testMode || storageKey === 'listening') { const key = `q-${index}`; setRevealedLines(prev => ({ ...prev, [key]: !prev[key] })); } }}
                        sx={{
                          lineHeight: 1.5,
                          fontWeight: 700,
                          flexGrow: 1,
                          color: (speakingIndex === `q-${index}` || (index === 0 && (speakingIndex === 'auto-play' || speakingIndex === 'auto-question'))) ? 'error.main' : 'text.primary',
                          fontSize: { xs: '1.0625rem', md: '1.125rem' },
                          cursor: (testMode || storageKey === 'listening') ? 'pointer' : 'default',
                          transition: (theme) => theme.transitions.create(['filter', 'opacity', 'color']),
                          ...((testMode || storageKey === 'listening') && !(revealedLines[`q-${index}`]) && {
                            filter: 'blur(8px)',
                             opacity: 0.3,
                             userSelect: 'none'
                           }),
                           whiteSpace: 'pre-wrap'
                         }}
                       >
                         {q.en || 'Untitled Question'}
                      </Typography>
                      
                      {/* Desktop Speaker Icon */}
                      {q.en && (
                        <IconButton
                          onClick={() => {
                            if (index === 0 && speakingIndex === 'auto-play') {
                              toggleSpeak(q.en, 'auto-play');
                            } else {
                              toggleSpeak(q.en, `q-${index}`);
                            }
                          }}
                          size="small"
                          color={(speakingIndex === `q-${index}` || (index === 0 && speakingIndex === 'auto-play')) ? 'primary' : 'default'}
                          sx={{ 
                            mt: -0.5, 
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                            flexShrink: 0,
                            display: { xs: 'none', md: 'inline-flex' }
                          }}
                        >
                          <Iconify 
                            icon={(speakingIndex === `q-${index}` || (index === 0 && speakingIndex === 'auto-play')) ? 'solar:stop-circle-bold' : 'solar:volume-loud-bold'} 
                            width={24}
                          />
                        </IconButton>
                      )}
                    </Stack>

                    {q.ko && (
                      <Box
                        onClick={() => { const key = `q-${index}`; setRevealedLines(prev => ({ ...prev, [key]: !prev[key] })); }}
                        sx={{ 
                          ml: { xs: 0, md: 4 }, 
                          p: { xs: 1.5, md: 2 }, 
                          cursor: 'pointer', 
                          borderRadius: 1.5, 
                          bgcolor: 'background.paper', 
                          border: (theme) => `dashed 1px ${theme.vars.palette.divider}`, 
                          transition: (theme) => theme.transitions.create(['background-color']), 
                          '&:hover': { bgcolor: 'action.hover' } 
                        }}
                      >
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary', 
                            textAlign: 'justify', 
                            transition: (theme) => theme.transitions.create(['filter', 'opacity']), 
                            ...(!(revealedLines[`q-${index}`]) && { filter: 'blur(6px)', opacity: 0.4, userSelect: 'none' }),
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {q.ko}
                        </Typography>
                      </Box>
                    )}
                    {index < scriptData.questions.length - 1 && <Divider sx={{ borderStyle: 'dotted' }} />}
                  </Stack>
                ))}
              </Stack>

              {scriptData?.audioUrl && (
                <Box sx={{ mt: 3, display: audioReady ? 'block' : 'none' }}>
                  <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />
                  
                  <Box sx={{ 
                    p: 2,
                    borderRadius: 2,
                    border: (theme) => `solid 2px ${isAudioPlaying ? theme.vars.palette.error.main : 'transparent'}`,
                    bgcolor: (theme) => isAudioPlaying ? alpha(theme.palette.error.main, 0.04) : 'transparent',
                    transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
                  }}>
                    <audio 
                      ref={domAudioRef}
                      controls 
                      src={scriptData.audioUrl} 
                      style={{ width: '100%' }} 
                      onCanPlay={() => setAudioReady(true)}
                      onPlay={() => setIsAudioPlaying(true)}
                      onPause={() => setIsAudioPlaying(false)}
                      onEnded={() => {
                        setIsAudioPlaying(false);
                        if (!isSwitching && sequenceRef.current === 'content' && autoPlay && storageKey === 'listening') {
                          sequenceRef.current = 'idle';
                          setTimeout(() => {
                            handleNextPlaylist();
                          }, 1000);
                        }
                      }}
                      onError={() => {
                        setAudioReady(false);
                        if (sequenceRef.current === 'content') {
                          setIsAudioPlaying(false);
                          playLine(0);
                        }
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Card>

            {/* Script Lines */}
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Script</Typography>
                <Typography variant="caption" sx={{ color: testMode ? 'info.main' : 'text.disabled', fontWeight: 'bold' }}>
                  {testMode ? 'TEST MODE' : '* Click to reveal English'}
                </Typography>
              </Stack>

              {scriptData?.lines?.map((line: any, index: number) => (
                <OpicScriptItem
                  key={index}
                  index={index}
                  line={line}
                  testMode={testMode || storageKey === 'listening'}
                  isRevealed={revealedLines[index]}
                  userAnswer={userAnswers[index]}
                  result={testResults[index]}
                  isAnswerRevealed={revealedAnswers[index]}
                  isListening={isListening === index}
                  isPreparing={isPreparing}
                  playingIndex={playingIndex === index}
                  speakingIndex={speakingIndex === `line-${index}` || speakingIndex === `line-result-${index}` || speakingIndex === `line-view-${index}` || (currentLineIndex === index && !isAudioPlaying && (speakingIndex === `auto-content-line-${index}` || speakingIndex === 'auto-content'))}
                  isMobile={isMobile}
                  recordedAudio={recordedAudios[index]}
                  setInputRef={setInputRef}
                  itemRef={(currentLineIndex === index && !isAudioPlaying && (speakingIndex === `auto-content-line-${index}` || speakingIndex === 'auto-content')) ? playingRef : null}
                  onToggleLine={toggleLine}
                  onToggleSpeak={toggleSpeak}
                  onChangeAnswer={handleChangeAnswer}
                  onCheckAnswer={handleCheckAnswer}
                  onStartListening={startListening}
                  onStopListening={stopListening}
                  onPlayRecordedAudio={playRecordedAudio}
                  onToggleAnswerReveal={handleToggleAnswerReveal}
                  hideInput={storageKey === 'listening'}
                />
              ))}
            </Stack>
          </Stack>
        ) : (
          <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'background.neutral', borderRadius: 2 }}>
            <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" sx={{ color: 'text.disabled' }}>스크립트 정보가 없습니다.</Typography>
          </Box>
        )}
      </Box>
    </Container>

  );
}
