import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';

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

const StyledTreeItem = styled(TreeItem)(({ theme }) => ({
  color: theme.vars.palette.text.secondary,
  [`& .${treeItemClasses.content}`]: {
    paddingRight: theme.spacing(1),
    fontWeight: theme.typography.fontWeightMedium,
    '&.Mui-expanded': {
      fontWeight: theme.typography.fontWeightRegular,
    },
    '&:hover': {
      backgroundColor: theme.vars.palette.action.hover,
    },
    '&.Mui-focused, &.Mui-selected, &.Mui-selected.Mui-focused': {
      backgroundColor: `var(--tree-view-bg-color, ${theme.vars.palette.action.selected})`,
      color: 'var(--tree-view-color)',
    },
    [`& .${treeItemClasses.label}`]: {
      fontWeight: 'inherit',
      color: 'inherit',
    },
  },
  [`& .${treeItemClasses.groupTransition}`]: {
    marginLeft: 15,
    paddingLeft: 18,
    borderLeft: `1px solid ${theme.vars.palette.divider}`,
  },
}));

// ----------------------------------------------------------------------

const WIDTH_KEY = 'file-manager-sidebar-width';
const COLLAPSED_KEY = 'file-manager-sidebar-collapsed';

import { TREE_DATA } from './file-manager-tree-data';

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      window.requestAnimationFrame(() => {
        const deltaX = e.clientX - startXRef.current;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + deltaX));
        setWidth(newWidth);
      });
    },
    [isResizing, setWidth]
  );

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

  const renderTree = (nodes: any) => (
    <StyledTreeItem
      key={nodes.id}
      itemId={nodes.id}
      label={
        <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
          <Iconify
            icon={
              nodes.type === 'folder'
                ? 'solar:folder-2-bold-duotone'
                : 'solar:document-text-bold-duotone'
            }
            width={18}
            sx={{
              color: nodes.type === 'folder' ? 'warning.main' : 'text.disabled',
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 'inherit', flexGrow: 1 }}>
            {nodes.label}
          </Typography>
        </Stack>
      }
    >
      {Array.isArray(nodes.children) ? nodes.children.map((node: any) => renderTree(node)) : null}
    </StyledTreeItem>
  );

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
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Explorer
            </Typography>
            <IconButton size="small">
              <Iconify icon="solar:menu-dots-bold" width={16} />
            </IconButton>
          </Stack>

          <SimpleTreeView
            aria-label="file system navigator"
            sx={{
              flexGrow: 1,
              maxWidth: 400,
              overflowY: 'auto',
            }}
          >
            {TREE_DATA.map((node) => renderTree(node))}
          </SimpleTreeView>
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
