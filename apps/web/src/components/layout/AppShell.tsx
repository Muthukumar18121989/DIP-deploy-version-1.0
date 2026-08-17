import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({
  useCaseId,
  useCaseName,
  title,
  children,
}: {
  useCaseId: string;
  useCaseName?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar useCaseId={useCaseId} useCaseName={useCaseName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} useCaseId={useCaseId} useCaseName={useCaseName} />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
