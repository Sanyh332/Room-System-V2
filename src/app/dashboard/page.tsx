"use client";

import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentBookings, RecentBookingRow } from "@/components/dashboard/RecentBookings";
import { OccupancyChart } from "@/components/dashboard/OccupancyChart";
import {
    Users,
    CreditCard,
    Activity,
    DollarSign,
    Building,
    MapPin,
    ArrowRight
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { addDays, format, isSameDay, isWithinInterval, startOfDay, subDays } from "date-fns";
import { Booking, Property, Room, UserProfile } from "../types";

type DashboardBooking = Booking & {
    total?: number | null;
    created_at?: string | null;
};

type DashboardStats = {
    totalRevenue: number;
    bookingsCount: number;
    activeStays: number;
    occupancyRate: number;
    revenueChangePct: number | null;
    bookingsChangePct: number | null;
    arrivalsToday: number;
    departuresToday: number;
};

type OccupancyPoint = {
    name: string;
    total: number;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatChange = (value: number | null) =>
    value === null ? null : `${value >= 0 ? "+" : ""}${value.toFixed(1)}% vs prev 30d`;

export default function DashboardPage() {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [properties, setProperties] = useState<Property[]>([]);
    const [bookings, setBookings] = useState<DashboardBooking[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Approval disabled; any signed-in user can use the dashboard
    const isApproved = true;
    const displayName =
        (profile?.display_name && profile.display_name.trim()) ||
        (session?.user.email ? session.user.email.split("@")[0] : "User");

    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data }) => setSession(data.session ?? null))
            .catch(() => setSession(null));

        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event, newSession) => {
                setSession(newSession);
            },
        );

        return () => listener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const loadProfile = async () => {
            setProfileLoading(true);
            if (!session) {
                setProfile(null);
                setProfileLoading(false);
                return;
            }

            const { data, error: profileError } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", session.user.id)
                .maybeSingle();

            if (profileError) {
                setError(profileError.message);
                setProfile(null);
            } else {
                setProfile(data ?? null);
            }

            setProfileLoading(false);
        };

        void loadProfile();
    }, [session]);

    useEffect(() => {
        const fetchAll = async () => {
            if (profileLoading) return;
            if (!session) {
                setProperties([]);
                setRooms([]);
                setBookings([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            const sinceDate = subDays(startOfDay(new Date()), 60)
                .toISOString()
                .split("T")[0];
            const [propertiesRes, roomsRes, bookingsRes] = await Promise.all([
                supabase.from("properties").select("*").order("name"),
                supabase.from("rooms").select("id, property_id, number, category_id, status, floor"),
                supabase
                    .from("bookings")
                    .select("id, property_id, room_id, guest_name, guest_email, status, total, check_in, check_out, reference_code, created_at, created_by, created_by_user:user_profiles(display_name)")
                    .gte("check_in", sinceDate)
                    .order("created_at", { ascending: false }),
            ]);

            if (propertiesRes.error || roomsRes.error || bookingsRes.error) {
                setError(
                    propertiesRes.error?.message ??
                    roomsRes.error?.message ??
                    bookingsRes.error?.message ??
                    "Unable to load dashboard data.",
                );
            } else {
                setProperties(propertiesRes.data ?? []);
                setRooms((roomsRes.data as Room[]) ?? []);
                // Map the data to include created_by_name from the join
                const bookingsWithCreator = (bookingsRes.data ?? []).map((booking: any) => ({
                    ...booking,
                    created_by_name: booking.created_by_user?.display_name || null,
                }));
                setBookings(bookingsWithCreator as DashboardBooking[]);
                setError(null);
            }
            setLoading(false);
        };

        void fetchAll();
    }, [isApproved, session, profileLoading]);

    const activeBookings = useMemo(
        () => bookings.filter((b) => b.status !== "cancelled"),
        [bookings],
    );

    const stats = useMemo<DashboardStats>(() => {
        const today = startOfDay(new Date());
        const currentWindowStart = subDays(today, 29);
        const previousWindowStart = subDays(currentWindowStart, 30);

        let totalRevenue = 0;
        let revenueCurrent = 0;
        let revenuePrev = 0;
        let bookingsCurrent = 0;
        let bookingsPrev = 0;
        let activeStays = 0;

        activeBookings.forEach((booking) => {
            const amount = Number(booking.total ?? 0);
            totalRevenue += amount;

            const checkIn = startOfDay(new Date(booking.check_in));
            if (checkIn >= currentWindowStart) {
                revenueCurrent += amount;
                bookingsCurrent += 1;
            } else if (checkIn >= previousWindowStart) {
                revenuePrev += amount;
                bookingsPrev += 1;
            }

            const stayStart = startOfDay(new Date(booking.check_in));
            const stayEnd = addDays(startOfDay(new Date(booking.check_out)), -1);

            if (isWithinInterval(today, { start: stayStart, end: stayEnd })) {
                activeStays += 1;
            }
        });

        const occupancyRate = rooms.length
            ? Math.round((activeStays / rooms.length) * 100)
            : 0;

        const revenueChangePct =
            revenuePrev > 0 ? ((revenueCurrent - revenuePrev) / revenuePrev) * 100 : null;
        const bookingsChangePct =
            bookingsPrev > 0 ? ((bookingsCurrent - bookingsPrev) / bookingsPrev) * 100 : null;

        const arrivalsToday = activeBookings.filter((b) =>
            isSameDay(startOfDay(new Date(b.check_in)), today),
        ).length;

        const departuresToday = activeBookings.filter((b) =>
            isSameDay(startOfDay(new Date(b.check_out)), today),
        ).length;

        return {
            totalRevenue,
            bookingsCount: activeBookings.length,
            activeStays,
            occupancyRate,
            revenueChangePct,
            bookingsChangePct,
            arrivalsToday,
            departuresToday,
        };
    }, [activeBookings, rooms.length]);

    const occupancyData = useMemo<OccupancyPoint[]>(() => {
        const today = startOfDay(new Date());
        const start = subDays(today, 6);

        return Array.from({ length: 7 }, (_, index) => {
            const day = addDays(start, index);
            const occupied = activeBookings.filter((booking) =>
                isWithinInterval(day, {
                    start: startOfDay(new Date(booking.check_in)),
                    end: addDays(startOfDay(new Date(booking.check_out)), -1),
                }),
            ).length;

            return {
                name: format(day, "EEE"),
                total: occupied,
            };
        });
    }, [activeBookings]);

    const recentBookingRows = useMemo<RecentBookingRow[]>(() => {
        const roomMap = new Map(rooms.map((room) => [room.id, room.number]));
        return activeBookings.slice(0, 6).map((booking) => ({
            id: booking.id,
            guest:
                (booking.adults ?? 1) > 1
                    ? `${booking.guest_name} +${(booking.adults ?? 1) - 1}`
                    : booking.guest_name,
            email: booking.guest_email,
            room: booking.room_id
                ? `Room ${roomMap.get(booking.room_id) ?? "?"}`
                : "Unassigned",
            status: booking.status.replace("_", " "),
            amountLabel: currencyFormatter.format(Number(booking.total ?? 0)),
            stayLabel: `${format(new Date(booking.check_in), "MMM d")} – ${format(addDays(new Date(booking.check_out), -1), "MMM d")}`,
        }));
    }, [activeBookings, rooms]);

    if (profileLoading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Checking your account...
            </div>
        );
    }

    if (!session) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Please sign in to view the dashboard.
            </div>
        );
    }

    if (!isApproved) {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
                Your account is awaiting admin approval. Once approved, this dashboard will unlock.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">Welcome, {displayName}</p>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                </div>
                {/* DatePicker could go here */}
            </div>

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Revenue"
                    value={currencyFormatter.format(stats.totalRevenue)}
                    trend={formatChange(stats.revenueChangePct) ?? "Last 30 days"}
                    trendUp={stats.revenueChangePct === null ? undefined : stats.revenueChangePct >= 0}
                    icon={DollarSign}
                    description="Sum of all non-cancelled bookings."
                />
                <StatsCard
                    title="Bookings"
                    value={stats.bookingsCount.toString()}
                    trend={
                        formatChange(stats.bookingsChangePct) ??
                        `${stats.arrivalsToday} arrivals today`
                    }
                    trendUp={
                        stats.bookingsChangePct === null
                            ? stats.arrivalsToday >= stats.departuresToday
                            : stats.bookingsChangePct >= 0
                    }
                    icon={CreditCard}
                    description="All active bookings across your properties."
                />
                <StatsCard
                    title="Active Now"
                    value={stats.activeStays.toString()}
                    trend={`${stats.arrivalsToday} arrivals · ${stats.departuresToday} departures`}
                    trendUp={stats.arrivalsToday >= stats.departuresToday}
                    icon={Activity}
                    description="Guests currently staying based on stay dates."
                />
                <StatsCard
                    title="Occupancy Rate"
                    value={`${stats.occupancyRate}%`}
                    trend={
                        rooms.length
                            ? `${stats.activeStays} of ${rooms.length} rooms occupied`
                            : "Add rooms to track occupancy"
                    }
                    trendUp={rooms.length ? undefined : true}
                    icon={Users}
                    description="Across all rooms and properties."
                />
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold tracking-tight">Your Properties</h3>
                {!loading && properties.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                        No properties found. <Link href="/properties" className="font-semibold text-blue-600 hover:underline">Add a property</Link> to get started.
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {properties.map((property) => (
                        <Link
                            key={property.id}
                            href={`/availability?propertyId=${property.id}`}
                            className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                        >
                            <div className="space-y-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                                    <Building className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                                        {property.name}
                                    </h4>
                                    {property.code && (
                                        <span className="inline-flex mt-1 items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                            {property.code}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-start gap-2 text-sm text-slate-500">
                                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{property.address || "No address provided"}</span>
                                </div>
                            </div>
                            <div className="mt-6 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                                View Availability <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    <OccupancyChart data={occupancyData} loading={loading} totalRooms={rooms.length} />
                </div>
                <div className="col-span-3">
                    <RecentBookings rows={recentBookingRows} loading={loading} />
                </div>
            </div>
        </div>
    );
}
