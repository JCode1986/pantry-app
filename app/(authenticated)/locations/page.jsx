import LocationsSection from '@/components/locations/LocationsSection';
import { createClient } from '@/utils/supabase/server';
import { createPageMetadata, NO_INDEX_ROBOTS } from '@/utils/metadata';
import { getCanEditInventoryForUser } from '@/utils/households';
import { getLocationsPageAction } from '@/app/actions/server';

export const metadata = createPageMetadata({
  title: 'Locations',
  description: 'Create and manage inventory locations for your household.',
  path: '/locations',
  robots: NO_INDEX_ROBOTS,
});

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEditInventory = await getCanEditInventoryForUser(user);

  const locationsResult = await getLocationsPageAction({ offset: 0, limit: 24 });

  return (
    <LocationsSection
      locations={locationsResult.data.items}
      totalLocations={locationsResult.data.totalCount}
      canEditInventory={canEditInventory}
    />
  );
}
