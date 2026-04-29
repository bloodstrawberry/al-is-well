import type { IFileManager } from 'src/types/file';
import type { FileItemProps } from './file-manager-file-item-slots';

import { useState, useCallback } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';

import { fData } from 'src/utils/format-number';
import { fDateTime } from 'src/utils/format-time';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { CustomPopover } from 'src/components/custom-popover';
import { FileManagerCreateFolderDialog } from './file-manager-create-folder-dialog';
import {
  FileItem,
  FileItemInfo,
  FileItemActions,
} from './file-manager-file-item-slots';

// ----------------------------------------------------------------------

type Props = FileItemProps & {
  file: IFileManager;
  onDelete: () => void;
};

export function FileRecentItem({ file, onDelete, sx, ...other }: Props) {
  const menuActions = usePopover();

  const editFileDialog = useBoolean();
  const detailsDrawer = useBoolean();
  const favorite = useBoolean(file.isFavorited);

  const [fileName, setFileName] = useState(file.name);

  const handleChangeFileName = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(event.target.value);
  }, []);


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
            editFileDialog.onTrue();
          }}
        >
          <Iconify icon="solar:pen-bold" />
          Edit
        </MenuItem>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuItem
          onClick={() => {
            menuActions.onClose();
            onDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  const renderEditFileDialog = () => (
    <FileManagerCreateFolderDialog
      open={editFileDialog.value}
      onClose={editFileDialog.onFalse}
      title="Edit File"
      onUpdate={() => {
        editFileDialog.onFalse();
        console.info('UPDATE FILE', fileName);
      }}
      folderName={fileName}
      onChangeFolderName={handleChangeFileName}
    />
  );



  return (
    <>
      <FileItem
        variant="outlined"
        sx={[
          {
            p: { xs: 2.5, sm: 2 },
            alignItems: { xs: 'unset', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <FileThumbnail file={file.type} />

        <FileItemInfo
          type="recent-file"
          title={file.name}
          values={[fDateTime(file.modifiedAt)]}
        />


        <FileItemActions
          id={file.id}
          checked={favorite.value}
          onChange={favorite.onToggle}
          openMenu={menuActions.open}
          onOpenMenu={menuActions.onOpen}
          sx={{ position: { xs: 'absolute', sm: 'unset' } }}
        />
      </FileItem>

      {renderMenuActions()}
      {renderEditFileDialog()}
    </>
  );
}
