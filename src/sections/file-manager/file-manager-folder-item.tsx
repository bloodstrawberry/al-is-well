import type { IFolderManager } from 'src/types/file';
import type { FileItemProps } from './file-manager-file-item-slots';

import { useState, useCallback } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';

import { fData } from 'src/utils/format-number';

import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

import { FileManagerCreateFolderDialog } from './file-manager-create-folder-dialog';
import {
  FileItem,
  FileItemIcon,
  FileItemInfo,
  FileItemActions,
} from './file-manager-file-item-slots';

// ----------------------------------------------------------------------

type Props = FileItemProps & {
  selected?: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onSelect?: () => void;
  onNavigate?: VoidFunction;
  folder: IFolderManager;
};

export function FileManagerFolderItem({
  sx,
  folder,
  selected,
  onSelect,
  onDelete,
  onEdit,
  onNavigate,
  ...other
 }: Props) {
  const confirmDialog = useBoolean();

  const checkbox = useBoolean();
  const favorite = useBoolean(folder.isFavorited);

  const menuActions = usePopover();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <MenuItem
          onClick={() => {
            menuActions.onClose();
            onEdit();
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Rename
        </MenuItem>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuItem
          onClick={() => {
            confirmDialog.onTrue();
            menuActions.onClose();
          }}
          disabled={folder.totalFiles ? folder.totalFiles > 0 : false}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );


  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content="Are you sure want to delete?"
      action={
        <Button variant="contained" color="error" onClick={onDelete}>
          Delete
        </Button>
      }
    />
  );


  return (
    <>
      <FileItem
        variant="outlined"
        selected={selected}
        onDoubleClick={onNavigate}
        onClick={isMobile ? onNavigate : undefined}
        sx={{ ...sx, cursor: 'pointer' }}
        {...other}
      >

        <FileItemIcon
          id={folder.id}
          onMouseEnter={checkbox.onTrue}
          onMouseLeave={checkbox.onFalse}
          hovered={checkbox.value}
          checked={selected}
          onChange={onSelect}
        />

        <FileItemInfo
          type="folder"
          title={folder.name}
          values={[fData(folder.size), `${folder.totalFiles} files`]}
        />


        <FileItemActions
          id={folder.id}
          checked={favorite.value}
          onChange={favorite.onToggle}
          openMenu={menuActions.open}
          onOpenMenu={menuActions.onOpen}
        />
      </FileItem>

      {renderMenuActions()}

      {renderConfirmDialog()}

    </>
  );
}
