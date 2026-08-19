import { LazyTasksPageClient } from "@/components/app-shell/LazyTasksClients";
import { getTasksAction } from "@/app/actions/tasks";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { getHouseholdForUser, hasHouseholdInviteMetadata } from "@/utils/households";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";

export const metadata = createPageMetadata({
  title: "Tasks",
  description: "Assign chores, track household tasks, and keep home routines moving.",
  path: "/tasks",
  robots: NO_INDEX_ROBOTS,
});

function getUserDisplayName(user) {
  const metadata = user?.user_metadata ?? {};
  const name =
    metadata.preferred_name ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    "";

  return name ? String(name).trim() : "";
}

async function hydrateMemberDisplayNames(admin, members = []) {
  const uniqueMembers = Array.from(
    new Map((members ?? []).map((member) => [String(member.user_id), member])).values()
  ).filter((member) => member?.user_id);

  if (uniqueMembers.length === 0) return members ?? [];

  const displayNameEntries = await Promise.all(
    uniqueMembers.map(async (member) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(member.user_id);
        if (error) return [String(member.user_id), ""];
        return [String(member.user_id), getUserDisplayName(data?.user)];
      } catch {
        return [String(member.user_id), ""];
      }
    })
  );
  const displayNamesByUserId = new Map(displayNameEntries);

  return (members ?? []).map((member) => ({
    ...member,
    displayName: displayNamesByUserId.get(String(member.user_id)) || null,
  }));
}

export default async function TasksPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { household, member } = await getHouseholdForUser({
    userId: user?.id,
    email: user?.email,
    createIfMissing: !hasHouseholdInviteMetadata(user),
  });

  const [tasksResult, membersResult, locationsResult] = await Promise.all([
    getTasksAction(),
    household?.id
      ? admin
          .from("household_members")
          .select("household_id, user_id, email, role")
          .eq("household_id", household.id)
          .order("joined_at", { ascending: true })
      : { data: [] },
    household?.id
      ? supabase
          .from("locations")
          .select("id, name")
          .order("name", { ascending: true })
      : { data: [] },
  ]);
  const members = await hydrateMemberDisplayNames(admin, membersResult.data ?? []);

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 md:min-h-[100vh] lg:px-6 xl:px-8 max-md:px-4 max-md:pb-0 max-md:pt-4">
      <LazyTasksPageClient
        initialTasks={tasksResult.data?.items ?? []}
        initialError={tasksResult.error}
        members={members}
        locations={locationsResult.data ?? []}
        currentUserId={user?.id ?? null}
        currentUserRole={member?.role ?? "viewer"}
      />
    </main>
  );
}
