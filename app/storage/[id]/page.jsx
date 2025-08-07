import { notFound } from 'next/navigation';
import StorageSection from '@/components/StorageSection';
import { getStorageById } from '@/app/actions/server';

export default async function StoragePage({ params }) {
  const { id } = await params;

  // Fetch storage + categories + ingredients from server
  const data = await getStorageById(id);

  if (!data || !data.storage) {
    // 🚨 Show 404 if storage not found
    return notFound();
  }

  return (
    <StorageSection
      storage={data.storage}
      categories={data.categories}
    />
  );
}
