import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { FaqLandingView } from 'src/sections/faq/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Faq - ${CONFIG.appName}` };

export default function Page() {
  return <FaqLandingView />;
}
