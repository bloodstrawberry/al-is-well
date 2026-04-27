import type { Metadata } from 'next';

import { OverviewMarkingView } from 'src/sections/overview/marking/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Lotto Viewer | 마킹패턴` };

export default function Page() {
  return <OverviewMarkingView />;
}
