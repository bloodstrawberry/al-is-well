import type { Metadata } from 'next';

import { OverviewPatternView } from 'src/sections/overview/pattern/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `AL is well | 패턴분석` };

export default function Page() {
  return <OverviewPatternView />;
}
