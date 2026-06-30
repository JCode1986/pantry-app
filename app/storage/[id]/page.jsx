import { notFound } from 'next/navigation';
import StorageSection from '@/components/StorageSection';
import { getStorageById } from '@/app/actions/server';
import { createPageMetadata } from '@/utils/metadata';

export async function generateMetadata({ params }) {
  const { id } = await params;

  return createPageMetadata({
    title: 'Storage',
    description: 'Manage a storage space and its inventory categories.',
    path: `/storage/${id}`,
  });
}

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
