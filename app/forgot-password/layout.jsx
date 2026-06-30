import { createPageMetadata } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Forgot Password',
  description: 'Request a secure password reset link for your WhereKeep account.',
  path: '/forgot-password',
});

export default function ForgotPasswordLayout({ children }) {
  return children;
}
