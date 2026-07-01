import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Reset Password',
  description: 'Set a new password for your WhereKeep account.',
  path: '/reset-password',
  robots: NO_INDEX_ROBOTS,
});

export default function ResetPasswordLayout({ children }) {
  return children;
}
