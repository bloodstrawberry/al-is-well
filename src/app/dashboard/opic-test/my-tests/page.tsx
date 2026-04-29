import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { MyOpicTestView } from 'src/sections/opic-test/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `내 모의고사 | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <MyOpicTestView />;
}
