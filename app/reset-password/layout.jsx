import { createPageMetadata } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Reset Password',
  description: 'Set a new password for your WhereKeep account.',
  path: '/reset-password',
});

export default function ResetPasswordLayout({ children }) {
  return children;
}
