import { themeConfig } from './theme-config';
import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export type SettingsState = {
  fontSize: number;
  fontFamily: string;
  primaryColor: string;
  version: string;
};

export const defaultSettings: SettingsState = {
  fontSize: 16,
  fontFamily: themeConfig.fontFamily.primary,
  primaryColor: 'preset1',
  version: CONFIG.appVersion,
};
