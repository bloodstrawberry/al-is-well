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
import { useOpicSpeech } from './hooks/use-opic-speech';

// ----------------------------------------------------------------------

import { OpicScriptItem } from './opic-script-item';

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
        <Typography variant="h6" color="text.secondary">Loading script...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 5 }, px: { xs: 2, md: 8 } }}>
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

          {scriptData?.lines?.map((line: any, index: number) => (
            <OpicScriptItem
              key={index}
              index={index}
              line={line}
              testMode={testMode}
              isRevealed={revealedLines[index] ?? allRevealed}
              userAnswer={userAnswers[index]}
              result={testResults[index]}
              isAnswerRevealed={revealedAnswers[index] || allRevealed}
              isListening={isListening === index}
              isPreparing={isPreparing}
              playingIndex={playingIndex === index}
              speakingIndex={speakingIndex === `line-${index}`}
              isMobile={isMobile}
              recordedAudio={recordedAudios[index]}
              setInputRef={setInputRef}
              onToggleLine={toggleLine}
              onToggleSpeak={toggleSpeak}
              onChangeAnswer={handleChangeAnswer}
              onCheckAnswer={handleCheckAnswer}
              onStartListening={startListening}
              onStopListening={stopListening}
              onPlayRecordedAudio={playRecordedAudio}
              onToggleAnswerReveal={handleToggleAnswerReveal}
            />
          )) || (
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
