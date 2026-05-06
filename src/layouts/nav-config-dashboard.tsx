import type { NavSectionProps } from 'src/components/nav-section';
import type { NavMainProps } from './main/nav/types';

import { paths } from 'src/routes/paths';

import HomeRoundedIcon from '@mui/icons-material/HomeRounded';

const ICONS = {
  home: <HomeRoundedIcon fontSize="small" />,
};

// ----------------------------------------------------------------------

export const navData: NavSectionProps['data'] = [
  {
    subheader: 'Overview',
    items: [
      { title: 'Home', path: paths.home, icon: ICONS.home },
    ],
  },
];

// ----------------------------------------------------------------------

export const mainNavData: NavMainProps['data'] = [
  { title: 'Home', path: '/', icon: <HomeRoundedIcon sx={{ width: 22, height: 22 }} /> },
];
