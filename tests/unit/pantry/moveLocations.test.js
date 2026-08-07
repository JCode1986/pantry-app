import { describe, expect, it } from "vitest";
import { normalizeMoveLocations } from "@/utils/pantry/moveLocations";

describe("move location normalization", () => {
  it("normalizes camelCase and snake_case storage area/category aliases", () => {
    const locations = normalizeMoveLocations([
      {
        id: "location_1",
        storage_areas: [
          {
            id: "area_1",
            storage_categories: [{ id: "category_1", name: "Cans" }],
          },
        ],
      },
    ]);

    expect(locations[0].storageAreas).toHaveLength(1);
    expect(locations[0].storage_areas).toBe(locations[0].storageAreas);
    expect(locations[0].storageAreas[0].categories).toEqual([
      { id: "category_1", name: "Cans" },
    ]);
    expect(locations[0].storageAreas[0].storage_categories).toBe(
      locations[0].storageAreas[0].categories
    );
  });

  it("returns empty arrays when nested collections are missing", () => {
    expect(normalizeMoveLocations([{ id: "location_1" }])).toEqual([
      {
        id: "location_1",
        storageAreas: [],
        storage_areas: [],
      },
    ]);
    expect(normalizeMoveLocations(null)).toEqual([]);
  });
});
