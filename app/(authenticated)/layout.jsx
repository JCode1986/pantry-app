import AuthenticatedAppShell from "@/components/app-shell/AuthenticatedAppShell";

export default function AuthenticatedLayout({ children }) {
  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
