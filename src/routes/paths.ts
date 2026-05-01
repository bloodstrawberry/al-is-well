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
    mail: `${ROOTS.DASHBOARD}/mail`,
    chat: `${ROOTS.DASHBOARD}/chat`,
    blank: `${ROOTS.DASHBOARD}/blank`,
    kanban: `${ROOTS.DASHBOARD}/kanban`,
    fileManager: `${ROOTS.DASHBOARD}/file-manager`,
    permission: `${ROOTS.DASHBOARD}/permission`,
    invoice: {
      root: `${ROOTS.DASHBOARD}/invoice`,
      new: `${ROOTS.DASHBOARD}/invoice/new`,
      details: (id: string) => `${ROOTS.DASHBOARD}/invoice/${id}`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/invoice/${id}/edit`,
    },
    post: {
      root: `${ROOTS.DASHBOARD}/post`,
      new: `${ROOTS.DASHBOARD}/post/new`,
      details: (title: string) => `${ROOTS.DASHBOARD}/post/${kebabCase(title)}`,
      edit: (title: string) => `${ROOTS.DASHBOARD}/post/${kebabCase(title)}/edit`,
    },
    order: {
      root: `${ROOTS.DASHBOARD}/order`,
      details: (id: string) => `${ROOTS.DASHBOARD}/order/${id}`,
    },
    job: {
      root: `${ROOTS.DASHBOARD}/job`,
      new: `${ROOTS.DASHBOARD}/job/new`,
      details: (id: string) => `${ROOTS.DASHBOARD}/job/${id}`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/job/${id}/edit`,
    },
    tour: {
      root: `${ROOTS.DASHBOARD}/tour`,
      new: `${ROOTS.DASHBOARD}/tour/new`,
      details: (id: string) => `${ROOTS.DASHBOARD}/tour/${id}`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/tour/${id}/edit`,
    },
    opicTest: {
      root: `${ROOTS.DASHBOARD}/opic-test`,
      myTests: `${ROOTS.DASHBOARD}/opic-test/my-tests`,
      randomTest: `${ROOTS.DASHBOARD}/opic-test/random-test`,
    },
    listening: {
      root: `${ROOTS.DASHBOARD}/listening`,
      playlist: `${ROOTS.DASHBOARD}/listening/playlist`,
      random: `${ROOTS.DASHBOARD}/listening/random`,
    },
    writing: {
      root: `${ROOTS.DASHBOARD}/writing`,
      dictation: `${ROOTS.DASHBOARD}/writing/dictation`,
      random: `${ROOTS.DASHBOARD}/writing/random`,
    },
    faq: `${ROOTS.DASHBOARD}/faq`,
  },
};
