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
import { getFileScript, getTreeData } from 'src/api/indexDB';
import { toast } from 'src/components/snackbar';
import { getIsMobile } from 'src/utils/is-mobile';
import { useOpicSpeech } from './hooks/use-opic-speech';

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
  storageKey?: string;
};

export function OpicTestLiveView({ fileId, fileName, onBack, onEdit, storageKey }: Props) {
  const theme = useTheme();

  const isMobile = getIsMobile();

  const [playlist, setPlaylist] = useState<{ fileIds: string[] } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scriptData, setScriptData] = useState<any>(null);
  const [currentFileName, setCurrentFileName] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingScript, setLoadingScript] = useState(false);

  const [revealedLines, setRevealedLines] = useState<Record<string, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [showKoQuestion, setShowKoQuestion] = useState(false);

  const [testMode, setTestMode] = useState(true);
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

  const [testResults, setTestResults] = useState<Record<number, { uWord: string; cWord: string; isCorrect: boolean; masked: string }[]>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  // Pre-load voices
  useEffect(() => {
    const loadVoices = () => { window.speechSynthesis.getVoices(); };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);



  // 1. Load Playlist
  useEffect(() => {
    const loadPlaylist = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId, storageKey);
        if (data && data.fileIds) {
          setPlaylist(data);
          setCurrentIndex(0);
        } else {
          // If not a playlist (fallback), treat as single script
          setPlaylist({ fileIds: [fileId] });
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
      if (!playlist || playlist.fileIds.length === 0) return;

      const currentId = playlist.fileIds[currentIndex];
      setLoadingScript(true);

      // Reset current state
      setRevealedLines({});
      setAllRevealed(false);
      setUserAnswers({});
      setTestResults({});
      setRevealedAnswers({});
      setRecordedAudios({});

      try {
        // Referenced scripts are ALWAYS from main DRIVE
        const data = await getFileScript(currentId);

        // Try to get the file name from DRIVE tree
        const tree = await getTreeData();
        const findName = (nodes: any[]): string => {
          for (const node of nodes) {
            if (node.id === currentId) return node.label;
            if (node.children) {
              const res = findName(node.children);
              if (res) return res;
            }
          }
          return 'Untitled';
        };
        setCurrentFileName(findName(tree));

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
      }
    };
    loadCurrentScript();
  }, [playlist, currentIndex]);

  // 3. Auto Play Question
  useEffect(() => {
    if (!loadingScript && scriptData && autoPlay) {
      const questionText = scriptData.questions?.map((q: any) => q.en).filter(Boolean).join('. ');
      if (questionText) {
        toggleSpeak(questionText, 'auto-play');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptData, loadingScript, autoPlay]);

  // 4. Persist Auto Play
  useEffect(() => {
    localStorage.setItem('opic-auto-play', JSON.stringify(autoPlay));
  }, [autoPlay]);

  const handleNext = () => {
    if (playlist && currentIndex < playlist.fileIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const toggleLine = useCallback((index: number) => {
    setRevealedLines((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const toggleAll = () => {
    const newState = !allRevealed;
    setAllRevealed(newState);
    const newRevealed: Record<string, boolean> = {};
    if (scriptData?.lines) {
      scriptData.lines.forEach((_: any, index: number) => { newRevealed[index.toString()] = newState; });
    }
    if (scriptData?.questions) {
      scriptData.questions.forEach((_: any, index: number) => { newRevealed[`q-${index}`] = newState; });
    }
    setRevealedLines(newRevealed);
  };

  const handleCheckAnswer = (index: number) => {
    const userAnswer = (userAnswers[index] || '').trim();
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
  };

  const renderActionButtons = (index: number) => (
    <>
      <IconButton
        size="small"
        color={isListening === index ? 'error' : 'default'}
        onClick={() => (isListening === index ? stopListening() : startListening(index))}
        sx={{
          ...(isListening === index && !isPreparing && {
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.2)', opacity: 0.7 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }),
          ...(isPreparing && isListening === index && {
            animation: 'rotate 1s linear infinite',
            '@keyframes rotate': {
              'from': { transform: 'rotate(0deg)' },
              'to': { transform: 'rotate(360deg)' },
            },
          }),
        }}
      >
        <Iconify
          icon={
            isListening === index
              ? (isPreparing ? 'solar:refresh-linear' : 'solar:stop-circle-bold')
              : 'solar:microphone-bold'
          }
        />
      </IconButton>
      {!isMobile && (
        <IconButton
          size="small"
          disabled={!recordedAudios[index]}
          onClick={() => playRecordedAudio(index)}
          sx={{
            color: playingIndex === index ? 'info.main' : recordedAudios[index] ? 'info.main' : 'text.disabled',
            bgcolor: (theme) => (playingIndex === index || recordedAudios[index]) ? alpha(theme.palette.info.main, 0.08) : 'transparent',
          }}
        >
          <Iconify icon={playingIndex === index ? 'solar:stop-circle-bold' : 'solar:play-bold'} />
        </IconButton>
      )}
      <IconButton onClick={() => handleCheckAnswer(index)} size="small" color="success">
        <Iconify icon="solar:check-read-bold" />
      </IconButton>
    </>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading playlist...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 2, md: 5 }, px: { xs: 0, md: 3 }, width: 1 }}>
      {/* Header */}
      <Stack
        spacing={{ xs: 1, md: 0 }}
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{
          mb: 4,
          py: 1.5,
          borderBottom: (theme) => `solid 1px ${theme.vars.palette.divider}`
        }}
      >
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, md: 2 }} sx={{ flexGrow: 1, minWidth: 0 }}>
          <IconButton onClick={onBack} sx={{ bgcolor: 'background.neutral', flexShrink: 0 }}>
            <Iconify icon="eva:arrow-ios-back-fill" />
          </IconButton>

          <Stack spacing={0} sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {fileName}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {currentIndex + 1}/{playlist?.fileIds.length || 0} • {currentFileName}
            </Typography>
          </Stack>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent={{ xs: 'center', md: 'flex-end' }}
          spacing={1}
          sx={{ flexShrink: 0 }}
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
                disabled={!playlist || currentIndex === playlist.fileIds.length - 1}
                onClick={handleNext}
                sx={{ bgcolor: 'background.neutral' }}
              >
                <Iconify icon="solar:alt-arrow-right-bold" />
              </IconButton>
            </span>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.5, md: 1 }, height: 24, alignSelf: 'center' }} />

          <Tooltip title={autoPlay ? "Auto Play: ON" : "Auto Play: OFF"}>
            <IconButton
              size="small"
              color={autoPlay ? 'primary' : 'default'}
              onClick={() => setAutoPlay(!autoPlay)}
              sx={{ bgcolor: (theme) => (autoPlay ? alpha(theme.palette.primary.main, 0.16) : 'background.neutral') }}
            >
              <Iconify icon={autoPlay ? "solar:play-circle-bold" : "solar:play-circle-linear"} />
            </IconButton>
          </Tooltip>

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
        </Stack>
      </Stack>

      {loadingScript ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <Typography variant="body1" color="text.secondary">Loading script details...</Typography>
        </Box>
      ) : scriptData ? (
        <Stack spacing={4}>
          {/* Question Section */}
          <Card sx={{ p: { xs: 1, md: 3 }, border: (theme) => `solid 1px ${theme.vars.palette.divider}`, bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.5) }}>
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
                    <Typography
                      variant="h6"
                      onClick={() => { if (testMode) { const key = `q-${index}`; setRevealedLines(prev => ({ ...prev, [key]: !prev[key] })); } }}
                      sx={{
                        lineHeight: 1.5,
                        fontWeight: 700,
                        flexGrow: 1,
                        color: 'text.primary',
                        cursor: testMode ? 'pointer' : 'default',
                        transition: (theme) => theme.transitions.create(['filter', 'opacity']),
                        ...(testMode && !(revealedLines[`q-${index}`] ?? allRevealed) && {
                          filter: 'blur(8px)',
                          opacity: 0.3,
                          userSelect: 'none'
                        })
                      }}
                    >
                      {q.en || 'Untitled Question'}
                    </Typography>
                    {q.en && (
                      <IconButton
                        onClick={() => toggleSpeak(q.en, `q-${index}`)}
                        size="medium"
                        color={speakingIndex === `q-${index}` ? 'primary' : 'default'}
                        sx={{ mt: -0.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) }}
                      >
                        <Iconify icon={speakingIndex === `q-${index}` ? 'solar:stop-circle-bold' : 'solar:volume-loud-bold'} />
                      </IconButton>
                    )}
                  </Stack>

                  {q.ko && (
                    <Box
                      onClick={() => { const key = `q-${index}`; setRevealedLines(prev => ({ ...prev, [key]: !prev[key] })); }}
                      sx={{ ml: 4, p: 2, cursor: 'pointer', borderRadius: 1.5, bgcolor: 'background.paper', border: (theme) => `dashed 1px ${theme.vars.palette.divider}`, transition: (theme) => theme.transitions.create(['background-color']), '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'justify', transition: (theme) => theme.transitions.create(['filter', 'opacity']), ...(!(revealedLines[`q-${index}`] ?? allRevealed) && { filter: 'blur(6px)', opacity: 0.4, userSelect: 'none' }) }}>
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
              const isAnswerRevealed = revealedAnswers[index] || allRevealed;

              return (
                <Card
                  key={index}
                  sx={{
                    p: { xs: 1, md: 2.5 },
                    border: (theme) => `solid 1px ${!testMode && isRevealed ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
                    bgcolor: (theme) => !testMode && isRevealed ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                    boxShadow: (theme) => theme.customShadows?.z1,
                    transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {index + 1}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.5, flexGrow: 1 }}>
                        {line.ko}
                      </Typography>
                    </Stack>
                    <Divider sx={{ borderStyle: 'dashed' }} />
                     {testMode ? (
                        <Stack spacing={1.5}>
                          <TextField
                            fullWidth
                            inputRef={(el) => (inputRefs.current[index] = el)}
                            placeholder="Listen and type English..."
                            multiline={isMobile}
                            minRows={isMobile ? 3 : 1}
                            value={userAnswers[index] || ''}
                            onChange={(e) => {
                              const { value } = e.target;
                              setUserAnswers((prev) => (prev[index] === value ? prev : { ...prev, [index]: value }));
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCheckAnswer(index); }}
                            autoComplete="off"
                            slotProps={{
                              input: {
                                readOnly: isListening === index,
                                endAdornment: !isMobile && (
                                  <InputAdornment position="end" sx={{ gap: 0.5 }}>
                                    {renderActionButtons(index)}
                                  </InputAdornment>
                                ),
                              }
                            }}
                          />
                          {isMobile && (
                            <Stack direction="row" justifyContent="flex-end" spacing={1}>
                              {renderActionButtons(index)}
                            </Stack>
                          )}
                        {(result || allRevealed) && (
                          <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.8), border: (theme) => `solid 1px ${theme.vars.palette.divider}` }}>
                            {result && (
                              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', columnGap: 0.8, rowGap: 0.5, alignItems: 'center' }}>
                                <Box sx={{ px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: (theme) => alpha(theme.palette.info.main, 0.1), color: 'info.main', fontSize: 10, fontWeight: 900, mr: 0.5, flexShrink: 0 }}>답변</Box>
                                {result.map((word: any, wIndex: number) => word.uWord && (
                                  <Typography key={wIndex} variant="body1" sx={{ color: word.isCorrect ? 'info.main' : 'error.main', fontWeight: 700, textDecoration: word.isCorrect ? 'none' : 'line-through' }}>{word.uWord}</Typography>
                                ))}
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 0.8, rowGap: 0.5, alignItems: 'center' }}>
                              <Box sx={{ px: 0.75, py: 0.25, borderRadius: 0.5, bgcolor: (theme) => alpha(theme.palette.success.main, 0.1), color: 'success.main', fontSize: 10, fontWeight: 900, mr: 0.5, flexShrink: 0 }}>정답</Box>
                              {result ? (
                                result.map((word: any, wIndex: number) => (word.cWord || (!isAnswerRevealed && word.masked)) && (
                                  <Typography key={wIndex} variant="body1" sx={{ fontWeight: 700, color: isAnswerRevealed ? 'text.primary' : 'text.disabled', letterSpacing: isAnswerRevealed ? 0 : 1 }}>{isAnswerRevealed ? word.cWord : word.masked}</Typography>
                                ))
                              ) : (
                                <Typography variant="body1" sx={{ fontWeight: 700, color: isAnswerRevealed ? 'text.primary' : 'text.disabled' }}>
                                  {isAnswerRevealed ? line.en : line.en.replace(/[a-zA-Z0-9]/g, '*')}
                                </Typography>
                              )}
                              <IconButton size="small" onClick={() => setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }))} sx={{ ml: 0.5, p: 0.5, color: isAnswerRevealed ? 'primary.main' : 'text.disabled' }}>
                                <Iconify icon={isAnswerRevealed ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => toggleSpeak(line.en, `line-result-${index}`)}
                                sx={{ ml: 0.5, p: 0.5, color: speakingIndex === `line-result-${index}` ? 'primary.main' : 'primary.main' }}
                              >
                                <Iconify icon={speakingIndex === `line-result-${index}` ? 'solar:stop-circle-bold' : 'solar:volume-loud-bold'} width={16} />
                              </IconButton>
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Box onClick={() => toggleLine(index)} sx={{ p: 1.5, flexGrow: 1, cursor: 'pointer', borderRadius: 1, bgcolor: isRevealed ? 'transparent' : (theme) => alpha(theme.palette.action.hover, 0.04), transition: (theme) => theme.transitions.create(['filter', 'opacity', 'background-color']), '&:hover': { bgcolor: (theme) => isRevealed ? 'transparent' : alpha(theme.palette.action.hover, 0.08) } }}>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary', lineHeight: 1.6, ...(!isRevealed && { filter: 'blur(8px)', opacity: 0.3, userSelect: 'none', transform: 'scale(0.99)' }) }}>{line.en}</Typography>
                        </Box>
                        <IconButton
                          onClick={() => toggleSpeak(line.en, `line-view-${index}`)}
                          color={speakingIndex === `line-view-${index}` ? 'primary' : 'default'}
                          size="small"
                          sx={{ mt: 1, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08), '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16) } }}
                        >
                          <Iconify icon={speakingIndex === `line-view-${index}` ? 'solar:stop-circle-bold' : 'solar:volume-loud-bold'} />
                        </IconButton>
                      </Stack>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </Stack>
      ) : (
        <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'background.neutral', borderRadius: 2 }}>
          <Iconify icon="solar:document-text-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.disabled' }}>스크립트 정보가 없습니다.</Typography>
        </Box>
      )}
    </Box>
  );
}

