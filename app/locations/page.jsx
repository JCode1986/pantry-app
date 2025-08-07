import LocationsSection from '@/components/LocationsSection'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('created_at', { ascending: true })

  return <LocationsSection locations={locations || []} />
}
