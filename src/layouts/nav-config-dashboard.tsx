import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const iconify = (name: string) => (
  <Iconify icon={name} />
);

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  params: icon('ic-params'),
  banking: icon('ic-banking'),
  drawing: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  subpaths: icon('ic-subpaths'),
  menuItem: icon('ic-menu-item'),
  pattern: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  speaking: iconify('solar:microphone-bold'),
  listening: iconify('solar:headphones-round-bold'),
  writing: iconify('solar:pen-bold'),
};

// ----------------------------------------------------------------------

/**
 * Input nav data is an array of navigation section items used to define the structure and content of a navigation bar.
 * Each section contains a subheader and an array of items, which can include nested children items.
 *
 * Each item can have the following properties:
 * - `title`: The title of the navigation item.
 * - `path`: The URL path the item links to.
 * - `icon`: An optional icon component to display alongside the title.
 * - `info`: Optional additional information to display, such as a label.
 * - `allowedRoles`: An optional array of roles that are allowed to see the item.
 * - `caption`: An optional caption to display below the title.
 * - `children`: An optional array of nested navigation items.
 * - `disabled`: An optional boolean to disable the item.
 * - `deepMatch`: An optional boolean to indicate if the item should match subpaths.
 */
export const navData: NavSectionProps['data'] = [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      { title: 'Home', path: paths.dashboard.root, icon: ICONS.dashboard },
      { title: 'Drive', path: paths.dashboard.fileManager, icon: ICONS.folder },
      {
        title: 'Speaking',
        path: paths.dashboard.opicTest.root,
        icon: ICONS.speaking,
        children: [
          { title: '내 모의고사', path: paths.dashboard.opicTest.myTests },
          { title: '랜덤 모의고사', path: paths.dashboard.opicTest.randomTest },
        ],
      },
      {
        title: 'Listening',
        path: paths.dashboard.listening.root,
        icon: ICONS.listening,
        children: [
          { title: 'Playlist', path: paths.dashboard.listening.playlist },
          { title: '랜덤 듣기', path: paths.dashboard.listening.random },
        ],
      },
      {
        title: 'Writing',
        path: paths.dashboard.writing.root,
        icon: ICONS.writing,
        children: [
          { title: '받아쓰기', path: paths.dashboard.writing.dictation },
          { title: '랜덤 받아쓰기', path: paths.dashboard.writing.random },
        ],
      },
      { title: '패턴분석', path: paths.dashboard.general.pattern, icon: ICONS.pattern },
      { title: '통계분석', path: paths.dashboard.general.analytics, icon: ICONS.analytics },
      { title: '과거순위', path: paths.dashboard.general.history, icon: ICONS.banking },
      { title: '번호생성', path: paths.dashboard.general.drawing, icon: ICONS.drawing },
      { title: '마킹패턴', path: paths.dashboard.general.marking, icon: ICONS.file },
      { title: 'Course', path: paths.dashboard.general.course, icon: ICONS.course },
    ],
  },
  /**
   * Management
   */
  {
    subheader: 'Management',
    items: [
      { title: '로또달력', path: paths.dashboard.calendar, icon: ICONS.calendar },
      {
        title: 'User',
        path: paths.dashboard.user.root,
        icon: ICONS.user,
        children: [
          { title: 'Profile', path: paths.dashboard.user.root },
          { title: 'Cards', path: paths.dashboard.user.cards },
          { title: 'List', path: paths.dashboard.user.list },
          { title: 'Create', path: paths.dashboard.user.new },
          { title: 'Edit', path: paths.dashboard.user.demo.edit },
          { title: 'Account', path: paths.dashboard.user.account, deepMatch: true },
        ],
      },
      {
        title: 'Product',
        path: paths.dashboard.product.root,
        icon: ICONS.product,
        children: [
          { title: 'List', path: paths.dashboard.product.root },
          { title: 'Details', path: paths.dashboard.product.demo.details },
          { title: 'Create', path: paths.dashboard.product.new },
          { title: 'Edit', path: paths.dashboard.product.demo.edit },
        ],
      },
    ],
  }
];
