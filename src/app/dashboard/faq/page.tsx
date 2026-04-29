import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { FaqView } from 'src/sections/faq/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `FAQ | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <FaqView />;
}
