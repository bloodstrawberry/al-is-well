import { useState, useEffect, useCallback } from 'react';

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

// ----------------------------------------------------------------------

type Props = {
  fileId: string;
  fileName: string;
  onBack: () => void;
  onEdit: () => void;
};

export function OpicLiveView({ fileId, fileName, onBack, onEdit }: Props) {
  const theme = useTheme();

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
      utterance.rate = 0.85; // Slightly slower for better clarity
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech is not supported in this browser.');
    }
  };

  const handleCheckAnswer = (index: number) => {
    const userAnswer = (userAnswers[index] || '').trim();
    const correctAnswer = (scriptData.lines[index].en || '').trim();

    if (!userAnswer) return;

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
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading script...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 5 } }}>
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
        
        <Typography 
          variant="h5" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fileName}
        </Typography>

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

          <Stack spacing={2.5}>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              <Typography variant="h6" sx={{ lineHeight: 1.5, fontWeight: 700, flexGrow: 1, color: 'text.primary' }}>
                {scriptData?.questionEn || scriptData?.question || 'Untitled Question'}
              </Typography>
              {(scriptData?.questionEn || scriptData?.question) && (
                <IconButton 
                  onClick={() => handleSpeak(scriptData?.questionEn || scriptData?.question)} 
                  size="medium" 
                  color="primary"
                  sx={{ mt: -0.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) }}
                >
                  <Iconify icon="solar:volume-loud-bold" />
                </IconButton>
              )}
            </Stack>

            {scriptData?.questionKo && (
              <Box
                onClick={() => setShowKoQuestion(!showKoQuestion)}
                sx={{
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
              {testMode ? 'TEST MODE: Typing enabled' : '* Click to reveal English'}
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
                  border: (theme) => `solid 1px ${
                    !testMode && isRevealed ? theme.vars.palette.primary.main : theme.vars.palette.divider
                  }`,
                  bgcolor: (theme) => !testMode && isRevealed ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                  boxShadow: (theme) => theme.customShadows?.z1,
                  transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
                }}
              >
                <Stack spacing={2}>
                  {/* Korean Text */}
                  <Stack direction="row" spacing={2} alignItems="flex-start">
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
                        mt: 0.5
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
                              <InputAdornment position="end">
                                <IconButton onClick={() => handleSpeak(line.en)} size="small" color="primary">
                                  <Iconify icon="solar:volume-loud-bold" />
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      
                      {result && (
                        <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.8), border: `solid 1px ${theme.vars.palette.divider}` }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.disabled', width: '100%', mb: 0.5, fontWeight: 800 }}>YOUR ANSWER</Typography>
                            {result.words.map((word, wIndex) => (
                              <Typography 
                                key={wIndex} 
                                variant="body2" 
                                sx={{ 
                                  color: word.isCorrect ? 'success.main' : 'error.main',
                                  fontWeight: 700,
                                  textDecoration: word.isCorrect ? 'none' : 'line-through'
                                }}
                              >
                                {word.text}
                              </Typography>
                            ))}
                          </Box>
                          
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 0.5, fontWeight: 800 }}>CORRECT ANSWER</Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600,
                                  letterSpacing: isAnswerRevealed ? 0 : 2,
                                  fontFamily: isAnswerRevealed ? 'inherit' : 'monospace',
                                  color: isAnswerRevealed ? 'text.primary' : 'text.disabled'
                                }}
                              >
                                {isAnswerRevealed ? line.en : result.masked}
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              onClick={() => setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }))}
                              sx={{ bgcolor: 'background.paper' }}
                            >
                              <Iconify icon={isAnswerRevealed ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                            </IconButton>
                          </Stack>
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
