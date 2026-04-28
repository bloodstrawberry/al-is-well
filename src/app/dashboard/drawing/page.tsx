import type { Metadata } from 'next';

import { OverviewDrawingView } from 'src/sections/overview/drawing/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `AL is well | 번호생성` };

export default function Page() {
  return <OverviewDrawingView />;
}
