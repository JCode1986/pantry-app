import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import OpenGlobalAddItemButton from "@/components/ui/OpenGlobalAddItemButton";
import { createPageMetadata } from "@/utils/metadata";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("storage_categories")
    .select(
      `
      name,
      storage_area:storage_areas!fk_storage_area (
        name,
        location:locations ( name )
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  const name = category?.name ?? "Category";
  const areaName = category?.storage_area?.name;
  const locationName = category?.storage_area?.location?.name;
  const description =
    areaName && locationName
      ? `View items in ${name}, stored in ${areaName} at ${locationName}.`
      : `View and manage items in ${name}.`;

  return createPageMetadata({
    title: name,
    description,
    path: `/categories/${id}`,
  });
}

export default async function CategoryDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: category, error } = await supabase
    .from("storage_categories")
    .select(
      `
      id,
      name,
      storage_area:storage_areas!fk_storage_area (
        id,
        name,
        location:locations (
          id,
          name
        )
      ),
      items:items!fk_items_category (
        id,
        name,
        quantity,
        expiration_date
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !category) {
    console.error("Category fetch error:", error?.message || error);
    notFound();
  }

  const items = category.items ?? [];
  const area = category.storage_area;
  const location = area?.location;

  return (
    <main className="page-enter max-w-[900px] mx-auto p-6 pt-8 min-h-[100vh] space-y-5">
      <nav className="content-enter text-sm text-gray-500">
        <Link href="/categories" className="hover:underline">
          Categories
        </Link>
        {area?.id && (
          <>
            {" "}
            /{" "}
            <Link href={`/areas/${area.id}`} className="hover:underline">
              {area.name}
            </Link>
          </>
        )}
        {" "}
        / <span className="text-gray-700">{category.name}</span>
      </nav>

      <header className="content-enter rounded-2xl border border-stocksense-gray bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-stocksense-teal">
              {category.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {location?.name ?? "Unknown location"} / {area?.name ?? "Unknown area"}
            </p>
            <div className="mt-3 inline-flex px-2.5 py-1 rounded-full text-xs bg-[var(--stocksense-brand-soft)] text-[var(--stocksense-brand)] border border-[var(--stocksense-brand-border)]">
              <strong>{items.length}</strong>&nbsp;{items.length === 1 ? "item" : "items"}
            </div>
          </div>

          <OpenGlobalAddItemButton
            context={{
              locationId: location?.id,
              storageAreaId: area?.id,
              categoryId: category.id,
            }}
          />
        </div>
      </header>

      <section className="content-stagger grid grid-cols-1 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-stocksense-gray bg-white shadow-sm p-4"
          >
            <div className="font-semibold text-stocksense-teal truncate">
              {item.name}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Qty: {item.quantity ?? 0} / Exp: {item.expiration_date || "None"}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-2xl border border-stocksense-gray bg-white p-8 text-center text-gray-500">
            No items in this category yet.
          </div>
        )}
      </section>
    </main>
  );
}
