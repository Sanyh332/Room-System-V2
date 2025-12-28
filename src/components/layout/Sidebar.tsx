"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    CalendarDays,
    Hotel,
    BedDouble,
    Settings,
    Grid,
    ShieldCheck,
} from "lucide-react";

const baseNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Bookings", href: "/bookings", icon: CalendarDays },
    { name: "Rooms", href: "/rooms", icon: BedDouble },
    { name: "Properties", href: "/properties", icon: Hotel },
    { name: "Categories", href: "/categories", icon: Grid },
    { name: "Availability", href: "/availability", icon: CalendarDays },
    { name: "Settings", href: "/settings", icon: Settings },
];

type SidebarProps = {
    className?: string;
    onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<{ display_name: string; role: string } | null>(null);

    useEffect(() => {
        let isMounted = true;

        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (!isMounted) return;
                setSession(data.session ?? null);
            })
            .catch(() => {
                if (isMounted) setSession(null);
            });

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                if (!isMounted) return;
                setSession(newSession);
            },
        );

        return () => {
            isMounted = false;
            listener?.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async () => {
            if (!session) {
                if (isMounted) setUserProfile(null);
                return;
            }

            const { data, error } = await supabase
                .from("user_profiles")
                .select("display_name, role")
                .eq("id", session.user.id)
                .maybeSingle();

            if (!isMounted) return;
            if (!error && data) {
                setUserProfile(data);
            } else {
                setUserProfile(null);
            }
        };

        void loadProfile();

        return () => {
            isMounted = false;
        };
    }, [session]);

    const isAdmin = userProfile?.role === "admin";
    const navigation = isAdmin
        ? [...baseNavigation, { name: "User Requests", href: "/admin/users", icon: ShieldCheck }]
        : baseNavigation;
    const userEmail = session?.user.email ?? "Not signed in";
    const userLabel =
        userProfile?.display_name ||
        session?.user.email?.split("@")[0] ||
        "Guest";
    const initials = (userProfile?.display_name ?? session?.user.email ?? "?")
        .charAt(0)
        .toUpperCase();

    const handleSignOut = async () => {
        try {
            // Attempt to sign out, but don't block indefinitely
            const { error } = await Promise.race([
                supabase.auth.signOut(),
                new Promise<{ error: { message: string } | null }>((resolve) =>
                    setTimeout(() => resolve({ error: null }), 2000)
                ),
            ]);
            
            if (error) {
                console.error("Logout error:", error);
            }
        } catch (e) {
            console.error("Logout exception:", e);
        } finally {
            // Always clear local state and force redirect
            setSession(null);
            setUserProfile(null);
            // Use window.location for a hard refresh to clear any in-memory state
            window.location.href = "/login";
        }
    };

    return (
        <div
            className={cn(
                "fixed left-0 top-0 z-30 flex h-screen w-[280px] flex-col border-r bg-card text-card-foreground",
                className,
            )}
        >
            <div className="flex h-16 shrink-0 items-center border-b px-6">
                <Hotel className="mr-2 h-6 w-6 text-primary" />
                <span className="text-xl font-bold">RoomMaster</span>
            </div>
            <div className="flex-1 py-6">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:text-primary",
                                    isActive
                                        ? "bg-primary/10 text-primary hover:text-primary"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                                onClick={onNavigate}
                            >
                                <Icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="shrink-0 border-t p-4">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
                        {initials}
                    </div>
                    <div className="grid flex-1 gap-1">
                        <p className="truncate text-sm font-medium leading-none">
                            {userLabel}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                    {session ? (
                        <button
                            onClick={() => {
                                void handleSignOut();
                                onNavigate?.();
                            }}
                            className="inline-flex items-center rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
                        >
                            Logout
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
