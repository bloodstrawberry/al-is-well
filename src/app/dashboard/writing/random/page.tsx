import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WritingRandomView } from 'src/sections/writing/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `랜덤 받아쓰기 | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <WritingRandomView />;
}
