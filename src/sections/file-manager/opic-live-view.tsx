import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { getFileScript } from 'src/api/indexDB';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type Props = {
  fileId: string;
  fileName: string;
  onBack: () => void;
  onEdit: () => void;
};

export function OpicLiveView({ fileId, fileName, onBack, onEdit }: Props) {
  const [scriptData, setScriptData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [revealedLines, setRevealedLines] = useState<Record<number, boolean>>({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [showKoQuestion, setShowKoQuestion] = useState(false);
  
  const [testMode, setTestMode] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [testResults, setTestResults] = useState<Record<number, { words: { text: string; isCorrect: boolean }[]; masked: string }>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadScript = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId);
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
    const newRevealed: Record<number, boolean> = {};
    if (scriptData?.lines) {
      scriptData.lines.forEach((_: any, index: number) => {
        newRevealed[index] = newState;
      });
    }
    setRevealedLines(newRevealed);
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech is not supported in this browser.');
    }
  };

  const handleCheckAnswer = (index: number) => {
    const userAnswer = (userAnswers[index] || '').trim();
    const correctAnswer = (scriptData.lines[index].en || '').trim();

    const uWords = userAnswer.split(/\s+/);
    const cWords = correctAnswer.split(/\s+/);

    const clean = (str: string) => str?.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") || "";

    const results = uWords.map((uWord: string, i: number) => {
      const cWord = cWords[i] || "";
      return {
        text: uWord,
        isCorrect: clean(uWord) === clean(cWord)
      };
    });

    const masked = cWords.map((cWord: string, i: number) => {
      const uWord = uWords[i] || "";
      if (clean(uWord) === clean(cWord)) {
        return cWord;
      }
      return cWord.replace(/[a-zA-Z0-9]/g, "*");
    }).join(' ');

    setTestResults(prev => ({ 
      ...prev, 
      [index]: { words: results, masked } 
    }));
  };

  if (loading) {
    return <Box sx={{ p: 3 }}>Loading...</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={onBack}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>{fileName}</Typography>

        <Stack direction="row" spacing={1}>
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
            sx={{ bgcolor: (theme) => (testMode ? 'info.lighter' : 'background.neutral'), borderRadius: 1 }}
          >
            <Iconify icon="solar:pen-new-square-bold" />
          </IconButton>

          <IconButton
            color={allRevealed ? 'warning' : 'success'}
            onClick={toggleAll}
            sx={{ bgcolor: (theme) => (allRevealed ? 'warning.lighter' : 'success.lighter'), borderRadius: 1 }}
          >
            <Iconify icon={allRevealed ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
          </IconButton>

          <IconButton
            color="primary"
            onClick={onEdit}
            sx={{ bgcolor: 'primary.lighter', borderRadius: 1 }}
          >
            <Iconify icon="solar:pen-bold" />
          </IconButton>
        </Stack>
      </Stack>

      <Stack spacing={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Question</Typography>

          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Typography variant="h6" sx={{ whiteSpace: 'pre-wrap', fontWeight: 'medium', flexGrow: 1 }}>
                {scriptData?.questionEn || scriptData?.question || ' '}
              </Typography>
              {(scriptData?.questionEn || scriptData?.question) && (
                <IconButton onClick={() => handleSpeak(scriptData?.questionEn || scriptData?.question)} size="small" color="primary">
                  <Iconify icon="solar:volume-loud-bold" />
                </IconButton>
              )}
            </Stack>

            {scriptData?.questionKo && (
              <Box
                onClick={() => setShowKoQuestion(!showKoQuestion)}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  borderRadius: 1,
                  bgcolor: 'background.neutral',
                  border: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
                  transition: (theme) => theme.transitions.create(['filter', 'opacity']),
                  ...(!showKoQuestion && {
                    '&:hover': { bgcolor: 'action.hover' }
                  })
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    transition: (theme) => theme.transitions.create(['filter', 'opacity']),
                    ...(!showKoQuestion && {
                      filter: 'blur(6px)',
                      opacity: 0.4,
                      userSelect: 'none'
                    })
                  }}
                >
                  {scriptData.questionKo}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        {scriptData?.audioUrl && (
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Audio Player</Typography>
            <audio controls src={scriptData.audioUrl} style={{ width: '100%', maxWidth: 500 }} />
          </Box>
        )}

        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Script</Typography>
            {testMode ? (
              <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                TEST MODE: Type English and press Enter
              </Typography>
            ) : (
              !allRevealed && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  * Click each box to reveal English
                </Typography>
              )
            )}
          </Stack>

          {scriptData?.lines?.map((line: any, index: number) => {
            const isRevealed = revealedLines[index] ?? allRevealed;
            const result = testResults[index];
            const isAnswerRevealed = revealedAnswers[index];

            return (
              <Stack
                key={index}
                direction="row"
                alignItems="flex-start"
                spacing={1}
              >
                <Box
                  onClick={testMode ? undefined : () => toggleLine(index)}
                  sx={{
                    p: 2,
                    flexGrow: 1,
                    cursor: testMode ? 'default' : 'pointer',
                    borderRadius: 1.5,
                    bgcolor: 'background.neutral',
                    border: (theme) => `solid 1px ${
                      !testMode && isRevealed ? theme.vars.palette.primary.main : theme.vars.palette.divider
                    }`,
                    transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
                    ...(!testMode && {
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    })
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 'bold',
                      color: 'text.primary',
                      mb: testMode ? 2 : 1,
                    }}
                  >
                    {line.ko}
                  </Typography>

                  {testMode ? (
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Type English here..."
                        value={userAnswers[index] || ''}
                        onChange={(e) => setUserAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCheckAnswer(index);
                          }
                        }}
                        autoComplete="off"
                      />
                      
                      {result && (
                        <Stack spacing={1} sx={{ bgcolor: 'background.paper', p: 1.5, borderRadius: 1, border: (theme) => `solid 1px ${theme.vars.palette.divider}` }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 1, fontWeight: 'bold' }}>나의 답변:</Typography>
                            {result.words.map((word, wIndex) => (
                              <Typography 
                                key={wIndex} 
                                variant="body2" 
                                sx={{ 
                                  color: word.isCorrect ? 'success.main' : 'error.main',
                                  fontWeight: 'medium'
                                }}
                              >
                                {word.text}
                              </Typography>
                            ))}
                          </Box>
                          
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>정답:</Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                flexGrow: 1, 
                                fontFamily: 'monospace',
                                color: isAnswerRevealed ? 'text.primary' : 'text.disabled'
                              }}
                            >
                              {isAnswerRevealed ? line.en : result.masked}
                            </Typography>
                            <IconButton 
                              size="small" 
                              onClick={() => setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }))}
                            >
                              <Iconify icon={isAnswerRevealed ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                            </IconButton>
                          </Stack>
                        </Stack>
                      )}
                    </Stack>
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 'regular',
                        color: 'text.primary',
                        transition: (theme) => theme.transitions.create(['filter', 'opacity', 'transform']),
                        ...(!isRevealed && {
                          filter: 'blur(8px)',
                          opacity: 0.3,
                          userSelect: 'none',
                          transform: 'scale(0.98)',
                        }),
                      }}
                    >
                      {line.en}
                    </Typography>
                  )}
                </Box>

                {!testMode && (
                  <IconButton
                    onClick={() => handleSpeak(line.en)}
                    color="primary"
                    sx={{
                      mt: 1,
                      bgcolor: 'background.neutral',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    <Iconify icon="solar:volume-loud-bold-duotone" />
                  </IconButton>
                )}
              </Stack>
            );
          }) || (
              <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                No script lines available.
              </Typography>
            )}
        </Stack>
      </Stack>
    </Box>
  );
}
