import LoginSection from '@/components/auth/LoginSection'
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';

export const metadata = createPageMetadata({
  title: 'Log In',
  description: 'Log in or create a WhereKeep account to manage your household inventory.',
  path: '/login',
  robots: NO_INDEX_ROBOTS,
});

export default function page() {
  return (
    <LoginSection/>
  )
}
