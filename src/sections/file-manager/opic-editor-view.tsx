import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { getFileScript, saveFileScript } from 'src/api/indexDB';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type Line = {
  ko: string;
  en: string;
};

type ScriptData = {
  question: string;
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
  const [scriptData, setScriptData] = useState<ScriptData>({
    question: '',
    audioUrl: '',
    lines: [{ ko: '', en: '' }],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScript = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId);
        if (data) {
          setScriptData(data);
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

  if (loading) {
    return <Box sx={{ p: 3 }}>Loading...</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={onBack}>
          <Iconify icon="eva:arrow-ios-back-fill" />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>Edit Script: {fileName}</Typography>
        <Button variant="contained" color="primary" onClick={handleSave}>Save Changes</Button>
      </Stack>

      <Stack spacing={4} sx={{ maxWidth: 800 }}>
        <TextField
          fullWidth
          label="OPIc Question"
          value={scriptData.question}
          onChange={(e) => setScriptData({ ...scriptData, question: e.target.value })}
          multiline
          rows={4}
        />

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
                  <Iconify icon="solar:music-note-bold" />
                </InputAdornment>
              ),
            },
          }}
        />

        {scriptData.audioUrl && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Audio Preview</Typography>
            <audio controls src={scriptData.audioUrl} style={{ width: '100%' }} />
          </Box>
        )}

        <Stack spacing={2}>
          <Typography variant="subtitle1">Script Lines</Typography>
          {scriptData.lines.map((line, index) => (
            <Stack key={index} direction="row" spacing={2} alignItems="flex-start" sx={{ p: 2, borderRadius: 1, bgcolor: 'background.neutral' }}>
              <Stack spacing={2} sx={{ flexGrow: 1 }}>
                <TextField
                  fullWidth
                  label="Korean"
                  value={line.ko}
                  onChange={(e) => handleChangeLine(index, 'ko', e.target.value)}
                  multiline
                />
                <TextField
                  fullWidth
                  label="English"
                  value={line.en}
                  onChange={(e) => handleChangeLine(index, 'en', e.target.value)}
                  multiline
                />
              </Stack>
              <IconButton color="error" onClick={() => handleRemoveLine(index)} disabled={scriptData.lines.length === 1} sx={{ mt: 1 }}>
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            </Stack>
          ))}
          <Button
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleAddLine}
            variant="soft"
            fullWidth
            size="large"
          >
            Add Line
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 5, pb: 10 }}>
        <Button variant="contained" size="large" color="primary" onClick={handleSave} sx={{ px: 5 }}>Save Changes</Button>
      </Stack>
    </Box>
  );
}
