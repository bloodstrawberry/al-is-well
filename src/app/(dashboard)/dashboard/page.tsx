import type { Metadata } from 'next';

import { OverviewAppView } from 'src/sections/overview/app/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `AL is well | Home` };

export default function Page() {
  return <OverviewAppView />;
}
