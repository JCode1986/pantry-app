import { createPageMetadata } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Syncing Session',
  description: 'Securely syncing your WhereKeep sign-in session.',
  path: '/magic-link-sync',
  robots: {
    index: false,
    follow: false,
  },
});

export default function MagicLinkSyncLayout({ children }) {
  return children;
}
