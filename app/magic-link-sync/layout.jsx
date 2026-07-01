import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Syncing Session',
  description: 'Securely syncing your WhereKeep sign-in session.',
  path: '/magic-link-sync',
  robots: NO_INDEX_ROBOTS,
});

export default function MagicLinkSyncLayout({ children }) {
  return children;
}
