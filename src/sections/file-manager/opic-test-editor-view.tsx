import { useState, useEffect, useMemo, useRef } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { getTreeData, getFileScript, saveFileScript } from 'src/api/indexDB';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

type PlaylistData = {
  fileIds: string[];
};

type Props = {
  fileId: string;
  fileName: string;
  onBack: () => void;
  onSaveSuccess: () => void;
  onStartTest?: () => void;
  onSave?: (fileId: string) => void;
  storageKey?: string;
};

export function OpicTestEditorView({ fileId, fileName, onBack, onSaveSuccess, onStartTest, onSave, storageKey }: Props) {
  const theme = useTheme();

  const [playlist, setPlaylist] = useState<PlaylistData>({ fileIds: [] });
  const [driveFiles, setDriveFiles] = useState<{ id: string; label: string; path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const initialPlaylistRef = useRef<any>(null);

  // Load drive files for autocomplete
  useEffect(() => {
    const loadDrive = async () => {
      try {
        const tree = await getTreeData(); // Defaults to main DRIVE
        const files: { id: string; label: string; path: string }[] = [];
        const seenIds = new Set<string>();

        const flatten = (nodes: any[], parentPath = '') => {
          nodes.forEach((node) => {
            const currentPath = parentPath ? `${parentPath} / ${node.label}` : node.label;
            if (node.type === 'file') {
              if (!seenIds.has(node.id)) {
                files.push({ id: node.id, label: node.label, path: parentPath || 'Root' });
                seenIds.add(node.id);
              }
            }
            if (node.children) flatten(node.children, currentPath);
          });
        };
        flatten(tree);
        setDriveFiles(files);
      } catch (error) {
        console.error('Failed to load drive files', error);
      }
    };
    loadDrive();
  }, []);

  // Load current playlist
  useEffect(() => {
    const loadPlaylist = async () => {
      setLoading(true);
      try {
        const data = await getFileScript(fileId, storageKey);
        if (data && data.fileIds) {
          const uniqueFileIds = Array.from(new Set(data.fileIds as string[]));
          const cleanedData = { ...data, fileIds: uniqueFileIds };
          setPlaylist(cleanedData);
          initialPlaylistRef.current = JSON.stringify(cleanedData);
        } else {
          initialPlaylistRef.current = JSON.stringify({ fileIds: [] });
        }
      } catch (error) {
        console.error('Failed to load playlist', error);
      } finally {
        setLoading(false);
      }
    };
    loadPlaylist();
  }, [fileId, storageKey]);

  const handleSave = async (silent = false) => {
    try {
      const currentDataStr = JSON.stringify(playlist);
      const hasChanged = currentDataStr !== initialPlaylistRef.current;

      await saveFileScript(fileId, playlist, storageKey);
      onSave?.(fileId);
      
      if (!silent || hasChanged) {
        toast.success('Playlist saved successfully!');
      }

      initialPlaylistRef.current = currentDataStr;
      onSaveSuccess();
    } catch (error) {
      console.error('Failed to save playlist', error);
      toast.error('Failed to save playlist');
    }
  };

  const handleRemoveFile = (idToRemove: string) => {
    setPlaylist((prev) => ({
      ...prev,
      fileIds: prev.fileIds.filter((id) => id !== idToRemove),
    }));
  };

  const selectedFiles = useMemo(() => {
    return playlist.fileIds.map(id => driveFiles.find(f => f.id === id)).filter(Boolean) as { id: string; label: string; path: string }[];
  }, [playlist.fileIds, driveFiles]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Typography variant="h6" color="text.secondary">Loading playlist...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 5 }, px: { xs: 2, md: 8 } }}>
      {/* Sticky Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          mb: 4,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          bgcolor: theme.palette.background.default,
          backgroundImage: 'none',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: -100,
            left: 0,
            right: 0,
            height: 100,
            bgcolor: theme.palette.background.default,
          },
          py: 1.5,
          mx: { xs: -2, md: -8 },
          px: { xs: 2, md: 8 },
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
          {fileName}
        </Typography>

        <Stack direction="row" spacing={1}>
          <Tooltip title="저장">
            <IconButton
              color="primary"
              onClick={() => handleSave(false)}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: (theme) => theme.customShadows?.primary,
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              <Iconify icon="solar:diskette-bold" />
            </IconButton>
          </Tooltip>

          {onStartTest && (
            <Tooltip title="Test 시작">
              <IconButton
                color="info"
                onClick={async () => {
                  await handleSave(true);
                  onStartTest();
                }}
                sx={{
                  bgcolor: 'info.main',
                  color: 'info.contrastText',
                  boxShadow: (theme) => theme.customShadows?.info,
                  '&:hover': { bgcolor: 'info.dark' }
                }}
              >
                <Iconify icon="solar:play-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <Stack spacing={4}>
        <Card sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>DRIVE에서 스크립트 추가</Typography>

            <Autocomplete
              multiple
              fullWidth
              disableCloseOnSelect
              options={driveFiles}
              value={selectedFiles}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={() => null}
              renderOption={(props, option, { selected }) => {
                const { key, ...optionProps } = props;
                return (
                  <li key={option.id} {...optionProps}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{
                        width: 1,
                        py: 0.5,
                        px: 1,
                        borderRadius: 1,
                        transition: (theme) => theme.transitions.create('background-color'),
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Stack spacing={0.2} sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          noWrap
                          sx={{
                            color: selected ? 'primary.main' : 'text.primary',
                            fontWeight: selected ? 800 : 600
                          }}
                        >
                          {option.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }} noWrap>
                          {option.path}
                        </Typography>
                      </Stack>
                      {selected && (
                        <Iconify
                          icon="eva:checkmark-circle-2-fill"
                          sx={{ color: 'primary.main', width: 20, height: 20 }}
                        />
                      )}
                    </Stack>
                  </li>
                );
              }}
              onChange={(event, newValue) => {
                setPlaylist((prev) => ({
                  ...prev,
                  fileIds: newValue.map((v) => v.id),
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="스크립트 검색"
                  placeholder="DRIVE 파일 이름 입력..."
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />
          </Stack>
        </Card>

        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            테스트 스크립트 목록 ({selectedFiles.length})
          </Typography>

          {selectedFiles.length > 0 ? (
            <Stack spacing={1.5} sx={{ userSelect: { xs: 'none', md: 'auto' } }}>
              {selectedFiles.map((file, index) => (
                <Card
                  key={file.id}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    border: (theme) => `solid 1px ${theme.vars.palette.divider}`,
                    bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.4),
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      mr: 2,
                      flexShrink: 0
                    }}
                  >
                    {index + 1}
                  </Typography>

                  <Stack spacing={0.5} sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                      {file.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }} noWrap>
                      {file.path}
                    </Typography>
                  </Stack>

                  <IconButton color="error" onClick={() => handleRemoveFile(file.id)}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Card>
              ))}
            </Stack>
          ) : (
            <Box
              sx={{
                py: 10,
                textAlign: 'center',
                bgcolor: 'background.neutral',
                borderRadius: 2,
                border: (theme) => `dashed 1px ${theme.vars.palette.divider}`,
              }}
            >
              <Iconify icon="solar:document-add-bold-duotone" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                추가된 스크립트가 없습니다. 위에서 검색하여 추가해 주세요.
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}

