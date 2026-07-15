import SupportChatbot from "@/components/app-shell/SupportChatbot";
import { createPageMetadata, NO_INDEX_ROBOTS } from "@/utils/metadata";

export const metadata = createPageMetadata({
  title: "Help Chat",
  description: "Ask WhereKeep help a question about using the app.",
  path: "/support/chat",
  robots: NO_INDEX_ROBOTS,
});

export default function SupportChatPage() {
  return (
    <main className="page-enter mx-auto min-h-[100vh] max-w-[900px] px-0 py-0 md:px-5 md:py-8">
      <SupportChatbot defaultOpen variant="page" />
    </main>
  );
}
