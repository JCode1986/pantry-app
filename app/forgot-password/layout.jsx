import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Forgot Password',
  description: 'Request a secure password reset link for your WhereKeep account.',
  path: '/forgot-password',
  robots: NO_INDEX_ROBOTS,
});

export default function ForgotPasswordLayout({ children }) {
  return children;
}
