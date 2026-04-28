'use client';

import type { IFile, IFileFilters } from 'src/types/file';

import { useState, useCallback, useMemo } from 'react';
import { useBoolean, useSetState, useLocalStorage } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
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

import { TREE_DATA } from '../file-manager-tree-data';
import { FileManagerFilters } from '../file-manager-filters';
import { FileManagerSidebar } from '../file-manager-sidebar';
import { FileManagerGridView } from '../file-manager-grid-view';
import { FileManagerFiltersResult } from '../file-manager-filters-result';
import { FileManagerCreateFolderDialog } from '../file-manager-create-folder-dialog';

// ----------------------------------------------------------------------

export function FileManagerView() {
  const table = useTable({ defaultRowsPerPage: 10 });

  const confirmDialog = useBoolean();
  const newFilesDialog = useBoolean();
  const { state: isCollapsed, setState: setIsCollapsed } = useLocalStorage(
    'file-manager-sidebar-collapsed',
    false
  );

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [tableData, setTableData] = useState<IFile[]>(_allFiles);

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
    flatten(TREE_DATA);
    return results;
  }, []);

  const currentFolder = useMemo(
    () => flattenedTree.find((f) => f.id === currentFolderId),
    [flattenedTree, currentFolderId]
  );

  // Convert TREE_DATA nodes to IFile format for the grid
  const dataForGrid = useMemo(() => {
    const nodes = currentFolderId
      ? flattenedTree.find((f) => f.id === currentFolderId)?.children || []
      : TREE_DATA;

    return nodes.map((node: any) => ({
      id: node.id,
      name: node.label,
      type: node.type,
      url: '',
      size: 0,
      tags: [],
      isFavorited: false,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      shared: null,
      totalFiles: node.children?.length || 0,
    })) as IFile[];
  }, [currentFolderId, flattenedTree]);

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
      if (!id) {
        setCurrentFolderId(null);
        return;
      }
      const item = flattenedTree.find((f) => f.id === id);
      if (item) {
        if (item.type === 'folder') {
          setCurrentFolderId(id);
        } else if (item.parentId) {
          setCurrentFolderId(item.parentId);
        }
      }
      table.onResetPage();
    },
    [flattenedTree, table]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      toast.success('Delete success!');
      // In a real app, we would update the source data
    },
    []
  );

  const handleDeleteItems = useCallback(() => {
    toast.success('Delete success!');
  }, []);

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
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          selectedId={currentFolderId}
          onSelectId={handleNavigate}
        />

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
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
              <Typography variant="h4" sx={{ mb: 1 }}>File manager</Typography>
              {renderBreadcrumbs()}
            </Box>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              onClick={newFilesDialog.onTrue}
            >
              Upload
            </Button>
          </Box>

          <Stack spacing={2.5} sx={{ p: 3 }}>
            {renderFilters()}
            {canReset && renderResults()}
            {notFound ? <EmptyContent filled sx={{ py: 10 }} /> : (
              <FileManagerGridView
                table={table}
                dataFiltered={dataFiltered}
                onDeleteItem={handleDeleteItem}
                onOpenConfirm={confirmDialog.onTrue}
                onNavigate={handleNavigate}
              />
            )}
          </Stack>
        </Box>
      </DashboardContent>

      {renderUploadFilesDialog()}
      {renderConfirmDialog()}
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
