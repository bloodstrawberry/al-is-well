import type { NavMainProps } from './main/nav/types';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const navData: NavMainProps['data'] = [
  { title: 'Home', path: '/', icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" /> },
  {
    title: 'Drive',
    path: paths.dashboard.fileManager,
    icon: <Iconify width={22} icon="solar:folder-2-bold-duotone" />,
  },
  {
    title: 'Speaking',
    path: paths.dashboard.opicTest.root,
    icon: <Iconify width={22} icon="solar:microphone-bold-duotone" />,
    children: [
      {
        subheader: 'Speaking',
        items: [
          { title: '내 모의고사', path: paths.dashboard.opicTest.myTests },
          { title: '랜덤 모의고사', path: paths.dashboard.opicTest.randomTest },
        ],
      },
    ],
  },
  {
    title: 'Listening',
    path: paths.dashboard.listening.root,
    icon: <Iconify width={22} icon="solar:headphones-round-bold-duotone" />,
    children: [
      {
        subheader: 'Listening',
        items: [
          { title: 'Playlist', path: paths.dashboard.listening.playlist },
          { title: '랜덤 듣기', path: paths.dashboard.listening.random },
        ],
      },
    ],
  },
  {
    title: 'Writing',
    path: paths.dashboard.writing.root,
    icon: <Iconify width={22} icon="solar:pen-bold-duotone" />,
    children: [
      {
        subheader: 'Writing',
        items: [
          { title: '받아쓰기', path: paths.dashboard.writing.dictation },
          { title: '랜덤 받아쓰기', path: paths.dashboard.writing.random },
        ],
      },
    ],
  },
  {
    title: 'FAQ',
    path: paths.dashboard.faq,
    icon: <Iconify width={22} icon="solar:question-circle-bold-duotone" />,
  },
];
