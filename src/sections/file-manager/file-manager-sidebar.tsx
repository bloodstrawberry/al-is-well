import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const MIN_WIDTH = 240;
const MAX_WIDTH = 480;

const RootStyle = styled(Box, {
  shouldForwardProp: (prop) =>
    !['width', 'isCollapsed', 'isResizing', 'isOpening', 'introFinished'].includes(prop as string),
})<{
  width: number;
  isCollapsed: boolean;
  isResizing: boolean;
  isOpening: boolean;
  introFinished: boolean;
}>(({ width, isCollapsed, isResizing, isOpening, introFinished, theme }) => ({
  height: '100%',
  display: 'flex',
  position: 'relative',
  flexDirection: 'column',
  width: isOpening || isCollapsed ? 0 : width,
  ...(!isResizing && {
    transition: theme.transitions.create(['width'], {
      easing: theme.transitions.easing.sharp,
      duration: introFinished ? theme.transitions.duration.shorter : 800,
    }),
  }),
  borderRight: `solid 1px ${theme.vars.palette.divider}`,
  backgroundColor: theme.vars.palette.background.neutral,
  overflow: 'hidden',
}));

const ResizeHandle = styled(Box)(({ theme }) => ({
  top: 0,
  right: -4,
  bottom: 0,
  width: 8,
  zIndex: 10,
  cursor: 'col-resize',
  position: 'absolute',
  '&:hover': {
    '&::after': {
      backgroundColor: theme.vars.palette.primary.main,
    },
  },
  '&::after': {
    content: '""',
    top: 0,
    left: 3,
    bottom: 0,
    width: 2,
    position: 'absolute',
    transition: theme.transitions.create(['background-color']),
  },
}));

// ----------------------------------------------------------------------

const WIDTH_KEY = 'file-manager-sidebar-width';
const COLLAPSED_KEY = 'file-manager-sidebar-collapsed';

export function FileManagerSidebar() {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [introFinished, setIntroFinished] = useState(false);

  const { state: width, setState: setWidth } = useLocalStorage(WIDTH_KEY, 280);
  const { state: isCollapsed, setState: setIsCollapsed } = useLocalStorage(COLLAPSED_KEY, false);
  
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const openTimer = setTimeout(() => setIsOpening(false), 100);
    const finishTimer = setTimeout(() => setIntroFinished(true), 1000);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    window.requestAnimationFrame(() => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + deltaX));
      setWidth(newWidth);
    });
  }, [isResizing, setWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'auto';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'auto';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Use default values until mounted to avoid hydration mismatch
  const displayWidth = isMounted ? width : 280;
  const displayCollapsed = isMounted ? isCollapsed : true;

  return (
    <Box sx={{ position: 'relative', display: 'flex' }}>
      <RootStyle
        width={displayWidth}
        isCollapsed={displayCollapsed}
        isResizing={isResizing}
        isOpening={isOpening}
        introFinished={introFinished}
      >
        <Stack
          spacing={2}
          sx={{
            p: 2,
            width: displayWidth,
            minWidth: displayWidth,
            opacity: isMounted ? 1 : 0,
            transition: (theme) => theme.transitions.create(['opacity']),
          }}
        >
          <Typography variant="h6">Folders</Typography>

          <Stack spacing={1}>
            {['Images', 'Documents', 'Videos', 'Audio'].map((folder) => (
              <Stack
                key={folder}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Iconify icon="eva:folder-fill" width={24} sx={{ color: 'warning.main' }} />
                <Typography variant="body2">{folder}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>

        {!displayCollapsed && <ResizeHandle onMouseDown={handleMouseDown} />}
      </RootStyle>

      <IconButton
        onClick={() => setIsCollapsed(!displayCollapsed)}
        sx={{
          p: 0.5,
          top: 12,
          left: displayCollapsed ? 4 : displayWidth - 16,
          zIndex: 11,
          width: 32,
          height: 32,
          position: 'absolute',
          bgcolor: 'background.paper',
          border: (theme) => `solid 1px ${theme.vars.palette.divider}`,
          '&:hover': { bgcolor: 'background.neutral' },
          transition: (theme) => theme.transitions.create(['left', 'opacity']),
          opacity: isMounted && !isResizing ? 1 : 0,
        }}
      >
        <Iconify
          icon={displayCollapsed ? 'eva:arrow-ios-forward-fill' : 'eva:arrow-ios-back-fill'}
          width={16}
        />
      </IconButton>
    </Box>
  );
}
