import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocalStorage } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import ListItemText from '@mui/material/ListItemText';
import InputAdornment from '@mui/material/InputAdornment';
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

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
    paddingRight: theme.spacing(0.5),
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 20,
    fontWeight: theme.typography.fontWeightMedium,
    [`& .${treeItemClasses.iconContainer}`]: {
      marginRight: 0,
      width: 10,
      '& svg': {
        width: 12,
        height: 12,
      },
    },
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
      fontSize: theme.typography.pxToRem(13),
      fontWeight: 'inherit',
      color: 'inherit',
      minWidth: 0,
    },
  },
  [`& .${treeItemClasses.groupTransition}`]: {
    marginLeft: 4,
    paddingLeft: 6,
    borderLeft: `1px solid ${theme.vars.palette.divider}`,
  },
}));

// ----------------------------------------------------------------------

const WIDTH_KEY = 'file-manager-sidebar-width';

type Props = {
  data: any[];
  isCollapsed: boolean;
  onToggle: VoidFunction;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
};

export function FileManagerSidebar({ data, isCollapsed, onToggle, selectedId, onSelectId }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [introFinished, setIntroFinished] = useState(false);

  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const { state: width, setState: setWidth } = useLocalStorage(WIDTH_KEY, 280);

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

  // Flatten tree for search and include parent lineage
  const flattenedData = useMemo(() => {
    const results: any[] = [];
    const flatten = (nodes: any[], parentPath = '', parents: string[] = []) => {
      nodes.forEach((node) => {
        const currentPath = parentPath ? `${parentPath}/${node.label}` : node.label;
        const currentParents = [...parents];
        results.push({ ...node, path: currentPath, parentIds: currentParents });
        if (node.children) {
          flatten(node.children, currentPath, [...currentParents, node.id]);
        }
      });
    };
    flatten(data);
    return results;
  }, [data]);

  // Effect to expand parents when selectedId changes externally (e.g. from Grid View)
  useEffect(() => {
    if (selectedId) {
      const item = flattenedData.find((f) => f.id === selectedId);
      if (item) {
        setExpandedItems((prev) => {
          const newExpanded = [...new Set([...prev, ...item.parentIds])];
          return newExpanded;
        });
      }
    }
  }, [selectedId, flattenedData]);

  const handleAutocompleteChange = (event: any, newValue: any) => {
    if (newValue) {
      onSelectId(newValue.id);
    }
  };

  // Use default values until mounted to avoid hydration mismatch
  const displayWidth = isMounted ? width : 280;
  const displayCollapsed = isMounted ? isCollapsed : true;

  const renderTree = (nodes: any) => (
    <StyledTreeItem
      key={nodes.id}
      itemId={nodes.id}
      label={
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.3}
          sx={{ py: 0.5, minWidth: 0 }}
          onClick={(event) => {
            event.stopPropagation();
            onSelectId(nodes.id);
          }}
        >
          <Iconify
            icon={
              nodes.type === 'folder'
                ? 'solar:folder-2-bold-duotone'
                : 'solar:document-text-bold-duotone'
            }
            width={14}
            sx={{
              flexShrink: 0,
              color: nodes.type === 'folder' ? 'warning.main' : 'text.disabled',
            }}
          />
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontSize: 'inherit',
              fontWeight: 'inherit',
              flexGrow: 1,
              minWidth: 0,
            }}
          >
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
          spacing={1.5}
          sx={{
            p: 1.5,
            width: displayWidth,
            minWidth: displayWidth,
            opacity: isMounted ? 1 : 0,
            height: '100%',
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

          <Autocomplete
            fullWidth
            size="small"
            options={flattenedData}
            getOptionLabel={(option) => option.label}
            onChange={handleAutocompleteChange}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search..."
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
            renderOption={(props, option) => {
              const { key, ...optionProps } = props as any;
              return (
                <li key={key} {...optionProps}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: 1 }}>
                    <Iconify
                      icon={
                        option.type === 'folder'
                          ? 'solar:folder-2-bold-duotone'
                          : 'solar:document-text-bold-duotone'
                      }
                      width={18}
                      sx={{
                        color: option.type === 'folder' ? 'warning.main' : 'text.disabled',
                      }}
                    />
                    <ListItemText
                      primary={option.label}
                      secondary={option.path}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true, sx: { opacity: 0.6 } }}
                    />
                  </Stack>
                </li>
              );
            }}
          />

          <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <SimpleTreeView
              aria-label="file system navigator"
              expandedItems={expandedItems}
              onExpandedItemsChange={(event, items) => setExpandedItems(items)}
              selectedItems={selectedId}
              onSelectedItemsChange={(event, itemId) => onSelectId(itemId)}
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
              }}
            >
              {data.map((node) => renderTree(node))}
            </SimpleTreeView>
          </Box>
        </Stack>

        {!displayCollapsed && <ResizeHandle onMouseDown={handleMouseDown} />}
      </RootStyle>

      <IconButton
        onClick={onToggle}
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
