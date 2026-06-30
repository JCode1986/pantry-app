import LoginSection from '@/components/auth/LoginSection'
import { createPageMetadata } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Log In',
  description: 'Log in or create a WhereKeep account to manage your household inventory.',
  path: '/login',
});

export default function page() {
  return (
    <LoginSection/>
  )
}
