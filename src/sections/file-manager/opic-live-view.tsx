'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { getFileScript } from 'src/api/indexDB';
import { toast } from 'src/components/snackbar';
import { getIsMobile } from 'src/utils/is-mobile';

// ----------------------------------------------------------------------

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type Props = {
  fileId: string;
  fileName: string;
  onBack: () => void;
  onEdit: () => void;
};

export function OpicLiveView({ fileId, fileName, onBack, onEdit }: Props) {
  const theme = useTheme();

  const isMobile = getIsMobile();

  const [scriptData, setScriptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revealedLines, setRevealedLines] = useState<Record<string, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [showKoQuestion, setShowKoQuestion] = useState(false);

  const [testMode, setTestMode] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [testResults, setTestResults] = useState<Record<number, { uWord: string; cWord: string; isCorrect: boolean; masked: string }[]>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  const [isListening, setIsListening] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedAudios, setRecordedAudios] = useState<Record<number, string>>({});

  // Pre-load voices for mobile support
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const recordedAudiosRef = useRef<Record<number, string>>({});

  useEffect(() => {
    recordedAudiosRef.current = recordedAudios;
  }, [recordedAudios]);

  // Cleanup recognition and recordings on unmount
  useEffect(() => () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    // Cleanup recorded audio URLs
    Object.values(recordedAudiosRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    const loadScript = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId);
        if (data && !data.questions && (data.questionEn || data.question)) {
          data.questions = [{
            en: data.questionEn || data.question || '',
            ko: data.questionKo || ''
          }];
        }
        setScriptData(data);
      } catch (error) {
        console.error('Failed to load script', error);
      } finally {
        setLoading(false);
      }
    };
    loadScript();
  }, [fileId]);

  const toggleLine = useCallback((index: number) => {
    setRevealedLines((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const toggleAll = () => {
    const newState = !allRevealed;
    setAllRevealed(newState);
    setShowKoQuestion(newState);
    const newRevealed: Record<string, boolean> = {};
    if (scriptData?.lines) {
      scriptData.lines.forEach((_: any, index: number) => {
        newRevealed[index.toString()] = newState;
      });
    }
    if (scriptData?.questions) {
      scriptData.questions.forEach((_: any, index: number) => {
        newRevealed[`q-${index}`] = newState;
      });
    }
    setRevealedLines(newRevealed);
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;

      // Mobile fix: Select a voice explicitly
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
                      voices.find((v) => v.lang.startsWith('en')) ||
                      voices[0];
      if (enVoice) utterance.voice = enVoice;

      // Mobile fix: Some browsers need a short delay after cancel
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    } else {
      toast.error('Text-to-speech is not supported in this browser.');
    }
  };

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        // already stopped
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // already stopped
      }
      mediaRecorderRef.current = null;
    }

    setIsListening(null);
  }, []);

  const resetSilenceTimer = useCallback((index: number) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
      toast.info('3초간 입력이 없어 녹음을 종료합니다.');
    }, 3000);
  }, [stopListening]);

  const startListening = async (index: number) => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        toast.warning('이 브라우저는 음성 인식을 지원하지 않습니다.');
        return;
      }

      // Cleanup existing instances
      stopListening();

      // Initialize MediaRecorder for voice playback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        console.warn('Microphone access issues', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.warning('마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.');
        } else {
          toast.warning('마이크를 시작할 수 없습니다. 연결 상태를 확인해주세요.');
        }
        return;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
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
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(index);
        resetSilenceTimer(index);
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer(index);
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');

        setUserAnswers((prev) => ({ ...prev, [index]: transcript }));
      };

      recognition.onspeechstart = () => {
        resetSilenceTimer(index);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast.warning(`음성 인식 오류: ${event.error}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        stopListening();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.warn('Failed to start listening', error);
      toast.warning('음성 인식을 시작하는 중 오류가 발생했습니다.');
      setIsListening(null);
    }
  };

  const handleCheckAnswer = (index: number) => {
    const userAnswer = (userAnswers[index] || '').trim();
    const correctAnswer = (scriptData.lines[index].en || '').trim();

    if (!userAnswer) return;

    const uWords = userAnswer.split(/\s+/);
    const cWords = correctAnswer.split(/\s+/);

    const clean = (str: string) => str?.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") || "";

    // LCS-based Alignment
    const uClean = uWords.map(clean);
    const cClean = cWords.map(clean);

    const dp = Array(uClean.length + 1).fill(0).map(() => Array(cClean.length + 1).fill(0));
    for (let i = 1; i <= uClean.length; i++) {
      for (let j = 1; j <= cClean.length; j++) {
        if (uClean[i - 1] === cClean[j - 1] && uClean[i - 1] !== "") {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const results: { uWord: string; cWord: string; isCorrect: boolean; masked: string }[] = [];
    let i = uClean.length;
    let j = cClean.length;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && uClean[i - 1] === cClean[j - 1] && uClean[i - 1] !== "") {
        results.unshift({
          uWord: uWords[i - 1],
          cWord: cWords[j - 1],
          isCorrect: true,
          masked: cWords[j - 1]
        });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        // Missing in user's answer (Gap in User)
        results.unshift({
          uWord: "",
          cWord: cWords[j - 1],
          isCorrect: false,
          masked: cWords[j - 1].replace(/[a-zA-Z0-9]/g, "*")
        });
        j--;
      } else {
        // Extra in user's answer (Gap in Correct)
        results.unshift({
          uWord: uWords[i - 1],
          cWord: "",
          isCorrect: false,
          masked: ""
        });
        i--;
      }
    }

    setTestResults(prev => ({
      ...prev,
      [index]: results
    }));

    // Auto-reveal if all words are correct
    const isAllCorrect = results.every(r => r.isCorrect);
    if (isAllCorrect) {
      setRevealedAnswers(prev => ({ ...prev, [index]: true }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading script...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 5 }, px: { xs: 1, md: 3 } }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ mb: 4, position: 'sticky', top: 0, bgcolor: 'background.default', zIndex: 10, py: 1 }}
      >
        <IconButton onClick={onBack} sx={{ bgcolor: 'background.neutral' }}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>

        <Stack spacing={0.5} sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fileName}
          </Typography>

          {(scriptData?.category || scriptData?.comboPositions?.length > 0) && (
            <Stack direction="row" alignItems="center" spacing={1}>
              {scriptData.category && (
                <Typography
                  variant="caption"
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 0.5,
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                    color: 'info.main',
                    fontWeight: 800,
                    fontSize: 10,
                    textTransform: 'uppercase',
                  }}
                >
                  {scriptData.category} {scriptData.subCategory && `• ${scriptData.subCategory}`}
                </Typography>
              )}
              {scriptData.comboPositions?.map((pos: number) => (
                <Box
                  key={pos}
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    bgcolor: 'text.primary',
                    color: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {pos}
                </Box>
              ))}
            </Stack>
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Test Mode">
            <IconButton
              color={testMode ? 'info' : 'default'}
              onClick={() => {
                setTestMode(!testMode);
                if (!testMode) {
                  setAllRevealed(false);
                  setUserAnswers({});
                  setTestResults({});
                  setRevealedAnswers({});
                }
              }}
              sx={{
                bgcolor: (theme) => (testMode ? alpha(theme.palette.info.main, 0.16) : 'background.neutral'),
              }}
            >
              <Iconify icon="solar:pen-new-square-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title={allRevealed ? "Hide All" : "Reveal All"}>
            <IconButton
              color={allRevealed ? 'warning' : 'success'}
              onClick={toggleAll}
              sx={{
                bgcolor: (theme) => (allRevealed ? alpha(theme.palette.warning.main, 0.16) : alpha(theme.palette.success.main, 0.16)),
              }}
            >
              <Iconify icon={allRevealed ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit">
            <IconButton
              color="primary"
              onClick={onEdit}
              sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16) }}
            >
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack spacing={4}>
        {/* Question Section */}
        <Card sx={{ p: 3, border: (theme) => `solid 1px ${theme.vars.palette.divider}`, bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.5) }}>
          <Typography variant="overline" sx={{ color: 'text.disabled', mb: 2, display: 'block' }}>Question</Typography>

          <Stack spacing={3}>
            {scriptData?.questions?.map((q: any, index: number) => (
              <Stack key={index} spacing={2.5}>
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <Box sx={{ mt: 0.5, flexShrink: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.disabled', bgcolor: 'background.neutral', px: 0.5, py: 0.25, borderRadius: 0.5 }}>
                      Q{index + 1}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ lineHeight: 1.5, fontWeight: 700, flexGrow: 1, color: 'text.primary' }}>
                    {q.en || 'Untitled Question'}
                  </Typography>
                  {q.en && (
                    <IconButton
                      onClick={() => handleSpeak(q.en)}
                      size="medium"
                      color="primary"
                      sx={{ mt: -0.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) }}
                    >
                      <Iconify icon="solar:volume-loud-bold" />
                    </IconButton>
                  )}
                </Stack>

                {q.ko && (
                  <Box
                    onClick={() => {
                      const key = `q-${index}`;
                      setRevealedLines(prev => ({ ...prev, [key]: !prev[key] }));
                    }}
                    sx={{
                      ml: 4,
                      p: 2,
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
                        ...( ! (revealedLines[`q-${index}`] ?? allRevealed) && {
                          filter: 'blur(6px)',
                          opacity: 0.4,
                          userSelect: 'none'
                        })
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
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />
              <audio controls src={scriptData.audioUrl} style={{ width: '100%' }} />
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

          {scriptData?.lines?.map((line: any, index: number) => {
            const isRevealed = revealedLines[index] ?? allRevealed;
            const result = testResults[index];
            const isAnswerRevealed = revealedAnswers[index];

            return (
              <Card
                key={index}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  border: (theme) => `solid 1px ${!testMode && isRevealed ? theme.vars.palette.primary.main : theme.vars.palette.divider
                    }`,
                  bgcolor: (theme) => !testMode && isRevealed ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                  boxShadow: (theme) => theme.customShadows?.z1,
                  transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
                }}
              >
                <Stack spacing={2}>
                  {/* Korean Text */}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        lineHeight: 1.5,
                        flexGrow: 1
                      }}
                    >
                      {line.ko}
                    </Typography>
                  </Stack>

                  <Divider sx={{ borderStyle: 'dashed' }} />

                  {/* English Text / Input */}
                  {testMode ? (
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        placeholder="Listen and type English..."
                        value={userAnswers[index] || ''}
                        onChange={(e) => setUserAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCheckAnswer(index);
                          }
                        }}
                        autoComplete="off"
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end" sx={{ gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  color={isListening === index ? 'error' : 'default'}
                                  onClick={() => (isListening === index ? stopListening() : startListening(index))}
                                  sx={{
                                    ...(isListening === index && {
                                      animation: 'pulse 1.5s infinite',
                                      '@keyframes pulse': {
                                        '0%': { transform: 'scale(1)', opacity: 1 },
                                        '50%': { transform: 'scale(1.2)', opacity: 0.7 },
                                        '100%': { transform: 'scale(1)', opacity: 1 },
                                      },
                                    }),
                                  }}
                                >
                                  <Iconify icon={isListening === index ? 'solar:stop-circle-bold' : 'solar:microphone-bold'} />
                                </IconButton>
                                  <IconButton
                                    size="small"
                                    disabled={!recordedAudios[index]}
                                    onClick={() => {
                                      const audio = new Audio(recordedAudios[index]);
                                      audio.play();
                                    }}
                                    sx={{
                                      color: recordedAudios[index] ? 'info.main' : 'text.disabled',
                                      bgcolor: (theme) => recordedAudios[index] ? alpha(theme.palette.info.main, 0.08) : 'transparent',
                                    }}
                                  >
                                    <Iconify icon="solar:play-bold" />
                                  </IconButton>
                                   <IconButton onClick={() => handleCheckAnswer(index)} size="small" color="success">
                                    <Iconify icon="solar:check-read-bold" />
                                  </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />

                      {result && (
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.8), border: (theme) => `solid 1px ${theme.vars.palette.divider}` }}>
                          {/* Your Answer */}
                          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', columnGap: 0.8, rowGap: 0.5, alignItems: 'center' }}>
                            <Box
                              sx={{
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 0.5,
                                bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
                                color: 'info.main',
                                fontSize: 10,
                                fontWeight: 900,
                                mr: 0.5,
                                flexShrink: 0
                              }}
                            >
                              답변
                            </Box>
                            {result.map((word: any, wIndex: number) => word.uWord && (
                              <Typography
                                key={wIndex}
                                variant="body1"
                                sx={{
                                  color: word.isCorrect ? 'info.main' : 'error.main',
                                  fontWeight: 700,
                                  textDecoration: word.isCorrect ? 'none' : 'line-through'
                                }}
                              >
                                {word.uWord}
                              </Typography>
                            ))}
                          </Box>

                          {/* Correct Answer */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 0.8, rowGap: 0.5, alignItems: 'center' }}>
                            <Box
                              sx={{
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 0.5,
                                bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                                color: 'success.main',
                                fontSize: 10,
                                fontWeight: 900,
                                mr: 0.5,
                                flexShrink: 0
                              }}
                            >
                              정답
                            </Box>
                            {result.map((word: any, wIndex: number) => (word.cWord || (!isAnswerRevealed && word.masked)) && (
                              <Typography
                                key={wIndex}
                                variant="body1"
                                sx={{
                                  fontWeight: 700,
                                  color: isAnswerRevealed ? 'text.primary' : 'text.disabled',
                                  letterSpacing: isAnswerRevealed ? 0 : 1
                                }}
                              >
                                {isAnswerRevealed ? word.cWord : word.masked}
                              </Typography>
                            ))}
                            <IconButton
                              size="small"
                              onClick={() => setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }))}
                              sx={{ ml: 0.5, p: 0.5, color: isAnswerRevealed ? 'primary.main' : 'text.disabled' }}
                            >
                              <Iconify icon={isAnswerRevealed ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={16} />
                            </IconButton>

                            <IconButton
                              size="small"
                              onClick={() => handleSpeak(line.en)}
                              sx={{ ml: 0.5, p: 0.5, color: 'primary.main' }}
                            >
                              <Iconify icon="solar:volume-loud-bold" width={16} />
                            </IconButton>
                          </Box>
                        </Box>
                      )}
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Box
                        onClick={() => toggleLine(index)}
                        sx={{
                          p: 1.5,
                          flexGrow: 1,
                          cursor: 'pointer',
                          borderRadius: 1,
                          bgcolor: isRevealed ? 'transparent' : (theme) => alpha(theme.palette.action.hover, 0.04),
                          transition: (theme) => theme.transitions.create(['filter', 'opacity', 'background-color']),
                          '&:hover': {
                            bgcolor: (theme) => isRevealed ? 'transparent' : alpha(theme.palette.action.hover, 0.08),
                          },
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            color: 'text.primary',
                            lineHeight: 1.6,
                            ...(!isRevealed && {
                              filter: 'blur(8px)',
                              opacity: 0.3,
                              userSelect: 'none',
                              transform: 'scale(0.99)',
                            }),
                          }}
                        >
                          {line.en}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={() => handleSpeak(line.en)}
                        color="primary"
                        size="small"
                        sx={{
                          mt: 1,
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                          '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16) },
                        }}
                      >
                        <Iconify icon="solar:volume-loud-bold" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              </Card>
            );
          }) || (
              <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'background.neutral', borderRadius: 2 }}>
                <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  No script lines available.
                </Typography>
              </Box>
            )}
        </Stack>
      </Stack>
    </Container>
  );
}
