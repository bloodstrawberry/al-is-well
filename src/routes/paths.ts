import { kebabCase } from 'es-toolkit';

// ----------------------------------------------------------------------

const ROOTS = {
  DASHBOARD: '/dashboard',
};

// ----------------------------------------------------------------------

export const paths = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  pricing: '/pricing',
  payment: '/payment',
  faqs: '/faqs',
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  components: '/components',
  docs: 'https://docs.minimals.cc/',
  changelog: 'https://docs.minimals.cc/changelog/',
  zoneStore: 'https://mui.com/store/items/zone-landing-page/',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  freeUI: 'https://mui.com/store/items/minimal-dashboard-free/',
  figmaUrl: 'https://www.figma.com/design/WadcoP3CSejUDj7YZc87xj/%5BPreview%5D-Minimal-Web.v7.3.0',
  product: {
    root: `/product`,
    checkout: `/product/checkout`,
    details: (id: string) => `/product/${id}`,
  },
  post: {
    root: `/post`,
    details: (title: string) => `/post/${kebabCase(title)}`,
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
  },
  fileManager: `/file-manager`,
  opicTest: {
    root: `/opic-test`,
    myTests: `/opic-test/my-tests`,
    randomTest: `/opic-test/random-test`,
  },
  listening: {
    root: `/listening`,
    playlist: `/listening/playlist`,
    random: `/listening/random`,
  },
  writing: {
    root: `/writing`,
    dictation: `/writing/dictation`,
    random: `/writing/random`,
  },
  faq: `/faq`,
  mail: `/mail`,
  chat: `/chat`,
  blank: `/blank`,
  kanban: `/kanban`,
  permission: `/permission`,
  invoice: {
    root: `/invoice`,
    new: `/invoice/new`,
    details: (id: string) => `/invoice/${id}`,
    edit: (id: string) => `/invoice/${id}/edit`,
  },
  post: {
    root: `/post`,
    new: `/post/new`,
    details: (title: string) => `/post/${kebabCase(title)}`,
    edit: (title: string) => `/post/${kebabCase(title)}/edit`,
  },
  order: {
    root: `/order`,
    details: (id: string) => `/order/${id}`,
  },
  job: {
    root: `/job`,
    new: `/job/new`,
    details: (id: string) => `/job/${id}`,
    edit: (id: string) => `/job/${id}/edit`,
  },
  tour: {
    root: `/tour`,
    new: `/tour/new`,
    details: (id: string) => `/tour/${id}`,
    edit: (id: string) => `/tour/${id}/edit`,
  },
};
