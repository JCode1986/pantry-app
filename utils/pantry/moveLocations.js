export function normalizeMoveLocations(locations = []) {
  return (locations ?? []).map((location) => {
    const storageAreas = (
      location.storageAreas ??
      location.storage_areas ??
      []
    ).map((storageArea) => {
      const categories =
        storageArea.categories ?? storageArea.storage_categories ?? [];

      return {
        ...storageArea,
        categories,
        storage_categories: categories,
      };
    });

    return {
      ...location,
      storageAreas,
      storage_areas: storageAreas,
    };
  });
}
