import type { Metadata } from 'next';

import { OverviewAppView } from 'src/sections/overview/app/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Lotto Viewer | Home` };

export default function Page() {
  return <OverviewAppView />;
}
