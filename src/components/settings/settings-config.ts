import type { SettingsState } from './types';

import { CONFIG } from 'src/global-config';
import { themeConfig } from 'src/theme/theme-config';

// ----------------------------------------------------------------------

export const SETTINGS_STORAGE_KEY: string = 'app-settings';

export const defaultSettings: SettingsState = {
  fontSize: 16,
  fontFamily: themeConfig.fontFamily.primary,
  primaryColor: 'preset1',
  version: CONFIG.appVersion,
};
