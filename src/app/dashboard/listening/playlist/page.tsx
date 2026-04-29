import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { ListeningPlaylistView } from 'src/sections/listening/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Playlist | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <ListeningPlaylistView />;
}
