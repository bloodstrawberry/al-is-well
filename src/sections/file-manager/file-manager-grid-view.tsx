import type { IFile } from 'src/types/file';
import type { UseTableReturn } from 'src/components/table';

import { useBoolean, usePopover } from 'minimal-shared/hooks';
import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

import { FileManagerPanel } from './file-manager-panel';
import { FileManagerFileItem } from './file-manager-file-item';
import { FileManagerFolderItem } from './file-manager-folder-item';
import { FileManagerShareDialog } from './file-manager-share-dialog';
import { FileManagerActionSelected } from './file-manager-action-selected';
import { EmptyContent } from 'src/components/empty-content';
import { FileManagerCreateFolderDialog } from './file-manager-create-folder-dialog';

// ----------------------------------------------------------------------

const INVALID_CHARACTERS = /[<>:"/\\|?*]/;

// ----------------------------------------------------------------------

type Props = {
  table: UseTableReturn;
  dataFiltered: IFile[];
  onOpenConfirm: () => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, name: string) => void;
  onNavigate: (id: string | null) => void;
  onOpenFile?: (id: string) => void;
  onFavoriteItem?: (id: string) => void;
  onCreateItem?: (name: string, type: 'folder' | 'file') => void;
  notFound?: boolean;
};

export function FileManagerGridView({
  table,
  dataFiltered,
  onDeleteItem,
  onUpdateItem,
  onOpenConfirm,
  onNavigate,
  onOpenFile,
  onFavoriteItem,
  onCreateItem,
  notFound,
}: Props) {
  const { selected, onSelectRow: onSelectItem, onSelectAllRows: onSelectAllItems } = table;

  const containerRef = useRef(null);

  const shareDialog = useBoolean();

  const newFilesDialog = useBoolean();

  const newFolderDialog = useBoolean();
  const renameDialog = useBoolean();

  const menuActions = usePopover();

  const [createType, setCreateType] = useState<'folder' | 'file'>('folder');

  const [renameItem, setRenameItem] = useState<IFile | null>(null);

  const [itemName, setItemName] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');

  const [errorMessage, setErrorMessage] = useState('');

  const handleChangeInvite = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInviteEmail(event.target.value);
  }, []);

  const handleChangeItemName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setItemName(value);

      if (INVALID_CHARACTERS.test(value)) {
        setErrorMessage('Invalid characters: < > : " / \\ | ? *');
      } else if (
        dataFiltered.some((item) => {
          if (renameItem && item.id === renameItem.id) return false;
          return item.name.toLowerCase() === value.toLowerCase() && item.type === (renameItem?.type || createType);
        })
      ) {
        setErrorMessage(`A ${renameItem?.type || createType} with this name already exists in this folder`);
      } else {
        setErrorMessage('');
      }
    },
    [dataFiltered, renameItem, createType]
  );

  const sortedData = [...dataFiltered].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;

    if (a.isFavorited && !b.isFavorited) return -1;
    if (!a.isFavorited && b.isFavorited) return 1;

    return a.name.localeCompare(b.name);
  });

  const renderShareDialog = () => (
    <FileManagerShareDialog
      open={shareDialog.value}
      inviteEmail={inviteEmail}
      onChangeInvite={handleChangeInvite}
      onClose={() => {
        shareDialog.onFalse();
        setInviteEmail('');
      }}
    />
  );

  const renderUploadFilesDialog = () => (
    <FileManagerCreateFolderDialog open={newFilesDialog.value} onClose={newFilesDialog.onFalse} />
  );

  const renderCreateFolderDialog = () => (
    <FileManagerCreateFolderDialog
      open={newFolderDialog.value}
      onClose={() => {
        newFolderDialog.onFalse();
        setItemName('');
        setErrorMessage('');
      }}
      title={createType === 'folder' ? 'New folder' : 'New file'}
      onCreate={() => {
        if (!itemName) {
          setErrorMessage('Name is required');
          return;
        }
        if (errorMessage) return;

        newFolderDialog.onFalse();
        onCreateItem?.(itemName, createType);
        setItemName('');
        setErrorMessage('');
      }}
      folderName={itemName}
      onChangeFolderName={handleChangeItemName}
      hideUpload
      textFieldProps={{
        error: !!errorMessage,
        helperText: errorMessage,
        label: createType === 'folder' ? 'Folder name' : 'File name',
      }}
    />
  );

  const renderRenameDialog = () => (
    <FileManagerCreateFolderDialog
      open={renameDialog.value}
      onClose={() => {
        renameDialog.onFalse();
        setRenameItem(null);
        setItemName('');
        setErrorMessage('');
      }}
      title="Rename"
      onUpdate={() => {
        if (!itemName) {
          setErrorMessage('Name is required');
          return;
        }
        if (errorMessage) return;

        if (renameItem) {
          onUpdateItem(renameItem.id, itemName);
        }
        renameDialog.onFalse();
        setRenameItem(null);
        setItemName('');
        setErrorMessage('');
      }}
      folderName={itemName}
      onChangeFolderName={handleChangeItemName}
      hideUpload
      textFieldProps={{
        error: !!errorMessage,
        helperText: errorMessage,
        label: renameItem?.type === 'folder' ? 'Folder name' : 'File name',
      }}
    />
  );

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'top-center' } }}
    >
      <MenuList>
        <MenuItem
          onClick={() => {
            setCreateType('folder');
            newFolderDialog.onTrue();
            menuActions.onClose();
          }}
        >
          <Iconify icon="solar:folder-plus-bold" />
          New folder
        </MenuItem>

        <MenuItem
          onClick={() => {
            setCreateType('file');
            newFolderDialog.onTrue();
            menuActions.onClose();
          }}
        >
          <Iconify icon="solar:file-plus-bold" />
          New file
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  const renderSelectedActions = () => {
    const selectedItems = dataFiltered.filter((item) => selected.includes(item.id));
    const hasNonEmptyFolder = selectedItems.some(
      (item) => item.type === 'folder' && (item as any).totalFiles > 0
    );

    return (
      !!selected?.length && (
        <FileManagerActionSelected
          numSelected={selected.length}
          rowCount={dataFiltered.length}
          selected={selected}
          onSelectAllItems={(checked) =>
            onSelectAllItems(
              checked,
              dataFiltered.map((row) => row.id)
            )
          }
          action={
            <>
              <Button
                size="small"
                color="error"
                variant="contained"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={onOpenConfirm}
                disabled={hasNonEmptyFolder}
                sx={{ mr: 1 }}
              >
                Delete
              </Button>
            </>
          }
        />
      )
    );
  };

  return (
    <>
      <Box ref={containerRef}>
        <FileManagerPanel
          title="All files"
          subtitle={`${dataFiltered.length} items`}
          onOpen={menuActions.onOpen}
        />

        {notFound && <EmptyContent filled sx={{ py: 10 }} />}

        <Box
          sx={{
            gap: 3,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          {sortedData.map((item) =>
            item.type === 'folder' ? (
              <FileManagerFolderItem
                key={item.id}
                folder={item}
                selected={selected.includes(item.id)}
                onSelect={() => onSelectItem(item.id)}
                onDelete={() => onDeleteItem(item.id)}
                onEdit={() => {
                  setRenameItem(item);
                  setItemName(item.name);
                  renameDialog.onTrue();
                }}
                onNavigate={() => onNavigate(item.id)}
                onFavorite={() => onFavoriteItem?.(item.id)}
              />
            ) : (
              <FileManagerFileItem
                key={item.id}
                file={item}
                selected={selected.includes(item.id)}
                onSelect={() => onSelectItem(item.id)}
                onDelete={() => onDeleteItem(item.id)}
                onOpenFile={() => onOpenFile?.(item.id)}
                onFavorite={() => onFavoriteItem?.(item.id)}
                onEdit={() => {
                  setRenameItem(item);
                  setItemName(item.name);
                  renameDialog.onTrue();
                }}
              />
            )
          )}
        </Box>

        {renderSelectedActions()}
      </Box>

      {renderShareDialog()}
      {renderUploadFilesDialog()}
      {renderCreateFolderDialog()}
      {renderRenameDialog()}
      {renderMenuActions()}
    </>
  );
}


