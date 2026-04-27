import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Lotto Viewer',
  description:
    '세상의 모든 로또 정보',
};

export default function Page() {
  return <HomeView />;
}
