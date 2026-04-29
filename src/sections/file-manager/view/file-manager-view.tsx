'use client';

import type { IFile, IFileFilters } from 'src/types/file';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBoolean, useSetState, useLocalStorage } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';

import { fIsBetween } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { _allFiles, FILE_TYPE_OPTIONS } from 'src/_mock';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { fileFormat } from 'src/components/file-thumbnail';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { useTable, rowInPage, getComparator } from 'src/components/table';
import { LoadingScreen } from 'src/components/loading-screen';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import TREE_DATA from 'src/api/dummy/default.json';
import { getTreeData, saveTreeData, getFileScript, clearAllScripts, getFullData, saveFullData } from 'src/api/indexDB';
import { FileManagerFilters } from '../file-manager-filters';
import { FileManagerSidebar } from '../file-manager-sidebar';
import { FileManagerGridView } from '../file-manager-grid-view';
import { FileManagerFiltersResult } from '../file-manager-filters-result';
import { FileManagerCreateFolderDialog } from '../file-manager-create-folder-dialog';
import { OpicEditorView } from '../opic-editor-view';
import { OpicLiveView } from '../opic-live-view';

// ----------------------------------------------------------------------

export function FileManagerView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const table = useTable({ defaultRowsPerPage: 10 });

  const confirmDialog = useBoolean();
  const backupConfirm = useBoolean();
  const newFilesDialog = useBoolean();

  const [pendingAction, setPendingAction] = useState<'upload' | 'reset' | null>(null);
  const [pendingUploadData, setPendingUploadData] = useState<any>(null);

  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'live'>('list');
  const [selectedFile, setSelectedFile] = useState<{ id: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state: isCollapsed, setState: setIsCollapsed } = useLocalStorage(
    'file-manager-sidebar-collapsed',
    false
  );

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [treeData, setTreeData] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync URL params to state on mount and when popstate occurs
  useEffect(() => {
    if (isLoaded) {
      const folderId = searchParams.get('folder');
      const view = searchParams.get('view') as 'list' | 'editor' | 'live' | null;
      const fileId = searchParams.get('fileId');
      const fileName = searchParams.get('fileName');

      setCurrentFolderId(folderId || null);
      setViewMode(view || 'list');
      if (fileId && fileName) {
        setSelectedFile({ id: fileId, name: fileName });
      } else {
        setSelectedFile(null);
      }
    }
  }, [searchParams, isLoaded]);

  const updateURL = useCallback(
    (params: { folder?: string | null; view?: string | null; fileId?: string | null; fileName?: string | null }) => {
      const newParams = new URLSearchParams(searchParams.toString());

      if (params.folder !== undefined) {
        if (params.folder) newParams.set('folder', params.folder);
        else newParams.delete('folder');
      }
      if (params.view !== undefined) {
        if (params.view && params.view !== 'list') newParams.set('view', params.view);
        else newParams.delete('view');
      }
      if (params.fileId !== undefined) {
        if (params.fileId) newParams.set('fileId', params.fileId);
        else newParams.delete('fileId');
      }
      if (params.fileName !== undefined) {
        if (params.fileName) newParams.set('fileName', params.fileName);
        else newParams.delete('fileName');
      }

      const query = newParams.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      router.push(url);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getTreeData();
        const sanitizedData = sanitizeTreeData(data);
        setTreeData(sanitizedData);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load tree data from IndexedDB', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveTreeData(treeData).catch((error) => {
        console.error('Failed to save tree data to IndexedDB', error);
      });
    }
  }, [treeData, isLoaded]);

  const filters = useSetState<IFileFilters>({
    name: '',
    type: [],
    startDate: null,
    endDate: null,
  });
  const { state: currentFilters } = filters;

  // Flatten TREE_DATA to find paths and parents
  const flattenedTree = useMemo(() => {
    const results: any[] = [];
    const flatten = (nodes: any[], parentId: string | null = null, parents: string[] = []) => {
      nodes.forEach((node) => {
        results.push({ ...node, parentId, parentIds: parents });
        if (node.children) {
          flatten(node.children, node.id, [...parents, node.id]);
        }
      });
    };
    flatten(treeData);
    return results;
  }, [treeData]);

  const currentFolder = useMemo(
    () => flattenedTree.find((f) => f.id === currentFolderId),
    [flattenedTree, currentFolderId]
  );

  // Convert TREE_DATA nodes to IFile format for the grid
  const dataForGrid = useMemo(() => {
    const nodes = currentFolderId
      ? flattenedTree.find((f) => f.id === currentFolderId)?.children || []
      : treeData;

    return nodes.map((node: any) => ({
      id: node.id,
      name: node.label,
      type: node.type,
      url: '',
      size: 0,
      tags: [],
      isFavorited: !!node.isFavorited,
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
      shared: null,
      totalFiles: node.children?.length || 0,
    })) as IFile[];
  }, [currentFolderId, flattenedTree, treeData]);

  const dataFiltered = applyFilter({
    inputData: dataForGrid,
    comparator: getComparator(table.order, table.orderBy),
    filters: currentFilters,
  });

  const dataInPage = rowInPage(dataFiltered, table.page, table.rowsPerPage);

  const canReset =
    !!currentFilters.name ||
    currentFilters.type.length > 0 ||
    (!!currentFilters.startDate && !!currentFilters.endDate);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleNavigate = useCallback(
    (id: string | null) => {
      updateURL({ folder: id, view: 'list', fileId: null, fileName: null });
      table.onResetPage();
    },
    [updateURL, table]
  );

  const handleOpenFile = useCallback(
    async (id: string) => {
      const item = flattenedTree.find((f) => f.id === id);
      if (item && item.type === 'file') {
        updateURL({ view: 'live', fileId: item.id, fileName: item.label });
      }
    },
    [flattenedTree, updateURL]
  );

  const handleCreateItem = useCallback(
    (name: string, type: 'folder' | 'file') => {
      const now = new Date().toISOString();
      const newItem = {
        id: Date.now().toString(),
        label: name,
        type,
        createdAt: now,
        modifiedAt: now,
        ...(type === 'folder' && { children: [] }),
      };

      const updateTree = (nodes: any[]): any[] => {
        if (!currentFolderId) {
          return [...nodes, newItem];
        }

        return nodes.map((node) => {
          if (node.id === currentFolderId) {
            return {
              ...node,
              children: [...(node.children || []), newItem],
            };
          }
          if (node.children) {
            return {
              ...node,
              children: updateTree(node.children),
            };
          }
          return node;
        });
      };

      setTreeData((prev) => updateTree(prev));
      toast.success(`Create ${type} success!`);
    },
    [currentFolderId]
  );

  const handleDownload = useCallback(async () => {
    const fullData = await getFullData();
    const dataStr = JSON.stringify(fullData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    link.download = `file-manager-backup-${date}-${time}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Download success!');
  }, []);

  const handleReset = useCallback(async () => {
    await saveFullData(TREE_DATA as any);
    setTreeData(TREE_DATA.tree);
    handleNavigate(null);
    toast.success('Reset success!');
  }, [handleNavigate]);

  const applyUpload = useCallback(async (data: any) => {
    if (data && typeof data === 'object' && 'tree' in data && 'scripts' in data) {
      await saveFullData(data);
      setTreeData(data.tree);
      toast.success('Upload success!');
    } else if (Array.isArray(data)) {
      await saveFullData({ tree: data, scripts: {} });
      setTreeData(data);
      toast.success('Upload success (tree only)!');
    } else {
      toast.error('Invalid JSON format.');
    }
  }, []);

  const handleUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          setPendingUploadData(json);
          setPendingAction('upload');
          backupConfirm.onTrue();
        } catch (error) {
          toast.error('Failed to parse JSON');
        }
      };
      reader.readAsText(file);
    }
    // Reset input value to allow uploading the same file again
    event.target.value = '';
  }, [backupConfirm]);

  const handleDeleteItem = useCallback(
    (id: string) => {
      const item = flattenedTree.find((f) => f.id === id);

      if (item?.type === 'folder' && item.children?.length > 0) {
        toast.error('Cannot delete a folder that is not empty!');
        return;
      }

      const deleteFromTree = (nodes: any[]): any[] =>
        nodes
          .filter((node) => node.id !== id)
          .map((node) => ({
            ...node,
            children: node.children ? deleteFromTree(node.children) : undefined,
          }));

      setTreeData((prev) => deleteFromTree(prev));
      toast.success('Delete success!');
    },
    [flattenedTree]
  );

  const handleDeleteItems = useCallback(() => {
    const idsToDelete = table.selected;

    const hasNonEmptyFolder = idsToDelete.some((id) => {
      const item = flattenedTree.find((f) => f.id === id);
      return item?.type === 'folder' && item.children?.length > 0;
    });

    if (hasNonEmptyFolder) {
      toast.error('Some selected folders are not empty!');
      return;
    }

    const deleteFromTree = (nodes: any[]): any[] =>
      nodes
        .filter((node) => !idsToDelete.includes(node.id))
        .map((node) => ({
          ...node,
          children: node.children ? deleteFromTree(node.children) : undefined,
        }));

    setTreeData((prev) => deleteFromTree(prev));
    table.onSelectAllRows(false, []);
    toast.success('Delete success!');
  }, [table, flattenedTree]);

  const handleFavoriteItem = useCallback(
    (id: string) => {
      const updateFavoriteInTree = (nodes: any[]): any[] =>
        nodes.map((node) => {
          if (node.id === id) {
            return { ...node, isFavorited: !node.isFavorited, modifiedAt: new Date().toISOString() };
          }
          if (node.children) {
            return { ...node, children: updateFavoriteInTree(node.children) };
          }
          return node;
        });
      setTreeData((prev) => updateFavoriteInTree(prev));
    },
    []
  );

  const renderFilters = () => (
    <Box
      sx={{
        gap: 2,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-end', md: 'center' },
      }}
    >
      <FileManagerFilters filters={filters} onResetPage={table.onResetPage} />
    </Box>
  );

  const renderResults = () => (
    <FileManagerFiltersResult
      filters={filters}
      totalResults={dataFiltered.length}
      onResetPage={table.onResetPage}
    />
  );

  const renderUploadFilesDialog = () => (
    <FileManagerCreateFolderDialog open={newFilesDialog.value} onClose={newFilesDialog.onFalse} />
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content={
        <>
          Are you sure want to delete <strong> {table.selected.length} </strong> items?
        </>
      }
      action={
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            handleDeleteItems();
            confirmDialog.onFalse();
          }}
        >
          Delete
        </Button>
      }
    />
  );

  const renderBackupConfirmDialog = () => (
    <ConfirmDialog
      open={backupConfirm.value}
      onClose={() => {
        backupConfirm.onFalse();
        setPendingAction(null);
        setPendingUploadData(null);
      }}
      title="백업 확인"
      content="업로드/초기화 전에 파일을 백업하시겠습니까?"
      cancelLabel="취소"
      action={
        <>
          {pendingAction === 'reset' ? (
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                await handleReset();
                backupConfirm.onFalse();
                setPendingAction(null);
                setPendingUploadData(null);
              }}
            >
              초기화
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                if (pendingUploadData) {
                  await applyUpload(pendingUploadData);
                }
                backupConfirm.onFalse();
                setPendingAction(null);
                setPendingUploadData(null);
              }}
            >
              업로드
            </Button>
          )}

          <Button
            variant="contained"
            color="success"
            onClick={async () => {
              await handleDownload();
              if (pendingAction === 'reset') {
                await handleReset();
              } else if (pendingAction === 'upload' && pendingUploadData) {
                await applyUpload(pendingUploadData);
              }
              backupConfirm.onFalse();
              setPendingAction(null);
              setPendingUploadData(null);
            }}
          >
            백업
          </Button>
        </>
      }
    />
  );

  const renderBreadcrumbs = () => {
    if (!currentFolderId) return null;

    const pathNodes = currentFolder?.parentIds.map((pid: string) => flattenedTree.find((f) => f.id === pid)) || [];

    return (
      <Breadcrumbs separator={<Iconify icon="eva:chevron-right-fill" width={16} />} sx={{ mb: 2 }}>
        <Link
          component="span"
          color="inherit"
          sx={{ cursor: 'pointer', typography: 'body2' }}
          onClick={() => handleNavigate(null)}
        >
          Root
        </Link>
        {pathNodes.map((node: any) => (
          <Link
            key={node.id}
            component="span"
            color="inherit"
            sx={{ cursor: 'pointer', typography: 'body2' }}
            onClick={() => handleNavigate(node.id)}
          >
            {node.label}
          </Link>
        ))}
        <Typography variant="body2" color="text.primary">
          {currentFolder?.label}
        </Typography>
      </Breadcrumbs>
    );
  };

  if (!isLoaded) {
    return <LoadingScreen sx={{ minHeight: '60vh' }} />;
  }

  return (
    <>
      <DashboardContent
        maxWidth={false}
        disablePadding
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexGrow: 1,
          minHeight: 0,
          maxWidth: 'none!important',
          m: 0,
          width: '100%',
        }}
      >
        <FileManagerSidebar
          data={treeData}
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          selectedId={currentFolderId}
          onSelectId={handleNavigate}
          onOpenFile={handleOpenFile}
        />

        <Box sx={{ flexGrow: 1, minWidth: 0, height: '100%', overflowY: 'auto' }}>
          {viewMode === 'list' ? (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 3,
                  pb: 0,
                  pl: isCollapsed ? 6 : 3,
                  transition: (theme) => theme.transitions.create(['padding-left']),
                }}
              >
                <Box>
                  <Typography variant="h4" sx={{ mb: 1 }}>OPIC Drive</Typography>
                  {renderBreadcrumbs()}
                </Box>
                <Stack direction="row" spacing={1}>
                  <IconButton
                    color="error"
                    onClick={() => {
                      setPendingAction('reset');
                      backupConfirm.onTrue();
                    }}
                    sx={{ bgcolor: 'error.main', color: 'error.contrastText', '&:hover': { bgcolor: 'error.dark' } }}
                  >
                    <Iconify icon="solar:restart-bold" />
                  </IconButton>

                  <IconButton
                    color="info"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ bgcolor: 'info.main', color: 'info.contrastText', '&:hover': { bgcolor: 'info.dark' } }}
                  >
                    <Iconify icon="eva:cloud-upload-fill" />
                  </IconButton>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    accept=".json"
                    style={{ display: 'none' }}
                  />

                  <IconButton
                    color="success"
                    onClick={handleDownload}
                    sx={{ bgcolor: 'success.main', color: 'success.contrastText', '&:hover': { bgcolor: 'success.dark' } }}
                  >
                    <Iconify icon="eva:download-fill" />
                  </IconButton>
                </Stack>
              </Box>

              <Stack spacing={2.5} sx={{ p: 3 }}>
                {renderFilters()}
                {canReset && renderResults()}
                <FileManagerGridView
                  table={table}
                  dataFiltered={dataFiltered}
                  onDeleteItem={handleDeleteItem}
                  onUpdateItem={(id, name) => {
                    const updateNameInTree = (nodes: any[]): any[] =>
                      nodes.map((node) => {
                        if (node.id === id) {
                          return { ...node, label: name, modifiedAt: new Date().toISOString() };
                        }
                        if (node.children) {
                          return { ...node, children: updateNameInTree(node.children) };
                        }
                        return node;
                      });
                    setTreeData((prev) => updateNameInTree(prev));
                    toast.success('Rename success!');
                  }}
                  onCreateItem={handleCreateItem}
                  onOpenConfirm={confirmDialog.onTrue}
                  onNavigate={handleNavigate}
                  onOpenFile={handleOpenFile}
                  onFavoriteItem={handleFavoriteItem}
                  notFound={notFound}
                />
              </Stack>
            </>
          ) : viewMode === 'editor' && selectedFile ? (
            <OpicEditorView
              fileId={selectedFile.id}
              fileName={selectedFile.name}
              onBack={() => updateURL({ view: 'list', fileId: null, fileName: null })}
              onSaveSuccess={() => updateURL({ view: 'live' })}
              onSave={(id) => {
                const updateModifiedAt = (nodes: any[]): any[] =>
                  nodes.map((node) => {
                    if (node.id === id) {
                      return { ...node, modifiedAt: new Date().toISOString() };
                    }
                    if (node.children) {
                      return { ...node, children: updateModifiedAt(node.children) };
                    }
                    return node;
                  });
                setTreeData((prev) => updateModifiedAt(prev));
              }}
            />
          ) : viewMode === 'live' && selectedFile ? (
            <OpicLiveView
              fileId={selectedFile.id}
              fileName={selectedFile.name}
              onBack={() => updateURL({ view: 'list', fileId: null, fileName: null })}
              onEdit={() => updateURL({ view: 'editor' })}
            />
          ) : null}
        </Box>
      </DashboardContent>

      {renderUploadFilesDialog()}
      {renderConfirmDialog()}
      {renderBackupConfirmDialog()}
    </>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  inputData: IFile[];
  filters: IFileFilters;
  comparator: (a: any, b: any) => number;
};

function applyFilter({ inputData, comparator, filters }: ApplyFilterProps) {
  const { name, type, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter((file) => file.name.toLowerCase().includes(name.toLowerCase()));
  }

  if (type.length) {
    inputData = inputData.filter((file) => type.includes(fileFormat(file.type)));
  }

  if (startDate && endDate) {
    inputData = inputData.filter((file) => fIsBetween(file.createdAt, startDate, endDate));
  }

  return inputData;
}

// ----------------------------------------------------------------------

function sanitizeTreeData(nodes: any[]): any[] {
  const now = new Date().toISOString();
  return nodes.map((node) => {
    const updatedNode = {
      ...node,
      createdAt: node.createdAt || now,
      modifiedAt: node.modifiedAt || now,
    };
    if (node.children) {
      updatedNode.children = sanitizeTreeData(node.children);
    }
    return updatedNode;
  });
}
