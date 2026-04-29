import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { WritingDictationView } from 'src/sections/writing/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `받아쓰기 | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <WritingDictationView />;
}
