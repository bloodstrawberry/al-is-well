import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { getFileScript, saveFileScript } from 'src/api/indexDB';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type Line = {
  ko: string;
  en: string;
};

type ScriptData = {
  questionEn: string;
  questionKo: string;
  audioUrl: string;
  lines: Line[];
};

type Props = {
  fileId: string;
  fileName: string;
  onBack: () => void;
  onSaveSuccess: () => void;
};

export function OpicEditorView({ fileId, fileName, onBack, onSaveSuccess }: Props) {
  const theme = useTheme();
  
  const [scriptData, setScriptData] = useState<ScriptData>({
    questionEn: '',
    questionKo: '',
    audioUrl: '',
    lines: [{ ko: '', en: '' }],
  });

  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState('');
  const bulkModal = useBoolean();

  useEffect(() => {
    const loadScript = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId);
        if (data) {
          setScriptData({
            questionEn: data.questionEn || data.question || '',
            questionKo: data.questionKo || '',
            audioUrl: data.audioUrl || '',
            lines: data.lines || [{ ko: '', en: '' }],
          });
        }
      } catch (error) {
        console.error('Failed to load script', error);
      } finally {
        setLoading(false);
      }
    };
    loadScript();
  }, [fileId]);

  const handleSave = async () => {
    try {
      await saveFileScript(fileId, scriptData);
      toast.success('Script saved successfully!');
      onSaveSuccess();
    } catch (error) {
      console.error('Failed to save script', error);
      toast.error('Failed to save script');
    }
  };

  const handleAddLine = () => {
    setScriptData((prev) => ({
      ...prev,
      lines: [...prev.lines, { ko: '', en: '' }],
    }));
  };

  const handleRemoveLine = (index: number) => {
    setScriptData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const handleChangeLine = (index: number, field: keyof Line, value: string) => {
    setScriptData((prev) => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, lines: newLines };
    });
  };

  const handleBulkApply = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const newLines: Line[] = [];
    for (let i = 0; i < lines.length; i += 2) {
      if (lines[i + 1]) {
        newLines.push({ ko: lines[i], en: lines[i + 1] });
      }
    }

    if (newLines.length > 0) {
      setScriptData((prev) => ({
        ...prev,
        lines: newLines,
      }));
      setBulkText('');
      bulkModal.onFalse();
      toast.success(`${newLines.length} lines applied!`);
    } else {
      toast.error('Invalid format. Please provide Korean and English pairs.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading editor...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 5 }, px: { xs: 1, md: 3 } }}>
      {/* Sticky Header */}
      <Stack 
        direction="row" 
        alignItems="center" 
        spacing={2} 
        sx={{ 
          mb: 4, 
          position: 'sticky', 
          top: 0, 
          bgcolor: 'background.default', 
          zIndex: 10, 
          py: 1,
          borderBottom: (theme) => `solid 1px ${theme.vars.palette.divider}`,
        }}
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
          Edit: {fileName}
        </Typography>

        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSave}
          startIcon={<Iconify icon="solar:diskette-bold" />}
          sx={{ boxShadow: (theme) => theme.customShadows?.primary }}
        >
          Save
        </Button>
      </Stack>

      <Stack spacing={5}>
        {/* Question Configuration */}
        <Card sx={{ p: 3, border: (theme) => `solid 1px ${theme.vars.palette.divider}` }}>
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Configuration</Typography>
            
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="English Question"
                value={scriptData.questionEn}
                onChange={(e) => setScriptData({ ...scriptData, questionEn: e.target.value })}
                multiline
                rows={2}
                placeholder="Type the English question here..."
              />
              <TextField
                fullWidth
                label="Korean Translation"
                value={scriptData.questionKo}
                onChange={(e) => setScriptData({ ...scriptData, questionKo: e.target.value })}
                multiline
                rows={2}
                placeholder="Type the Korean translation here..."
              />
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <TextField
              fullWidth
              label="Audio URL"
              value={scriptData.audioUrl}
              onChange={(e) => setScriptData({ ...scriptData, audioUrl: e.target.value })}
              placeholder="https://example.com/audio.mp3"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="solar:music-note-bold" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            {scriptData.audioUrl && (
              <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: 'background.neutral' }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1, fontWeight: 800 }}>AUDIO PREVIEW</Typography>
                <audio controls src={scriptData.audioUrl} style={{ width: '100%' }} />
              </Box>
            )}
          </Stack>
        </Card>

        {/* Script Lines Section */}
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Script Lines 
              <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.disabled', fontWeight: 400 }}>
                ({scriptData.lines.length} lines)
              </Typography>
            </Typography>
            <Button
              size="small"
              variant="soft"
              color="info"
              startIcon={<Iconify icon="solar:import-bold" />}
              onClick={bulkModal.onTrue}
            >
              Bulk Import
            </Button>
          </Stack>

          <Stack spacing={2}>
            {scriptData.lines.map((line, index) => (
              <Card 
                key={index} 
                sx={{ 
                  p: 2.5, 
                  border: (theme) => `solid 1px ${theme.vars.palette.divider}`,
                  bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.3),
                  position: 'relative',
                  '&:hover .delete-btn': { opacity: 1 }
                }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: 'text.disabled',
                      color: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                      mt: 1.5
                    }}
                  >
                    {index + 1}
                  </Box>

                  <Stack spacing={2.5} sx={{ flexGrow: 1 }}>
                    <TextField
                      fullWidth
                      label="Korean"
                      value={line.ko}
                      onChange={(e) => handleChangeLine(index, 'ko', e.target.value)}
                      multiline
                      variant="standard"
                      placeholder="Korean line..."
                      slotProps={{
                        input: { sx: { fontWeight: 600 } }
                      }}
                    />
                    <TextField
                      fullWidth
                      label="English"
                      value={line.en}
                      onChange={(e) => handleChangeLine(index, 'en', e.target.value)}
                      multiline
                      variant="standard"
                      placeholder="English translation..."
                      slotProps={{
                        input: { sx: { color: 'primary.main', fontWeight: 500 } }
                      }}
                    />
                  </Stack>

                  <IconButton 
                    className="delete-btn"
                    color="error" 
                    onClick={() => handleRemoveLine(index)} 
                    disabled={scriptData.lines.length === 1} 
                    sx={{ 
                      mt: 1, 
                      opacity: { xs: 1, md: 0 }, 
                      transition: (theme) => theme.transitions.create('opacity'),
                      bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                      '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.16) }
                    }}
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Stack>
              </Card>
            ))}
          </Stack>

          <Button
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleAddLine}
            variant="outlined"
            fullWidth
            size="large"
            sx={{ 
              py: 2, 
              borderWidth: 2, 
              borderStyle: 'dashed',
              borderRadius: 2,
              borderColor: 'divider',
              '&:hover': { borderColor: 'primary.main', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) }
            }}
          >
            Add New Line
          </Button>
        </Stack>
      </Stack>

      {/* Footer Save Button for Mobile */}
      <Box sx={{ mt: 8, pb: 10, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          size="large" 
          color="primary" 
          onClick={handleSave} 
          sx={{ 
            px: 8, 
            height: 56, 
            borderRadius: 2,
            boxShadow: (theme) => theme.customShadows?.primary
          }}
        >
          Save Script
        </Button>
      </Box>

      <Dialog open={bulkModal.value} onClose={bulkModal.onFalse} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Bulk Import Lines</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Paste Korean and English pairs below. Each pair will be converted into one script line.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={12}
            placeholder={"Korean line 1\nEnglish translation 1\n\nKorean line 2\nEnglish translation 2..."}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            sx={{ 
              '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: 14 } 
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={bulkModal.onFalse} color="inherit" variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            color="info"
            onClick={handleBulkApply}
            disabled={!bulkText.trim()}
          >
            Apply to Script
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
