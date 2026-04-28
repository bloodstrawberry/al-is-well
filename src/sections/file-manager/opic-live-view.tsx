import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import { getFileScript } from 'src/api/indexDB';

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
  const [allRevealed, setAllRevealed] = useState(true);

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
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // Slightly slower for better clarity
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-speech is not supported in this browser.');
    }
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
          <Button
            variant="soft"
            color={allRevealed ? 'warning' : 'success'}
            startIcon={<Iconify icon={allRevealed ? 'solar:eye-closed-bold' : 'solar:eye-bold'} />}
            onClick={toggleAll}
          >
            {allRevealed ? 'Memorize Mode' : 'Show All'}
          </Button>

          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={onEdit}
          >
            Edit Script
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>Question</Typography>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Typography variant="h6" sx={{ whiteSpace: 'pre-wrap', fontWeight: 'medium', flexGrow: 1 }}>
              {scriptData?.question || ' '}
            </Typography>
            {scriptData?.question && (
              <IconButton onClick={() => handleSpeak(scriptData.question)} size="small" color="primary">
                <Iconify icon="solar:volume-loud-bold" />
              </IconButton>
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
            {!allRevealed && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                * Click each box to reveal English
              </Typography>
            )}
          </Stack>
          
          {scriptData?.lines?.map((line: any, index: number) => {
            const isRevealed = revealedLines[index] ?? allRevealed;
            
            return (
              <Stack
                key={index}
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <Box
                  onClick={() => toggleLine(index)}
                  sx={{
                    p: 2,
                    flexGrow: 1,
                    cursor: 'pointer',
                    borderRadius: 1.5,
                    bgcolor: 'background.neutral',
                    border: (theme) => `solid 1px ${isRevealed ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
                    transition: (theme) => theme.transitions.create(['border-color', 'background-color']),
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 'bold',
                      color: 'text.primary',
                      mb: 1,
                    }}
                  >
                    {line.ko}
                  </Typography>
                  
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
                </Box>
                
                <IconButton
                  onClick={() => handleSpeak(line.en)}
                  color="primary"
                  sx={{
                    bgcolor: 'background.neutral',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Iconify icon="solar:volume-loud-bold-duotone" />
                </IconButton>
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
