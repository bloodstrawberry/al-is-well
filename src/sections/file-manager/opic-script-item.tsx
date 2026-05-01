import { memo, useRef, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  index: number;
  line: {
    en: string;
    ko: string;
  };
  testMode: boolean;
  isRevealed: boolean;
  userAnswer: string;
  result: any;
  isAnswerRevealed: boolean;
  isListening: boolean;
  isPreparing: boolean;
  playingIndex: boolean;
  speakingIndex: boolean;
  isMobile: boolean;
  recordedAudio?: string;
  setInputRef: (index: number, el: any) => void;
  onToggleLine: (index: number) => void;
  onToggleSpeak: (text: string, index: number | string) => void;
  onChangeAnswer: (index: number, value: string) => void;
  onCheckAnswer: (index: number) => void;
  onStartListening: (index: number) => void;
  onStopListening: () => void;
  onPlayRecordedAudio: (index: number) => void;
  onToggleAnswerReveal: (index: number) => void;
};

export const OpicScriptItem = memo(({
  index,
  line,
  testMode,
  isRevealed,
  userAnswer,
  result,
  isAnswerRevealed,
  isListening,
  isPreparing,
  playingIndex,
  speakingIndex,
  isMobile,
  recordedAudio,
  setInputRef,
  onToggleLine,
  onToggleSpeak,
  onChangeAnswer,
  onCheckAnswer,
  onStartListening,
  onStopListening,
  onPlayRecordedAudio,
  onToggleAnswerReveal,
}: Props) => {
  // Use local state for immediate feedback during typing to avoid stuttering
  const [localValue, setLocalValue] = useState(userAnswer || '');
  const lastUserAnswerRef = useRef(userAnswer || '');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when external userAnswer changes (e.g. from speech recognition)
  useEffect(() => {
    if (userAnswer !== lastUserAnswerRef.current) {
      setLocalValue(userAnswer || '');
      lastUserAnswerRef.current = userAnswer || '';
    }
  }, [userAnswer]);

  // Clean up timer on unmount
  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setLocalValue(value);
    lastUserAnswerRef.current = value;

    // Debounce the parent state update to avoid laggy typing
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onChangeAnswer(index, value);
    }, 500); // 500ms debounce
  };

  const handleBlur = () => {
    // Sync immediately on blur
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onChangeAnswer(index, localValue);
  };

  const handleAction = (type: 'check' | 'listening' | 'audio') => {
    // Sync immediately before any action
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    onChangeAnswer(index, localValue);

    if (type === 'check') onCheckAnswer(index);
    else if (type === 'listening') (isListening ? onStopListening() : onStartListening(index));
    else if (type === 'audio') onPlayRecordedAudio(index);
  };

  const renderActionButtons = (
    <>
      <IconButton
        size="small"
        color={isListening ? 'error' : 'default'}
        onClick={() => handleAction('listening')}
        sx={{
          ...(isListening && !isPreparing && {
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)', opacity: 1 },
              '50%': { transform: 'scale(1.2)', opacity: 0.7 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }),
          ...(isPreparing && isListening && {
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
            isListening
              ? (isPreparing ? 'solar:refresh-linear' : 'solar:stop-circle-bold')
              : 'solar:microphone-bold'
          }
        />
      </IconButton>
      {!isMobile && (
        <IconButton
          size="small"
          disabled={!recordedAudio}
          onClick={() => handleAction('audio')}
          sx={{
            color: playingIndex ? 'info.main' : recordedAudio ? 'info.main' : 'text.disabled',
            bgcolor: (theme) => (playingIndex || recordedAudio) ? alpha(theme.palette.info.main, 0.08) : 'transparent',
          }}
        >
          <Iconify icon={playingIndex ? 'solar:stop-circle-bold' : 'solar:play-bold'} />
        </IconButton>
      )}
      <IconButton onClick={() => handleAction('check')} size="small" color="success">
        <Iconify icon="solar:check-read-bold" />
      </IconButton>
    </>
  );

  return (
    <Card
      sx={{
        p: { xs: 2, md: 2.5 },
        border: (theme) => `solid 1px ${!testMode && isRevealed ? theme.vars.palette.primary.main : theme.vars.palette.divider
          }`,
        bgcolor: (theme) => !testMode && isRevealed ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
        boxShadow: (theme) => theme.customShadows?.z1,
        transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
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
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              inputRef={(el) => setInputRef(index, el)}
              placeholder="Listen and type English..."
              multiline={isMobile}
              minRows={isMobile ? 3 : 1}
              value={localValue}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAction('check');
                }
              }}
              autoComplete="off"
              slotProps={{
                input: {
                  readOnly: isListening,
                  endAdornment: !isMobile && (
                    <InputAdornment position="end" sx={{ gap: 0.5 }}>
                      {renderActionButtons}
                    </InputAdornment>
                  ),
                },
              }}
            />

            {isMobile && (
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                {renderActionButtons}
              </Stack>
            )}

            {(result || isAnswerRevealed) && (
              <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.8), border: (theme) => `solid 1px ${theme.vars.palette.divider}` }}>
                {/* Your Answer */}
                {result && (
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
                )}

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
                  {result ? (
                    result.map((word: any, wIndex: number) => (word.cWord || (!isAnswerRevealed && word.masked)) && (
                      <Typography key={wIndex} variant="body1" sx={{ fontWeight: 700, color: isAnswerRevealed ? 'text.primary' : 'text.disabled', letterSpacing: isAnswerRevealed ? 0 : 1 }}>{isAnswerRevealed ? word.cWord : word.masked}</Typography>
                    ))
                  ) : (
                    <Typography variant="body1" sx={{ fontWeight: 700, color: isAnswerRevealed ? 'text.primary' : 'text.disabled' }}>
                      {isAnswerRevealed ? line.en : line.en.replace(/[a-zA-Z0-9]/g, '*')}
                    </Typography>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => onToggleAnswerReveal(index)}
                    sx={{ ml: 0.5, p: 0.5, color: isAnswerRevealed ? 'primary.main' : 'text.disabled' }}
                  >
                    <Iconify icon={isAnswerRevealed ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={16} />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={() => onToggleSpeak(line.en, `line-${index}`)}
                    sx={{ ml: 0.5, p: 0.5, color: speakingIndex ? 'primary.main' : 'primary.main' }}
                  >
                    <Iconify icon={speakingIndex ? 'solar:stop-circle-bold' : 'solar:volume-loud-bold'} width={16} />
                  </IconButton>
                </Box>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box
              onClick={() => onToggleLine(index)}
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
              onClick={() => onToggleSpeak(line.en, `line-${index}`)}
              color={speakingIndex ? 'primary' : 'default'}
              size="small"
              sx={{
                mt: 1,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16) },
              }}
            >
              <Iconify icon={speakingIndex ? 'solar:stop-circle-bold' : 'solar:volume-loud-bold'} />
            </IconButton>
          </Stack>
        )}
      </Stack>
    </Card>
  );
});
