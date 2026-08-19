import PageLoadingState from "@/components/ui/PageLoadingState";

export default function TasksLoading() {
  return (
    <PageLoadingState
      label="Loading tasks..."
      detail="Checking household chores, assignments, and due dates."
    />
  );
}
