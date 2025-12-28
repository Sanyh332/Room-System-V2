"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, Hotel } from "lucide-react";
import { Sidebar } from "./Sidebar";

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  const pathname = usePathname();
  const isAuthRoute =
    pathname === "/login" || pathname?.startsWith("/login/");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    // Close mobile nav when navigating
    setMobileNavOpen(false);
  }, [pathname]);

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="lg:flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <div className="flex min-h-screen flex-1 flex-col lg:ml-[280px]">
          {/* Mobile top bar */}
          <header className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileNavOpen(true)}
                className="rounded-md border border-border p-2 text-sm font-semibold hover:bg-muted"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Hotel className="h-5 w-5 text-primary" />
                <span className="text-base font-semibold">RoomMaster</span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[86vw] bg-card shadow-2xl focus:outline-none">
            <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Hotel className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">RoomMaster</span>
              </div>
              <button
                aria-label="Close navigation"
                className="rounded-md p-2 hover:bg-muted"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar
              onNavigate={() => setMobileNavOpen(false)}
              className="h-[calc(100vh-56px)]"
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

