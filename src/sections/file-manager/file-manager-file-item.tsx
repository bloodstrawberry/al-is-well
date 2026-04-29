import type { IFileManager } from 'src/types/file';
import type { FileItemProps } from './file-manager-file-item-slots';

import { memo, useState, useCallback, useEffect } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';

import { fData } from 'src/utils/format-number';
import { fDateTime } from 'src/utils/format-time';

import { getIsMobile } from 'src/utils/is-mobile';

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
  file: IFileManager;
  onDelete: () => void;
  onEdit: () => void;
  onSelect?: () => void;
  onOpenFile?: () => void;
  onFavorite?: (id: string) => void;
};

export const FileManagerFileItem = memo(({
  file,
  selected,
  onSelect,
  onDelete,
  onEdit,
  onOpenFile,
  onFavorite,
  sx,
  ...other
}: Props) => {
  const confirmDialog = useBoolean();
  const menuActions = usePopover();

  const checkbox = useBoolean();
  const favorite = useBoolean(file.isFavorited);

  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(getIsMobile());
  }, []);

  useEffect(() => {
    if (file.isFavorited !== favorite.value) {
      favorite.setValue(file.isFavorited);
    }
  }, [file.isFavorited, favorite]);

  const handleFavorite = useCallback(() => {
    favorite.onToggle();
    onFavorite?.(file.id);
  }, [favorite, onFavorite, file.id]);

  const handleDoubleClick = useCallback(() => {
    onOpenFile?.();
  }, [onOpenFile]);

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
            onOpenFile?.();
          }}
        >
          <Iconify icon="solar:eye-bold" />
          Open
        </MenuItem>

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
        sx={sx}
        onDoubleClick={handleDoubleClick}
        onClick={isMobileDevice ? handleDoubleClick : undefined}
        {...other}
      >

        <FileItemIcon
          id={file.id}
          onMouseEnter={checkbox.onTrue}
          onMouseLeave={checkbox.onFalse}
          hovered={checkbox.value}
          checked={selected}
          onChange={onSelect}
          fileType={file.type}
        />

        <FileItemInfo
          type="file"
          title={file.name}
          values={[fDateTime(file.modifiedAt)]}
        />


        <FileItemActions
          id={file.id}
          checked={favorite.value}
          onChange={handleFavorite}
          openMenu={menuActions.open}
          onOpenMenu={menuActions.onOpen}
        />
      </FileItem>

      {renderMenuActions()}

      {renderConfirmDialog()}

    </>
  );
});
