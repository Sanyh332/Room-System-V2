"use client";

import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { useSearchParams, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import Link from "next/link";
import {
  CheckIcon,
  ChevronDownIcon,
  Cross2Icon,
  ExitIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import clsx from "clsx";
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { AvailabilityView } from "./availability/AvailabilityView";
import { BookingsView } from "./bookings/BookingsView";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  Booking,
  BookingDraft,
  BookingWithDates,
  CategoryDraft,
  DashboardView,
  Property,
  Room,
  RoomCategory,
  RoomDraft,
  UserProfile,
  bookingStatuses,
  roomStatuses,
} from "./types";

const navigationSections: {
  id: DashboardView;
  label: string;
  href: string;
  requiresActive?: boolean;
}[] = [
    { id: "all", label: "Overview", href: "/" },
    { id: "properties", label: "Properties", href: "/properties" },
    { id: "categories", label: "Categories", href: "/categories", requiresActive: true },
    { id: "rooms", label: "Rooms", href: "/rooms", requiresActive: true },
    { id: "bookings", label: "Bookings", href: "/bookings", requiresActive: true },
    { id: "tentative", label: "Tentative", href: "/tentative", requiresActive: true },
    { id: "availability", label: "Availability", href: "/availability", requiresActive: true },
  ];

const buttonBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-60";
const primaryButton = `${buttonBase} bg-black text-white hover:bg-slate-900`;
const ghostButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const dangerButton = `${buttonBase} bg-red-50 text-red-600 border border-red-200 hover:bg-red-100`;
const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100";
const BOOKINGS_PAGE_SIZE = 10;

function StatusPill({
  status,
  palette,
}: {
  status: string;
  palette: "room" | "booking";
}) {
  const styles =
    palette === "room"
      ? {
        available: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        occupied: "bg-blue-50 text-blue-700 border border-blue-200",
        dirty: "bg-amber-50 text-amber-700 border border-amber-200",
        out_of_service: "bg-slate-100 text-slate-700 border border-slate-200",
      }
      : {
        reserved: "bg-blue-50 text-blue-700 border border-blue-200",
        checked_in: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        checked_out: "bg-slate-100 text-slate-700 border border-slate-200",
        cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
        tentative: "bg-amber-50 text-amber-700 border border-amber-200",
      };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize",
        styles[status as keyof typeof styles] ??
        "bg-slate-100 text-slate-700 border border-slate-200",
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard view="all" />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-4 animate-pulse">
        <div className="h-12 w-64 rounded-2xl bg-white shadow-sm" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-40 rounded-2xl bg-white shadow-sm" />
          <div className="h-40 rounded-2xl bg-white shadow-sm" />
          <div className="h-40 rounded-2xl bg-white shadow-sm" />
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-slate-700">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100",
        props.className,
      )}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100",
        props.className,
      )}
    />
  );
}

function SelectField({
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
}: {
  value?: string;
  onValueChange?: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger
        className={clsx(
          "flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
        )}
        aria-label="Select option"
      >
        <Select.Value placeholder={placeholder ?? "Choose..."} />
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <Select.Viewport className="p-1">
            {options.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-slate-800 outline-none data-[highlighted]:bg-slate-100"
              >
                <Select.ItemText>{opt.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <CheckIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function MultiSelectField({
  values,
  onValuesChange,
  placeholder,
  options,
  disabled,
}: {
  values: string[];
  onValuesChange?: (vals: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  const toggleValue = (value: string) => {
    if (!onValuesChange) return;
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value));
    } else {
      onValuesChange([...values, value]);
    }
  };

  const selectedLabels = values
    .map((v) => options.find((opt) => opt.value === v)?.label)
    .filter(Boolean);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={clsx(
          "flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <span className={clsx(values.length === 0 && "text-slate-400")}>
          {values.length === 0
            ? placeholder ?? "Choose..."
            : `${values.length} room${values.length !== 1 ? "s" : ""} selected`}
        </span>
        <ChevronDownIcon />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl max-h-60 overflow-y-auto">
            <div className="p-1">
              {values.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onValuesChange?.([]);
                  }}
                  className="w-full text-left rounded-md px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 border-b border-slate-100 mb-1"
                >
                  Clear all ({values.length})
                </button>
              )}
              {options.map((opt) => {
                const isSelected = values.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleValue(opt.value)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-100"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


const defaultCategoryDraft: CategoryDraft = {
  name: "",
  base_rate: "",
  capacity: "2",
  description: "",
};

const defaultRoomDraft: RoomDraft = {
  number: "",
  category_id: "",
  floor: "",
  status: "available",
  notes: "",
};

const defaultBookingDraft: BookingDraft = {
  guest_name: "",
  guest_email: "",
  guest_passport: "",
  second_guest_name: "",
  second_guest_email: "",
  second_guest_passport: "",
  room_ids: [],
  check_in: "",
  check_out: "",
  status: "reserved",
  auto_release_at: null,
  notes: "",
};

export function Dashboard({ view = "all" }: { view?: DashboardView }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [availabilityBookings, setAvailabilityBookings] = useState<Booking[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<import("./types").BookingLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [propertyDraft, setPropertyDraft] = useState({
    name: "",
    code: "",
    address: "",
    timezone: "UTC",
  });
  const [categoryDraft, setCategoryDraft] =
    useState<CategoryDraft>(defaultCategoryDraft);
  const [roomDraft, setRoomDraft] = useState<RoomDraft>(defaultRoomDraft);
  const [bookingDraft, setBookingDraft] =
    useState<BookingDraft>(defaultBookingDraft);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [bookingSort, setBookingSort] = useState<"check_in" | "guest" | "room">(
    "check_in",
  );
  const [bookingSearch, setBookingSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId");
  // Approval is disabled; any signed-in user can use the app
  const isApproved = true;
  const canUseApp = Boolean(session);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (propertyIdParam) {
      setSelectedPropertyId(propertyIdParam);
    }
  }, [propertyIdParam]);

  const shouldShowSection = useCallback(
    (section: Exclude<DashboardView, "all">) => view === "all" || view === section,
    [view],
  );

  const activeProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId],
  );

  const goToBookingsSection = () => {
    const el = document.getElementById("bookings");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const target = selectedPropertyId
      ? `/bookings?propertyId=${selectedPropertyId}`
      : "/bookings";
    router.push(target);
  };

  const goToAvailabilitySection = () => {
    const el = document.getElementById("availability");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const target = selectedPropertyId
      ? `/availability?propertyId=${selectedPropertyId}`
      : "/availability";
    router.push(target);
  };

  const startNewBooking = () => {
    setBookingDraft(defaultBookingDraft);
    setBookingModalOpen(true);
  };

  const resetAll = useCallback(() => {
    setProperties([]);
    setSelectedPropertyId(null);
    setCategories([]);
    setRooms([]);
    setBookings([]);
    setBookingsCount(0);
    setBookingsPage(1);
    setBookingsLoading(false);
    setAvailabilityBookings([]);
    setAvailabilityLoading(false);
    setCalendarMonth(startOfMonth(new Date()));
    setMessage(null);
    setError(null);
  }, []);

  const loadUserProfile = useCallback(
    async (activeSession: Session | null) => {
      if (!activeSession) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);
      setProfileError(null);

      const userId = activeSession.user.id;
      const userEmail = activeSession.user.email ?? "";
      const metadataName =
        (activeSession.user.user_metadata?.display_name as string | undefined) ||
        (activeSession.user.user_metadata?.full_name as string | undefined);
      const fallbackName =
        (metadataName && metadataName.trim()) ||
        userEmail.split("@")[0] ||
        "User";

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setProfileError(error.message);
        setProfileLoading(false);
        return;
      }

      if (!data) {
        const { data: inserted, error: insertError } = await supabase
          .from("user_profiles")
          .insert([
            {
              id: userId,
              email: userEmail,
              display_name: fallbackName,
            },
          ])
          .select()
          .maybeSingle();

        if (insertError) {
          setProfileError(insertError.message);
          setProfileLoading(false);
          return;
        }

        setProfile(inserted);
        setProfileLoading(false);
        return;
      }

      setProfile(data);
      setProfileLoading(false);
    },
    [],
  );

  const loadProperties = useCallback(async () => {
    if (!session || !isApproved) return;
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("name");

    if (error) {
      setError(error.message);
      return;
    }

    setProperties(data ?? []);
    if (!selectedPropertyId && !propertyIdParam && data?.length) {
      setSelectedPropertyId(data[0].id);
    }
  }, [session, selectedPropertyId, propertyIdParam, isApproved]);

  const loadBookingsPage = useCallback(
    async (
      page = 1,
      options?: {
        propertyId?: string;
        status?: string;
        sort?: "check_in" | "guest" | "room";
        search?: string;
        month?: Date;
      },
    ) => {
      if (!session || !isApproved) return;
      const targetPropertyId = options?.propertyId ?? selectedPropertyId;
      if (!targetPropertyId) return;

      const status = options?.status ?? bookingStatusFilter;
      const sort = options?.sort ?? bookingSort;
      const search = options?.search ?? bookingSearch;
      const targetMonth = options?.month ?? calendarMonth;

      setBookingsLoading(true);
      const from = (page - 1) * BOOKINGS_PAGE_SIZE;
      const to = from + BOOKINGS_PAGE_SIZE - 1;

      // Calculate month range for filtering
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);
      const monthStartDate = monthStart.toISOString().split("T")[0];
      const monthEndDate = addDays(monthEnd, 1).toISOString().split("T")[0];

      let query = supabase
        .from("bookings")
        .select(
          "id, property_id, room_id, guest_name, guest_email, guest_passport, second_guest_name, second_guest_email, second_guest_passport, adults, check_in, check_out, status, auto_release_at, reference_code, notes, created_by, created_by_user:user_profiles(display_name)",
          { count: "exact" },
        )
        .eq("property_id", targetPropertyId)
        .gte("check_in", monthStartDate)
        .lt("check_in", monthEndDate);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (search.trim()) {
        const term = search.trim();
        const likeTerm = `%${term}%`;
        query = query.or(
          [
            `guest_name.ilike.${likeTerm}`,
            `guest_email.ilike.${likeTerm}`,
            `guest_passport.ilike.${likeTerm}`,
            `second_guest_name.ilike.${likeTerm}`,
            `second_guest_email.ilike.${likeTerm}`,
            `second_guest_passport.ilike.${likeTerm}`,
            `reference_code.ilike.${likeTerm}`,
          ].join(","),
        );
      }

      const orderColumn =
        sort === "guest" ? "guest_name" : sort === "room" ? "room_id" : "check_in";

      const { data, error, count } = await query
        .order(orderColumn, { ascending: true, nullsFirst: true })
        .range(from, to);

      if (error) {
        setError(error.message);
        setBookings([]);
        setBookingsCount(0);
        setBookingsLoading(false);
        return;
      }

      // Map the data to include created_by_name from the join
      const bookingsWithCreator = (data ?? []).map((booking: any) => ({
        ...booking,
        created_by_name: booking.created_by_user?.display_name || null,
      }));

      setBookings(bookingsWithCreator);
      setBookingsCount(count ?? 0);
      setBookingsPage(page);
      setBookingsLoading(false);
    },
    [selectedPropertyId, session, isApproved, bookingStatusFilter, bookingSort, bookingSearch, calendarMonth],
  );

  useEffect(() => {
    if (!canUseApp || !selectedPropertyId) return;
    const delay = bookingSearch.trim() ? 400 : 0;
    const timer = setTimeout(() => {
      setBookingsPage(1);
      void loadBookingsPage(1, {
        propertyId: selectedPropertyId ?? undefined,
        status: bookingStatusFilter,
        sort: bookingSort,
        search: bookingSearch,
        month: calendarMonth,
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [
    bookingSearch,
    bookingStatusFilter,
    bookingSort,
    canUseApp,
    selectedPropertyId,
    calendarMonth,
    loadBookingsPage,
  ]);

  const loadAvailabilityBookings = useCallback(
    async (propertyId: string, month: Date) => {
      if (!session || !isApproved) return;
      setAvailabilityLoading(true);
      const start = startOfMonth(month);
      const end = addDays(endOfMonth(month), 1);
      const startDate = start.toISOString().split("T")[0];
      const endDate = end.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, property_id, room_id, guest_name, guest_email, guest_passport, second_guest_name, second_guest_email, second_guest_passport, adults, check_in, check_out, status, auto_release_at, reference_code, notes, created_by, created_by_user:user_profiles(display_name)",
        )
        .eq("property_id", propertyId)
        .neq("status", "cancelled")
        .lt("check_in", endDate)
        .gt("check_out", startDate)
        .order("check_in", { ascending: true });

      if (error) {
        setError(error.message);
        setAvailabilityBookings([]);
      } else {
        // Map the data to include created_by_name from the join
        const bookingsWithCreator = (data ?? []).map((booking: any) => ({
          ...booking,
          created_by_name: booking.created_by_user?.display_name || null,
        }));
        setAvailabilityBookings(bookingsWithCreator);
      }
      setAvailabilityLoading(false);
    },
    [session, isApproved],
  );

  const loadRecentActivity = useCallback(async () => {
    if (!session || !isApproved) return;
    setActivityLoading(true);

    // If a property is selected, filter by it. Otherwise show all (if user has access)
    let query = supabase
      .from("booking_logs")
      .select(`
        *,
        performed_by_user:user_profiles(display_name),
        property:properties(name)
      `)
      .order("performed_at", { ascending: false })
      .limit(20);

    if (selectedPropertyId) {
      query = query.eq("property_id", selectedPropertyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading activity:", error);
    } else {
      setRecentActivity(data as any ?? []);
    }
    setActivityLoading(false);
  }, [session, isApproved, selectedPropertyId]);

  const loadPropertyData = useCallback(async (propertyId: string) => {
    if (!session || !isApproved) return;
    const [catRes, roomRes] = await Promise.all([
      supabase
        .from("room_categories")
        .select("id, property_id, name, description, base_rate, capacity")
        .eq("property_id", propertyId)
        .order("name"),
      supabase
        .from("rooms")
        .select("id, property_id, category_id, number, floor, status, notes")
        .eq("property_id", propertyId)
        .order("number"),
    ]);

    if (catRes.error) setError(catRes.error.message);
    if (roomRes.error) setError(roomRes.error.message);

    setCategories(catRes.data ?? []);
    setRooms(roomRes.data ?? []);
  }, [session, isApproved]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setSessionChecked(true);
        if (data.session) {
          void loadUserProfile(data.session);
        }
      })
      .catch(() => {
        setSession(null);
        setProfile(null);
        setSessionChecked(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setSessionChecked(true);
        if (newSession) {
          void loadUserProfile(newSession);
        } else {
          setProfile(null);
          resetAll();
        }
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [resetAll, loadUserProfile]);

  useEffect(() => {
    if (sessionChecked && session === null) {
      router.replace("/login");
    }
  }, [sessionChecked, session, router]);

  useEffect(() => {
    if (!canUseApp) return;
    void loadProperties();
  }, [canUseApp, loadProperties]);

  useEffect(() => {
    if (!canUseApp || !selectedPropertyId) return;
    void loadPropertyData(selectedPropertyId);
  }, [selectedPropertyId, loadPropertyData, canUseApp]);

  useEffect(() => {
    if (!canUseApp || !selectedPropertyId) return;
    setBookingsPage(1);
    void loadBookingsPage(1, {
      propertyId: selectedPropertyId,
      status: bookingStatusFilter,
      sort: bookingSort,
      search: bookingSearch,
      month: calendarMonth,
    });
  }, [
    selectedPropertyId,
    bookingStatusFilter,
    bookingSort,
    bookingSearch,
    calendarMonth,
    loadBookingsPage,
    canUseApp,
  ]);

  useEffect(() => {
    if (!canUseApp) return;
    void loadRecentActivity();
  }, [canUseApp, selectedPropertyId, loadRecentActivity]);

  useEffect(() => {
    if (!canUseApp || !selectedPropertyId) return;
    void loadAvailabilityBookings(selectedPropertyId, calendarMonth);
  }, [selectedPropertyId, calendarMonth, loadAvailabilityBookings, canUseApp]);

  useEffect(() => {
    if (view === "tentative" && bookingStatusFilter !== "tentative") {
      setBookingStatusFilter("tentative");
    }
  }, [view, bookingStatusFilter]);

  const refreshBookingsData = useCallback(
    async (page?: number) => {
      if (!canUseApp || !selectedPropertyId) return;
      const targetPage = page ?? bookingsPage;
      await Promise.all([
        loadBookingsPage(targetPage, {
          propertyId: selectedPropertyId ?? undefined,
          status: bookingStatusFilter,
          sort: bookingSort,
          search: bookingSearch,
          month: calendarMonth,
        }),
        loadAvailabilityBookings(selectedPropertyId, calendarMonth),
      ]);
    },
    [
      selectedPropertyId,
      bookingsPage,
      bookingStatusFilter,
      bookingSort,
      bookingSearch,
      calendarMonth,
      loadBookingsPage,
      loadAvailabilityBookings,
      canUseApp,
    ],
  );

  const handleBookingsPageChange = (page: number) => {
    const maxPages =
      bookingsCount > 0 ? Math.ceil(bookingsCount / BOOKINGS_PAGE_SIZE) : 0;
    if (page < 1 || (maxPages > 0 && page > maxPages)) return;
    setBookingsPage(page);
    void loadBookingsPage(page, {
      propertyId: selectedPropertyId ?? undefined,
      status: bookingStatusFilter,
      sort: bookingSort,
      search: bookingSearch,
      month: calendarMonth,
    });
  };

  const handleAuth = async (mode: "signin" | "signup") => {
    if (mode === "signup" && !displayName.trim()) {
      setAuthError("Name is required.");
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setError(null);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({
          email,
          password,
        })
        : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });
    if (error) {
      setAuthError(error.message);
    } else {
      setMessage(
        mode === "signin"
          ? "Signed in"
          : "Account created. Awaiting admin approval.",
      );
      if (mode === "signup") {
        setDisplayName("");
      }
    }
    setAuthLoading(false);
  };

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
      setProfile(null);
      setProfileError(null);
      resetAll();
      // Use window.location for a hard refresh to clear any in-memory state
      window.location.href = "/login";
    }
  };

  const updateRoomStatus = async (roomId: string, status: string) => {
    const { error } = await supabase.from("rooms").update({ status }).eq("id", roomId);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Room status updated");
    if (selectedPropertyId) await loadPropertyData(selectedPropertyId);
  };

  const upsertProperty = async () => {
    if (!session) return;
    if (!propertyDraft.name.trim()) {
      setError("Property name is required.");
      return;
    }

    const { error } = await supabase.from("properties").insert([
      {
        name: propertyDraft.name.trim(),
        code: propertyDraft.code.trim() || null,
        address: propertyDraft.address.trim() || null,
        timezone: propertyDraft.timezone || null,
        owner_id: session.user.id,
      },
    ]);

    if (error) {
      setError(error.message);
      return;
    }

    setPropertyDraft({ name: "", code: "", address: "", timezone: "UTC" });
    setPropertyModalOpen(false);
    setMessage("Property created");
    await loadProperties();
  };

  const deleteProperty = async (id: string) => {
    // Check for active bookings
    const { data: activeBookings, error: checkError } = await supabase
      .from("bookings")
      .select("id")
      .eq("property_id", id)
      .in("status", ["tentative", "reserved", "checked_in"])
      .limit(1);

    if (checkError) {
      setError(checkError.message);
      return;
    }

    if (activeBookings && activeBookings.length > 0) {
      setError("Cannot delete property with active bookings. Please cancel or complete them first.");
      return;
    }

    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Property removed");
    if (id === selectedPropertyId) {
      resetAll();
    }
    await loadProperties();
  };

  const upsertCategory = async () => {
    if (!selectedPropertyId) {
      setError("Select a property first.");
      return;
    }
    if (!categoryDraft.name.trim()) {
      setError("Category name is required.");
      return;
    }
    const payload = {
      property_id: selectedPropertyId,
      name: categoryDraft.name.trim(),
      description: categoryDraft.description.trim() || null,
      base_rate: categoryDraft.base_rate
        ? Number(categoryDraft.base_rate)
        : null,
      capacity: categoryDraft.capacity ? Number(categoryDraft.capacity) : null,
    };

    const { error } = categoryDraft.id
      ? await supabase
        .from("room_categories")
        .update(payload)
        .eq("id", categoryDraft.id)
      : await supabase.from("room_categories").insert([payload]);

    if (error) {
      setError(error.message);
      return;
    }

    setCategoryDraft(defaultCategoryDraft);
    setCategoryModalOpen(false);
    setMessage(categoryDraft.id ? "Category updated" : "Category created");
    await loadPropertyData(selectedPropertyId);
  };

  const deleteCategory = async (id: string) => {
    // Check for active bookings in rooms of this category
    const { data: roomsInCat, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("category_id", id);

    if (roomError) {
      setError(roomError.message);
      return;
    }

    if (roomsInCat && roomsInCat.length > 0) {
      const roomIds = roomsInCat.map(r => r.id);
      const { data: activeBookings, error: checkError } = await supabase
        .from("bookings")
        .select("id")
        .in("room_id", roomIds)
        .in("status", ["tentative", "reserved", "checked_in"])
        .limit(1);

      if (checkError) {
        setError(checkError.message);
        return;
      }

      if (activeBookings && activeBookings.length > 0) {
        setError("Cannot delete category. Some rooms in this category have active bookings.");
        return;
      }
    }

    const { error } = await supabase.from("room_categories").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Category removed");
    if (selectedPropertyId) await loadPropertyData(selectedPropertyId);
  };

  const upsertRoom = async () => {
    if (!selectedPropertyId) {
      setError("Select a property first.");
      return;
    }
    if (!roomDraft.number.trim()) {
      setError("Room number is required.");
      return;
    }
    const payload = {
      property_id: selectedPropertyId,
      category_id: roomDraft.category_id || null,
      number: roomDraft.number.trim(),
      floor: roomDraft.floor.trim() || null,
      status: roomDraft.status,
      notes: roomDraft.notes.trim() || null,
    };

    const { error } = roomDraft.id
      ? await supabase.from("rooms").update(payload).eq("id", roomDraft.id)
      : await supabase.from("rooms").insert([payload]);

    if (error) {
      setError(error.message);
      return;
    }
    setRoomDraft(defaultRoomDraft);
    setRoomModalOpen(false);
    setMessage(roomDraft.id ? "Room updated" : "Room created");
    await loadPropertyData(selectedPropertyId);
  };

  const deleteRoom = async (id: string) => {
    // Check for active bookings
    const { data: activeBookings, error: checkError } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", id)
      .in("status", ["tentative", "reserved", "checked_in"])
      .limit(1);

    if (checkError) {
      setError(checkError.message);
      return;
    }

    if (activeBookings && activeBookings.length > 0) {
      setError("Cannot delete room with active bookings. Please cancel or complete them first.");
      return;
    }

    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Room removed");
    if (selectedPropertyId) await loadPropertyData(selectedPropertyId);
  };

  const upsertBooking = async () => {
    if (!selectedPropertyId) {
      setError("Select a property first.");
      return;
    }
    if (!bookingDraft.guest_name.trim()) {
      setError("Guest name is required.");
      return;
    }
    if (!bookingDraft.check_in || !bookingDraft.check_out) {
      setError("Check-in and check-out dates are required.");
      return;
    }
    if (bookingDraft.check_in >= bookingDraft.check_out) {
      setError("Check-out date must be after check-in date.");
      return;
    }

    // If editing existing booking, use old single-room logic
    if (bookingDraft.id) {
      const roomId = bookingDraft.room_ids[0] || null;

      if (roomId) {
        let conflictQuery = supabase
          .from("bookings")
          .select("id, check_in, check_out")
          .eq("room_id", roomId)
          .neq("status", "cancelled")
          .lt("check_in", bookingDraft.check_out)
          .gt("check_out", bookingDraft.check_in)
          .neq("id", bookingDraft.id);

        const { data: conflictingBookings, error: overlapError } = await conflictQuery;

        if (overlapError) {
          setError(overlapError.message);
          return;
        }

        if (conflictingBookings && conflictingBookings.length > 0) {
          setError("This room already has a booking that overlaps those dates.");
          return;
        }
      }

      const payload = {
        property_id: selectedPropertyId,
        room_id: roomId,
        guest_name: bookingDraft.guest_name.trim(),
        guest_email: bookingDraft.guest_email.trim() || null,
        guest_passport: bookingDraft.guest_passport.trim() || null,
        second_guest_name: bookingDraft.second_guest_name.trim() || null,
        second_guest_email: bookingDraft.second_guest_email.trim() || null,
        second_guest_passport: bookingDraft.second_guest_passport.trim() || null,
        adults: [
          bookingDraft.second_guest_name,
          bookingDraft.second_guest_email,
          bookingDraft.second_guest_passport,
        ].some((v) => v.trim()) ? 2 : 1,
        check_in: bookingDraft.check_in,
        check_out: bookingDraft.check_out,
        status: bookingDraft.status,
        auto_release_at: bookingDraft.status === "tentative" && bookingDraft.auto_release_at ? bookingDraft.auto_release_at : null,
        notes: bookingDraft.notes.trim() || null,
      };

      const { error } = await supabase.from("bookings").update(payload).eq("id", bookingDraft.id);

      if (error) {
        setError(error.message);
        return;
      }
      setBookingDraft(defaultBookingDraft);
      setBookingModalOpen(false);
      setMessage("Booking updated");
      await refreshBookingsData(1);
      return;
    }

    // New booking logic: handle multiple rooms
    const roomIds = bookingDraft.room_ids.length > 0 ? bookingDraft.room_ids : [null];

    // Check for conflicts in all selected rooms
    for (const roomId of roomIds) {
      if (roomId) {
        const { data: conflictingBookings, error: overlapError } = await supabase
          .from("bookings")
          .select("id, check_in, check_out")
          .eq("room_id", roomId)
          .neq("status", "cancelled")
          .lt("check_in", bookingDraft.check_out)
          .gt("check_out", bookingDraft.check_in);

        if (overlapError) {
          setError(overlapError.message);
          return;
        }

        if (conflictingBookings && conflictingBookings.length > 0) {
          const room = rooms.find(r => r.id === roomId);
          setError(`Room ${room?.number || roomId} already has a booking that overlaps those dates.`);
          return;
        }
      }
    }

    // Create bookings for all selected rooms
    const basePayload = {
      property_id: selectedPropertyId,
      guest_name: bookingDraft.guest_name.trim(),
      guest_email: bookingDraft.guest_email.trim() || null,
      guest_passport: bookingDraft.guest_passport.trim() || null,
      second_guest_name: bookingDraft.second_guest_name.trim() || null,
      second_guest_email: bookingDraft.second_guest_email.trim() || null,
      second_guest_passport: bookingDraft.second_guest_passport.trim() || null,
      adults: [
        bookingDraft.second_guest_name,
        bookingDraft.second_guest_email,
        bookingDraft.second_guest_passport,
      ].some((v) => v.trim()) ? 2 : 1,
      check_in: bookingDraft.check_in,
      check_out: bookingDraft.check_out,
      status: bookingDraft.status,
      auto_release_at: bookingDraft.status === "tentative" && bookingDraft.auto_release_at ? bookingDraft.auto_release_at : null,
      notes: bookingDraft.notes.trim() || null,
      created_by: session?.user.id || null,
    };

    const payloads = roomIds.map(roomId => ({
      ...basePayload,
      room_id: roomId,
    }));

    const { error } = await supabase.from("bookings").insert(payloads);

    if (error) {
      setError(error.message);
      return;
    }

    setBookingDraft(defaultBookingDraft);
    setBookingModalOpen(false);

    if (roomIds.length === 1 && roomIds[0] === null) {
      setMessage("Booking created");
    } else {
      const roomNumbers = roomIds
        .map(id => rooms.find(r => r.id === id)?.number)
        .filter(Boolean)
        .join(", ");
      setMessage(`${roomIds.length} booking${roomIds.length !== 1 ? "s" : ""} created for room${roomIds.length !== 1 ? "s" : ""} ${roomNumbers}`);
    }

    // Log the creation
    try {
      const logPayloads = roomIds.map(roomId => {
        const roomNumber = rooms.find(r => r.id === roomId)?.number || "Unassigned";
        return {
          property_id: selectedPropertyId,
          action: "create",
          performed_by: session?.user.id,
          details: {
            guest_name: bookingDraft.guest_name,
            room_number: roomNumber,
            check_in: bookingDraft.check_in,
            check_out: bookingDraft.check_out,
          }
        };
      });

      await supabase.from("booking_logs").insert(logPayloads);
      void loadRecentActivity();
    } catch (err) {
      console.error("Failed to log booking creation", err);
    }

    await refreshBookingsData(1);
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Booking updated");
    await refreshBookingsData();
  };

  const deleteBooking = async (id: string) => {
    const bookingToDelete = bookings.find(b => b.id === id);

    const { error: deleteError } = await supabase.from("bookings").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    // Log deletion
    if (bookingToDelete) {
      try {
        const roomNumber = rooms.find(r => r.id === bookingToDelete.room_id)?.number || "Unknown";

        await supabase.from("booking_logs").insert([{
          property_id: bookingToDelete.property_id,
          action: "delete",
          booking_id: bookingToDelete.id,
          performed_by: session?.user.id,
          details: {
            guest_name: bookingToDelete.guest_name,
            room_number: roomNumber,
            check_in: bookingToDelete.check_in,
            check_out: bookingToDelete.check_out,
          }
        }]);
        void loadRecentActivity();
      } catch (err) {
        console.error("Failed to log deletion", err);
      }
    }

    setMessage("Booking removed");
    const nextPage =
      bookings.length === 1 && bookingsPage > 1 ? bookingsPage - 1 : bookingsPage;
    setBookingsPage(nextPage);
    await refreshBookingsData(nextPage);
  };

  const formatDateRange = (from: string, to: string) => {
    try {
      return `${format(new Date(from), "MMM d")} - ${format(new Date(to), "MMM d, yyyy")}`;
    } catch {
      return `${from} → ${to}`;
    }
  };

  const totalBookingPages =
    bookingsCount > 0 ? Math.ceil(bookingsCount / BOOKINGS_PAGE_SIZE) : 0;
  const bookingRangeStart =
    bookingsCount === 0 ? 0 : (bookingsPage - 1) * BOOKINGS_PAGE_SIZE + 1;
  const bookingRangeEnd = Math.min(bookingsCount, bookingsPage * BOOKINGS_PAGE_SIZE);

  if (!session) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (profileLoading || (!profile && !profileError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className={clsx(cardClass, "max-w-md w-full text-center space-y-3")}>
          <h1 className="text-xl font-semibold text-slate-900">Loading your account</h1>
          <p className="text-sm text-slate-600">Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className={clsx(cardClass, "max-w-md w-full space-y-4")}>
          <h1 className="text-xl font-semibold text-rose-700">Could not load profile</h1>
          <p className="text-sm text-slate-600">{profileError}</p>
          <div className="flex gap-3">
            <button className={ghostButton} onClick={handleSignOut}>
              Sign out
            </button>
            <button
              className={primaryButton}
              onClick={() => {
                if (session) void loadUserProfile(session);
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Approval gating removed; allow all signed-in users through

  return (
    <main
      className={clsx(
        "min-h-screen bg-slate-50 p-4 lg:p-10 transition duration-300 ease-out",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      <Dialog.Root
        open={bookingModalOpen}
        onOpenChange={(open) => {
          setBookingModalOpen(open);
          if (!open) setBookingDraft(defaultBookingDraft);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-[5%] sm:top-1/2 z-50 w-[min(560px,94vw)] max-h-[90vh] -translate-x-1/2 sm:-translate-y-1/2 rounded-2xl bg-white p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-start justify-between flex-shrink-0">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  {bookingDraft.id ? "Edit booking" : "New booking"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-slate-600">
                  Capture stay dates and assign a room when ready.
                </Dialog.Description>
              </div>
              <Dialog.Close className="text-slate-500 hover:text-slate-700 flex-shrink-0 ml-2">
                <Cross2Icon />
              </Dialog.Close>
            </div>
            <div className="mt-4 space-y-3 overflow-y-auto flex-1 min-h-0 pr-1 -mr-1">
              <div className="space-y-1">
                <FieldLabel>Guest name</FieldLabel>
                <Input
                  value={bookingDraft.guest_name}
                  onChange={(e) =>
                    setBookingDraft((d) => ({ ...d, guest_name: e.target.value }))
                  }
                  placeholder="Guest full name"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel>Guest email</FieldLabel>
                  <Input
                    type="email"
                    value={bookingDraft.guest_email}
                    onChange={(e) =>
                      setBookingDraft((d) => ({
                        ...d,
                        guest_email: e.target.value,
                      }))
                    }
                    placeholder="guest@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Room{bookingDraft.id ? "" : "s (select multiple for group bookings)"}</FieldLabel>
                  {bookingDraft.id ? (
                    <SelectField
                      value={bookingDraft.room_ids[0] || ""}
                      onValueChange={(val) =>
                        setBookingDraft((d) => ({ ...d, room_ids: val ? [val] : [] }))
                      }
                      options={rooms.map((r) => ({
                        value: r.id,
                        label: `Room ${r.number}`,
                      }))}
                      placeholder="Unassigned"
                    />
                  ) : (
                    <MultiSelectField
                      values={bookingDraft.room_ids}
                      onValuesChange={(vals) =>
                        setBookingDraft((d) => ({ ...d, room_ids: vals }))
                      }
                      options={rooms.map((r) => ({
                        value: r.id,
                        label: `Room ${r.number}`,
                      }))}
                      placeholder="Select rooms (optional)"
                    />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <FieldLabel>Passport number (primary guest)</FieldLabel>
                <Input
                  value={bookingDraft.guest_passport}
                  onChange={(e) =>
                    setBookingDraft((d) => ({ ...d, guest_passport: e.target.value }))
                  }
                  placeholder="Passport number"
                />
                <p className="text-[10px] text-slate-500">
                  Optional, but helps with future green tax reporting.
                </p>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <FieldLabel>Second guest (optional)</FieldLabel>
                  <span className="text-[10px] font-semibold text-slate-500">
                    Counts toward guest total
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <FieldLabel>Name</FieldLabel>
                    <Input
                      value={bookingDraft.second_guest_name}
                      onChange={(e) =>
                        setBookingDraft((d) => ({ ...d, second_guest_name: e.target.value }))
                      }
                      placeholder="Second guest name"
                    />
                  </div>
                  <div className="space-y-1">
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      type="email"
                      value={bookingDraft.second_guest_email}
                      onChange={(e) =>
                        setBookingDraft((d) => ({
                          ...d,
                          second_guest_email: e.target.value,
                        }))
                      }
                      placeholder="second@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <FieldLabel>Passport number</FieldLabel>
                  <Input
                    value={bookingDraft.second_guest_passport}
                    onChange={(e) =>
                      setBookingDraft((d) => ({
                        ...d,
                        second_guest_passport: e.target.value,
                      }))
                    }
                    placeholder="Passport number"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel>Check-in</FieldLabel>
                  <Input
                    type="date"
                    value={bookingDraft.check_in}
                    onChange={(e) =>
                      setBookingDraft((d) => ({ ...d, check_in: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Check-out</FieldLabel>
                  <Input
                    type="date"
                    value={bookingDraft.check_out}
                    onChange={(e) =>
                      setBookingDraft((d) => ({ ...d, check_out: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <FieldLabel>Status</FieldLabel>
                <SelectField
                  value={bookingDraft.status}
                  onValueChange={(val) =>
                    setBookingDraft((d) => ({ ...d, status: val }))
                  }
                  options={bookingStatuses}
                />
              </div>
              {bookingDraft.status === "tentative" && (
                <div className="space-y-1">
                  <FieldLabel>Auto Release Date</FieldLabel>
                  <Input
                    type="datetime-local"
                    value={bookingDraft.auto_release_at ?? ""}
                    onChange={(e) =>
                      setBookingDraft((d) => ({ ...d, auto_release_at: e.target.value }))
                    }
                  />
                  <p className="text-[10px] text-slate-500">
                    Booking will automatically cancel if not confirmed by this date.
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <FieldLabel>Notes</FieldLabel>
                <TextArea
                  rows={3}
                  value={bookingDraft.notes}
                  onChange={(e) =>
                    setBookingDraft((d) => ({ ...d, notes: e.target.value }))
                  }
                  placeholder="Early arrival, payment status, etc."
                />
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2 flex-shrink-0 pt-4 border-t border-slate-100">
              <Dialog.Close className={ghostButton}>Cancel</Dialog.Close>
              <button className={primaryButton} onClick={upsertBooking}>
                Save booking
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="mx-auto max-w-7xl">
        {/* Legacy sidebar removed in favor of global layout */}

        <div className="space-y-7">
          <header className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-6 sm:p-8 shadow-[0_20px_80px_-40px_rgba(16,185,129,0.5)]">
            <div className="absolute inset-y-0 right-10 w-48 bg-gradient-to-b from-emerald-200/50 via-white/0 to-sky-200/50 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-gradient-to-tr from-emerald-200/40 via-white/50 to-sky-200/50 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                    Room OS
                  </span>
                  {activeProperty?.code && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1 text-[11px] font-semibold uppercase text-emerald-800 ring-1 ring-emerald-200">
                      Code: {activeProperty.code}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                    {activeProperty ? activeProperty.name : "Multi-property dashboard"}
                  </h1>
                  <p className="text-base text-slate-600 max-w-2xl">
                    {activeProperty
                      ? `${activeProperty.address ?? "Manage your property details"}, bookings, and room availability.`
                      : "Select a property to view details and manage bookings."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)] animate-pulse" />
                    Live sync
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 15"></polyline></svg>
                    {activeProperty?.timezone ?? "Timezone not set"}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>
                    {rooms.length} rooms
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path></svg>
                    {bookingsCount ?? 0} bookings
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="min-w-[240px]">
                    <SelectField
                      value={selectedPropertyId ?? ""}
                      onValueChange={(val) => setSelectedPropertyId(val || null)}
                      placeholder="Switch property..."
                      options={properties.map((p) => ({ value: p.id, label: p.name }))}
                    />
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {activeProperty ? "Property context" : "Choose a property to begin"}
                  </div>
                </div>
              </div>

              <div className="w-full lg:max-w-sm">
                <div className="rounded-2xl bg-white/90 border border-emerald-100 shadow-xl shadow-emerald-100/70 backdrop-blur p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-800">Quick actions</div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full ring-1 ring-emerald-100">
                      {format(new Date(), "MMM d")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Speed through the most common tasks for this property.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:bg-emerald-600 disabled:opacity-60"
                      onClick={startNewBooking}
                      disabled={!activeProperty}
                    >
                      <PlusIcon className="h-4 w-4" /> New booking
                    </button>
                    <button
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:text-emerald-800 disabled:opacity-60"
                      onClick={goToBookingsSection}
                      disabled={!activeProperty}
                    >
                      View bookings
                    </button>
                  </div>
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60"
                    onClick={goToAvailabilitySection}
                    disabled={!activeProperty}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path></svg>
                    Availability calendar
                  </button>

                  <button
                    className="inline-flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100 disabled:opacity-60"
                    onClick={() => {
                      const el = document.getElementById("tentative");
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth" });
                      } else {
                        if (activeProperty) router.push(`/tentative?propertyId=${activeProperty.id}`);
                      }
                    }}
                    disabled={!activeProperty}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      Tentative Holds
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {(message || error) && (
            <div
              className={clsx(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
                message
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              <div className="mt-0.5">
                {message ? "✓" : "!"}
              </div>
              <div className="flex-1">
                {message ?? error}
              </div>
              <button
                className="text-slate-500 hover:text-slate-700"
                onClick={() => {
                  setMessage(null);
                  setError(null);
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {shouldShowSection("properties") && (
            <section id="properties" className={clsx(cardClass, "space-y-4")}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Properties
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Manage multiple properties
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <Dialog.Root open={propertyModalOpen} onOpenChange={setPropertyModalOpen}>
                    <Dialog.Trigger className={primaryButton}>
                      <PlusIcon /> Add property
                    </Dialog.Trigger>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(480px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between">
                          <div>
                            <Dialog.Title className="text-lg font-semibold text-slate-900">
                              New property
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-600">
                              Add a property to start assigning rooms and bookings.
                            </Dialog.Description>
                          </div>
                          <Dialog.Close className="text-slate-500 hover:text-slate-700">
                            <Cross2Icon />
                          </Dialog.Close>
                        </div>
                        <div className="mt-4 space-y-3">
                          <div className="space-y-1">
                            <FieldLabel>Name</FieldLabel>
                            <Input
                              value={propertyDraft.name}
                              onChange={(e) =>
                                setPropertyDraft((d) => ({ ...d, name: e.target.value }))
                              }
                              placeholder="Downtown Suites"
                              required
                            />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <FieldLabel>Code</FieldLabel>
                              <Input
                                value={propertyDraft.code}
                                onChange={(e) =>
                                  setPropertyDraft((d) => ({ ...d, code: e.target.value }))
                                }
                                placeholder="DT-001"
                              />
                            </div>
                            <div className="space-y-1">
                              <FieldLabel>Timezone</FieldLabel>
                              <Input
                                value={propertyDraft.timezone}
                                onChange={(e) =>
                                  setPropertyDraft((d) => ({ ...d, timezone: e.target.value }))
                                }
                                placeholder="UTC"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>Address</FieldLabel>
                            <Input
                              value={propertyDraft.address}
                              onChange={(e) =>
                                setPropertyDraft((d) => ({ ...d, address: e.target.value }))
                              }
                              placeholder="Street, city"
                            />
                          </div>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                          <Dialog.Close className={ghostButton}>Cancel</Dialog.Close>
                          <button className={primaryButton} onClick={upsertProperty}>
                            Save property
                          </button>
                        </div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.6fr,1fr]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Your properties
                    </h3>
                  </div>
                  {properties.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                      No properties yet. Add one to begin managing rooms.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {properties.map((property) => (
                        <div
                          key={property.id}
                          className={clsx(
                            "rounded-xl border px-4 py-3 shadow-sm transition",
                            property.id === selectedPropertyId
                              ? "border-black shadow-md"
                              : "border-slate-200 bg-white hover:border-slate-300",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {property.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {property.code ?? "No code"} • {property.timezone ?? "UTC"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className={clsx(
                                  ghostButton,
                                  "px-3 py-1 text-xs",
                                )}
                                onClick={() => setSelectedPropertyId(property.id)}
                              >
                                Set active
                              </button>
                              <button
                                className={clsx(
                                  dangerButton,
                                  "px-3 py-1 text-xs",
                                )}
                                onClick={() => deleteProperty(property.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          {property.address && (
                            <p className="mt-2 text-xs text-slate-500">{property.address}</p>
                          )}
                        </div>
                      ))}
                      {bookingsCount > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-slate-600 border-t border-slate-100">
                          <span className="font-semibold">
                            Showing {(bookingsPage - 1) * BOOKINGS_PAGE_SIZE + 1}-{Math.min(bookingsPage * BOOKINGS_PAGE_SIZE, bookingsCount)} of {bookingsCount}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              className={ghostButton}
                              onClick={() => handleBookingsPageChange(bookingsPage - 1)}
                              disabled={bookingsPage === 1 || bookingsLoading}
                            >
                              Previous
                            </button>
                            <span className="font-semibold text-slate-700">
                              Page {bookingsPage} of {totalBookingPages}
                            </span>
                            <button
                              className={ghostButton}
                              onClick={() => handleBookingsPageChange(bookingsPage + 1)}
                              disabled={bookingsPage >= totalBookingPages || bookingsLoading}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100/60 p-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Active property
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {activeProperty?.name ?? "None selected"}
                      </p>
                    </div>
                    <button
                      className={ghostButton}
                      onClick={() => {
                        if (!activeProperty) return;
                        void loadPropertyData(activeProperty.id);
                        void refreshBookingsData(1);
                      }}
                      disabled={!activeProperty}
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <p>Pick a property to manage categories, rooms, and bookings.</p>
                    <p>
                      Each resource is scoped to the active property and secured via Supabase
                      row level security.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {(shouldShowSection("categories") ||
            shouldShowSection("rooms") ||
            shouldShowSection("bookings") ||
            shouldShowSection("tentative") ||
            shouldShowSection("availability")) &&
            (activeProperty ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {shouldShowSection("categories") && (
                  <section id="categories" className={cardClass}>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                          Room categories
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Rate plans & capacities
                        </h3>
                      </div>
                      <Dialog.Root
                        open={categoryModalOpen}
                        onOpenChange={(open) => {
                          setCategoryModalOpen(open);
                          if (!open) {
                            setCategoryDraft(defaultCategoryDraft);
                          }
                        }}
                      >
                        <Dialog.Trigger className={primaryButton}>
                          <PlusIcon /> New category
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
                            <div className="flex items-start justify-between">
                              <div>
                                <Dialog.Title className="text-lg font-semibold text-slate-900">
                                  {categoryDraft.id ? "Edit category" : "New category"}
                                </Dialog.Title>
                                <Dialog.Description className="text-sm text-slate-600">
                                  Categories define the base rate and capacity for your rooms.
                                </Dialog.Description>
                              </div>
                              <Dialog.Close className="text-slate-500 hover:text-slate-700">
                                <Cross2Icon />
                              </Dialog.Close>
                            </div>
                            <div className="mt-4 space-y-3">
                              <div className="space-y-1">
                                <FieldLabel>Name</FieldLabel>
                                <Input
                                  value={categoryDraft.name}
                                  onChange={(e) =>
                                    setCategoryDraft((d) => ({ ...d, name: e.target.value }))
                                  }
                                  placeholder="King Suite"
                                />
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <FieldLabel>Base rate</FieldLabel>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={categoryDraft.base_rate}
                                    onChange={(e) =>
                                      setCategoryDraft((d) => ({
                                        ...d,
                                        base_rate: e.target.value,
                                      }))
                                    }
                                    placeholder="180"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <FieldLabel>Capacity</FieldLabel>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={categoryDraft.capacity}
                                    onChange={(e) =>
                                      setCategoryDraft((d) => ({
                                        ...d,
                                        capacity: e.target.value,
                                      }))
                                    }
                                    placeholder="2"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <FieldLabel>Description</FieldLabel>
                                <TextArea
                                  rows={3}
                                  value={categoryDraft.description}
                                  onChange={(e) =>
                                    setCategoryDraft((d) => ({
                                      ...d,
                                      description: e.target.value,
                                    }))
                                  }
                                  placeholder="Notes about inclusions or restrictions"
                                />
                              </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                              <Dialog.Close className={ghostButton}>Cancel</Dialog.Close>
                              <button className={primaryButton} onClick={upsertCategory}>
                                Save category
                              </button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                    <div className="space-y-3">
                      {categories.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                          No categories yet. Add one to group rooms by plan.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {categories.map((category) => (
                            <div
                              key={category.id}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {category.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {category.capacity ?? "—"} guests •{" "}
                                    {category.base_rate ? `$${category.base_rate}` : "Rate N/A"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    className={ghostButton}
                                    onClick={() => {
                                      setCategoryDraft({
                                        id: category.id,
                                        name: category.name ?? "",
                                        base_rate: category.base_rate?.toString() ?? "",
                                        capacity: category.capacity?.toString() ?? "",
                                        description: category.description ?? "",
                                      });
                                      setCategoryModalOpen(true);
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className={dangerButton}
                                    onClick={() => deleteCategory(category.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {category.description && (
                                <p className="mt-2 text-xs text-slate-500">
                                  {category.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {shouldShowSection("rooms") && (
                  <section id="rooms" className={cardClass}>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                          Rooms
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Room numbers & status
                        </h3>
                      </div>
                      <Dialog.Root
                        open={roomModalOpen}
                        onOpenChange={(open) => {
                          setRoomModalOpen(open);
                          if (!open) setRoomDraft(defaultRoomDraft);
                        }}
                      >
                        <Dialog.Trigger className={primaryButton}>
                          <PlusIcon /> Add room
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
                            <div className="flex items-start justify-between">
                              <div>
                                <Dialog.Title className="text-lg font-semibold text-slate-900">
                                  {roomDraft.id ? "Edit room" : "Add room"}
                                </Dialog.Title>
                                <Dialog.Description className="text-sm text-slate-600">
                                  Assign room numbers, categories, and housekeeping status.
                                </Dialog.Description>
                              </div>
                              <Dialog.Close className="text-slate-500 hover:text-slate-700">
                                <Cross2Icon />
                              </Dialog.Close>
                            </div>
                            <div className="mt-4 space-y-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <FieldLabel>Room number</FieldLabel>
                                  <Input
                                    value={roomDraft.number}
                                    onChange={(e) =>
                                      setRoomDraft((d) => ({ ...d, number: e.target.value }))
                                    }
                                    placeholder="201"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <FieldLabel>Floor</FieldLabel>
                                  <Input
                                    value={roomDraft.floor}
                                    onChange={(e) =>
                                      setRoomDraft((d) => ({ ...d, floor: e.target.value }))
                                    }
                                    placeholder="2"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <FieldLabel>Category</FieldLabel>
                                  <SelectField
                                    value={roomDraft.category_id}
                                    onValueChange={(val) =>
                                      setRoomDraft((d) => ({ ...d, category_id: val }))
                                    }
                                    options={categories.map((c) => ({
                                      value: c.id,
                                      label: c.name,
                                    }))}
                                    placeholder="Choose category"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <FieldLabel>Status</FieldLabel>
                                  <SelectField
                                    value={roomDraft.status}
                                    onValueChange={(val) =>
                                      setRoomDraft((d) => ({ ...d, status: val }))
                                    }
                                    options={roomStatuses}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <FieldLabel>Notes</FieldLabel>
                                <TextArea
                                  rows={3}
                                  value={roomDraft.notes}
                                  onChange={(e) =>
                                    setRoomDraft((d) => ({ ...d, notes: e.target.value }))
                                  }
                                  placeholder="Special equipment, facing, etc."
                                />
                              </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                              <Dialog.Close className={ghostButton}>Cancel</Dialog.Close>
                              <button className={primaryButton} onClick={upsertRoom}>
                                Save room
                              </button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                    <div className="space-y-3">
                      {rooms.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                          <p className="mb-3">No rooms yet. Add rooms to track availability.</p>
                          <button className={primaryButton} onClick={() => setRoomModalOpen(true)}>
                            <PlusIcon /> Add room
                          </button>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {rooms.map((room) => (
                            <div
                              key={room.id}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    Room {room.number}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {room.floor ? `Floor ${room.floor}` : "Floor N/A"} •{" "}
                                    {room.category_id
                                      ? categories.find((c) => c.id === room.category_id)?.name ??
                                      "Unassigned"
                                      : "Unassigned"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusPill status={room.status} palette="room" />
                                  <select
                                    value={room.status}
                                    onChange={(e) => updateRoomStatus(room.id, e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                                  >
                                    {roomStatuses.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {room.notes && (
                                <p className="mt-2 text-xs text-slate-500">{room.notes}</p>
                              )}
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  className={ghostButton}
                                  onClick={() => {
                                    setRoomDraft({
                                      id: room.id,
                                      number: room.number,
                                      floor: room.floor ?? "",
                                      category_id: room.category_id ?? "",
                                      status: room.status,
                                      notes: room.notes ?? "",
                                    });
                                    setRoomModalOpen(true);
                                  }}
                                >
                                  Edit
                                </button>
                                <button className={dangerButton} onClick={() => deleteRoom(room.id)}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {shouldShowSection("bookings") && (
                  <section id="bookings" className={clsx(cardClass, "lg:col-span-2")}>
                    <BookingsView
                      bookings={bookings}
                      rooms={rooms}
                      counts={{
                        total: bookingsCount,
                        page: bookingsPage,
                        pageSize: BOOKINGS_PAGE_SIZE,
                      }}
                      filter={bookingStatusFilter}
                      onFilterChange={setBookingStatusFilter}
                      sort={bookingSort}
                      onSortChange={setBookingSort}
                      onPageChange={handleBookingsPageChange}
                      loading={bookingsLoading}
                      searchQuery={bookingSearch}
                      onSearchChange={setBookingSearch}
                      onEditBooking={(booking) => {
                        setBookingDraft({
                          id: booking.id,
                          guest_name: booking.guest_name,
                          guest_email: booking.guest_email ?? "",
                          guest_passport: booking.guest_passport ?? "",
                          second_guest_name: booking.second_guest_name ?? "",
                          second_guest_email: booking.second_guest_email ?? "",
                          second_guest_passport: booking.second_guest_passport ?? "",
                          room_ids: booking.room_id ? [booking.room_id] : [],
                          check_in: booking.check_in,
                          check_out: booking.check_out,
                          status: booking.status,
                          auto_release_at: booking.auto_release_at ?? null,
                          notes: booking.notes ?? "",
                        });
                        setBookingModalOpen(true);
                      }}
                      onUpdateStatus={updateBookingStatus}
                      onDeleteBooking={deleteBooking}
                      currentMonth={calendarMonth}
                      onMonthChange={setCalendarMonth}
                    />
                  </section>
                )}


                {shouldShowSection("tentative") && (
                  <section id="tentative" className={cardClass}>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-600">
                          Tentative Holds
                        </p>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Unconfirmed reservations
                        </h3>
                      </div>
                      <button className={primaryButton} onClick={() => {
                        setBookingDraft({ ...defaultBookingDraft, status: 'tentative' });
                        setBookingModalOpen(true);
                      }}>
                        <PlusIcon /> New hold
                      </button>
                    </div>

                    <div className="space-y-3">
                      {bookings.filter(b => b.status === 'tentative').length === 0 ? (
                        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
                          <p className="">
                            No tentative holds active.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                          {bookings.filter(b => b.status === 'tentative').map((booking) => (
                            <div
                              key={booking.id}
                              className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 shadow-sm"
                            >

                              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {booking.guest_name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {booking.guest_email ?? "No email"}
                                  </p>
                                  {booking.second_guest_name && (
                                    <p className="text-xs text-slate-500">
                                      + {booking.second_guest_name}
                                    </p>
                                  )}
                                  {booking.second_guest_email && (
                                    <p className="text-[10px] text-slate-400">
                                      {booking.second_guest_email}
                                    </p>
                                  )}
                                  {(booking.adults ?? 1) > 1 && (
                                    <p className="text-[10px] text-slate-500">
                                      Guests: {booking.adults ?? 1}
                                    </p>
                                  )}
                                  {(booking.guest_passport || booking.second_guest_passport) && (
                                    <p className="text-[10px] text-slate-400">
                                      {booking.guest_passport ? `Pass: ${booking.guest_passport}` : "Pass: —"}
                                      {booking.second_guest_passport
                                        ? `${booking.guest_passport ? " • " : ""}Pass 2: ${booking.second_guest_passport}`
                                        : ""}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 uppercase tracking-wide">
                                    Tentative
                                  </span>
                                  {booking.auto_release_at && (
                                    <span className="mt-1 text-[10px] font-medium text-rose-600">
                                      Expires: {format(new Date(booking.auto_release_at), "MMM d, h:mma")}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-3 text-xs text-slate-700">
                                <div className="rounded-lg bg-white border border-amber-100 px-2 py-1">
                                  {formatDateRange(booking.check_in, booking.check_out)}
                                </div>
                                <span>
                                  {booking.room_id
                                    ? `Room ${rooms.find((r) => r.id === booking.room_id)?.number ?? "?"}`
                                    : "Unassigned"}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-200/50">
                                <button
                                  className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                                  onClick={() => updateBookingStatus(booking.id, "reserved")}
                                >
                                  Confirm
                                </button>
                                <button
                                  className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-amber-50"
                                  onClick={() => {
                                    setBookingDraft({
                                      id: booking.id,
                                      guest_name: booking.guest_name,
                                      guest_email: booking.guest_email ?? "",
                                      guest_passport: booking.guest_passport ?? "",
                                      second_guest_name: booking.second_guest_name ?? "",
                                      second_guest_email: booking.second_guest_email ?? "",
                                      second_guest_passport: booking.second_guest_passport ?? "",
                                      room_ids: booking.room_id ? [booking.room_id] : [],
                                      check_in: booking.check_in,
                                      check_out: booking.check_out,
                                      status: booking.status,
                                      auto_release_at: booking.auto_release_at ?? "",
                                      notes: booking.notes ?? "",
                                    });
                                    setBookingModalOpen(true);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
                                  onClick={() => updateBookingStatus(booking.id, "cancelled")}
                                >
                                  Release
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {shouldShowSection("availability") && (
                  <section
                    id="availability"
                    className="lg:col-span-2 space-y-4"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="mb-2">
                        <h3 className="text-xl font-bold text-slate-900">Availability & Occupancy</h3>
                        <p className="text-sm text-slate-500">View daily stats, manage bookings, and track occupancy.</p>
                      </div>
                      <AvailabilityView
                        rooms={rooms}
                        categories={categories}
                        bookings={availabilityBookings}
                        currentMonth={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        loading={availabilityLoading}
                        onAddBooking={(roomId, checkIn, checkOut) => {
                          setBookingDraft({
                            ...defaultBookingDraft,
                            room_ids: [roomId],
                            check_in: format(checkIn, 'yyyy-MM-dd'),
                            check_out: format(checkOut, 'yyyy-MM-dd')
                          });
                          setBookingModalOpen(true);
                        }}
                        onEditBooking={(booking) => {
                          setBookingDraft({
                            id: booking.id,
                            guest_name: booking.guest_name,
                            guest_email: booking.guest_email ?? "",
                            guest_passport: booking.guest_passport ?? "",
                            second_guest_name: booking.second_guest_name ?? "",
                            second_guest_email: booking.second_guest_email ?? "",
                            second_guest_passport: booking.second_guest_passport ?? "",
                            room_ids: booking.room_id ? [booking.room_id] : [],
                            check_in: booking.check_in,
                            check_out: booking.check_out,
                            status: booking.status,
                            auto_release_at: booking.auto_release_at ?? null,
                            notes: booking.notes ?? "",
                          });
                          setBookingModalOpen(true);
                        }}
                        onUpdateStatus={updateBookingStatus}
                      />
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className={cardClass} id="categories">
                <p className="text-sm text-slate-700">
                  Select or add a property to start managing categories, rooms, bookings, and availability.
                </p>
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}
