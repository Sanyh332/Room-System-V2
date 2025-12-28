import {
    Booking,
    BookingDraft,
    Room,
    bookingStatuses,
} from "../types"; // Adjusted import path assuming it's one level up or similar
import {
    CheckIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    Cross2Icon,
    MagnifyingGlassIcon,
    PlusIcon,
} from "@radix-ui/react-icons";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import clsx from "clsx"; // Assuming clsx is used in the project
import { format, addMonths, startOfMonth } from "date-fns";
import { useMemo, useState } from "react";

// --- Sub-components / Helpers ---

const buttonBase =
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:opacity-60";
const primaryButton = `${buttonBase} bg-black text-white hover:bg-slate-900`;
const ghostButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const dangerButton = `${buttonBase} bg-red-50 text-red-600 border border-red-200 hover:bg-red-100`;

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
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                styles[status as keyof typeof styles] ??
                "bg-slate-100 text-slate-700 border border-slate-200",
            )}
        >
            {status.replace("_", " ")}
        </span>
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

const formatDateRange = (from: string, to: string) => {
    try {
        return `${format(new Date(from), "MMM d")} - ${format(new Date(to), "MMM d, yyyy")}`;
    } catch {
        return `${from} → ${to}`;
    }
};

// --- Main Component ---

type BookingsViewProps = {
    bookings: Booking[];
    rooms: Room[];
    counts: {
        total: number;
        page: number;
        pageSize: number;
    };
    filter: string;
    onFilterChange: (status: string) => void;
    sort: "check_in" | "guest" | "room";
    onSortChange: (sort: "check_in" | "guest" | "room") => void;
    onPageChange: (page: number) => void;
    loading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onEditBooking: (booking: Booking) => void;
    onUpdateStatus: (id: string, status: string) => void;
    onDeleteBooking: (id: string) => void;
    currentMonth: Date;
    onMonthChange: (next: Date) => void;
};

export function BookingsView({
    bookings,
    rooms,
    counts,
    filter,
    onFilterChange,
    sort,
    onSortChange,
    onPageChange,
    loading,
    searchQuery,
    onSearchChange,
    onEditBooking,
    onUpdateStatus,
    onDeleteBooking,
    currentMonth,
    onMonthChange,
}: BookingsViewProps) {
    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
    const roomNumberById = useMemo(() => new Map(rooms.map((r) => [r.id, r.number])), [rooms]);

    const totalPages = counts.total > 0 ? Math.ceil(counts.total / counts.pageSize) : 0;
    const startRecord = counts.total === 0 ? 0 : (counts.page - 1) * counts.pageSize + 1;
    const endRecord = Math.min(counts.total, counts.page * counts.pageSize);

    const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
    const currentYear = monthStart.getFullYear();
    const currentMonthIndex = monthStart.getMonth();

    const monthTabs = useMemo(
        () => Array.from({ length: 12 }, (_, i) => format(new Date(2024, i, 1), "MMM")),
        []
    );

    const yearOptions = useMemo(
        () => Array.from({ length: 7 }, (_, i) => currentYear - 3 + i),
        [currentYear]
    );

    const handleMonthChange = (next: Date) => {
        const normalized = startOfMonth(next);
        onMonthChange(normalized);
    };

    const handleDeleteClick = (booking: Booking) => {
        setBookingToDelete(booking);
    };

    const confirmDelete = () => {
        if (bookingToDelete) {
            onDeleteBooking(bookingToDelete.id);
            setBookingToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Bookings</h3>
                    <p className="text-sm text-slate-500">Manage reservations and guest stays</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <MagnifyingGlassIcon />
                    </div>
                    <Input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search guests..."
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Month and Year Navigation Bar */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="font-semibold text-lg text-slate-800 px-2">
                            {format(currentMonth, "MMMM yyyy")}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select.Root
                            value={currentYear.toString()}
                            onValueChange={(value) => handleMonthChange(new Date(Number(value), currentMonthIndex, 1))}
                        >
                            <Select.Trigger className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300 data-[state=open]:border-slate-300">
                                <Select.Value />
                            </Select.Trigger>
                            <Select.Portal>
                                <Select.Content className="z-50 rounded-xl border border-slate-200 bg-white shadow-xl">
                                    <Select.Viewport className="p-1">
                                        {yearOptions.map((year) => (
                                            <Select.Item
                                                key={year}
                                                value={year.toString()}
                                                className="flex items-center rounded-lg px-3 py-2 text-sm text-slate-700 data-[state=checked]:bg-emerald-50 data-[state=checked]:text-emerald-700 data-[highlighted]:outline-none data-[highlighted]:bg-slate-50"
                                            >
                                                <Select.ItemText>{year}</Select.ItemText>
                                            </Select.Item>
                                        ))}
                                    </Select.Viewport>
                                </Select.Content>
                            </Select.Portal>
                        </Select.Root>

                        <div className="flex gap-1">
                            <button
                                onClick={() => handleMonthChange(addMonths(currentMonth, -1))}
                                className="p-2 hover:bg-slate-50 rounded-full text-slate-500"
                                title="Previous month"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleMonthChange(addMonths(currentMonth, 1))}
                                className="p-2 hover:bg-slate-50 rounded-full text-slate-500"
                                title="Next month"
                            >
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto -mx-1 px-1">
                    <div className="inline-flex gap-1 min-w-full">
                        {monthTabs.map((label, idx) => {
                            const isActive = idx === currentMonthIndex;
                            return (
                                <button
                                    key={label}
                                    onClick={() => handleMonthChange(new Date(currentYear, idx, 1))}
                                    className={clsx(
                                        "px-3 py-2 rounded-lg text-sm font-semibold border transition-colors",
                                        isActive
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm"
                                            : "text-slate-600 border-transparent hover:bg-slate-50"
                                    )}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {/* Filters and Sorting */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        {["all", ...bookingStatuses.map((s) => s.value)].map((status) => (
                            <button
                                key={status}
                                onClick={() => onFilterChange(status)}
                                className={clsx(
                                    "rounded-full px-3 py-1 text-xs font-semibold transition",
                                    filter === status
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                                )}
                            >
                                {status === "all" ? "All" : status.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        Sort by
                        <select
                            value={sort}
                            onChange={(e) => onSortChange(e.target.value as any)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                        >
                            <option value="check_in">Arrival</option>
                            <option value="guest">Guest</option>
                            <option value="room">Room</option>
                        </select>
                    </div>
                </div>

                {/* Mobile list */}
                <div className="space-y-3 md:hidden">
                    {loading ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                            Loading bookings...
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                            No bookings found matching your filters.
                        </div>
                    ) : (
                        bookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{booking.guest_name}</p>
                                        <p className="text-xs text-slate-500">{booking.guest_email || "No email"}</p>
                                        {booking.created_by_name && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">Created by: {booking.created_by_name}</p>
                                        )}
                                        {booking.second_guest_name && (
                                            <p className="text-[11px] text-slate-500">+ {booking.second_guest_name}</p>
                                        )}
                                    </div>
                                    <StatusPill status={booking.status} palette="booking" />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                    <span className="rounded-lg bg-slate-50 px-2 py-1">
                                        {formatDateRange(booking.check_in, booking.check_out)}
                                    </span>
                                    <span>
                                        {booking.room_id ? `Room ${roomNumberById.get(booking.room_id) ?? "?"}` : "Unassigned"}
                                    </span>
                                    {booking.reference_code && (
                                        <span className="text-[11px] text-slate-500">Ref: {booking.reference_code}</span>
                                    )}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                    {(booking.guest_passport || booking.second_guest_passport) && (
                                        <span className="rounded bg-slate-100 px-2 py-1">
                                            {booking.guest_passport ? `Pass: ${booking.guest_passport}` : ""}
                                            {booking.second_guest_passport
                                                ? `${booking.guest_passport ? " • " : ""}Pass 2: ${booking.second_guest_passport}`
                                                : ""}
                                        </span>
                                    )}
                                    {(booking.adults ?? 1) > 1 && (
                                        <span className="rounded bg-slate-100 px-2 py-1">Guests: {booking.adults ?? 1}</span>
                                    )}
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    {booking.status === "tentative" && (
                                        <button
                                            onClick={() => onUpdateStatus(booking.id, "reserved")}
                                            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                                        >
                                            Confirm
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onEditBooking(booking)}
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(booking)}
                                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Table View */}
                <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-[720px] divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Guest</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Room</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Dates</th>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                                            Loading bookings...
                                        </td>
                                    </tr>
                                ) : bookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                                            No bookings found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    bookings.map((booking) => (
                                        <tr key={booking.id} className="group hover:bg-slate-50/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-900">{booking.guest_name}</span>
                                                    <span className="text-xs text-slate-500">{booking.guest_email || "No email"}</span>
                                                    {booking.created_by_name && (
                                                        <span className="text-[10px] text-slate-400 mt-0.5">Created by: {booking.created_by_name}</span>
                                                    )}
                                                    {booking.second_guest_name && (
                                                        <span className="text-xs text-slate-500">+ {booking.second_guest_name}</span>
                                                    )}
                                                    {booking.second_guest_email && (
                                                        <span className="text-[10px] text-slate-400">{booking.second_guest_email}</span>
                                                    )}
                                                    {(booking.adults ?? 1) > 1 && (
                                                        <span className="text-[10px] text-slate-500">Guests: {booking.adults ?? 1}</span>
                                                    )}
                                                    {(booking.guest_passport || booking.second_guest_passport) && (
                                                        <span className="text-[10px] text-slate-400">
                                                            {booking.guest_passport ? `Pass: ${booking.guest_passport}` : ""}
                                                            {booking.second_guest_passport
                                                                ? `${booking.guest_passport ? " • " : ""}Pass 2: ${booking.second_guest_passport}`
                                                                : ""}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-700">
                                                    {booking.room_id
                                                        ? roomNumberById.get(booking.room_id) ?? "Unk"
                                                        : "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusPill status={booking.status} palette="booking" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-700">{formatDateRange(booking.check_in, booking.check_out)}</span>
                                                    {booking.reference_code && (
                                                        <span className="text-[10px] text-slate-400">Ref: {booking.reference_code}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {booking.status === "tentative" && (
                                                        <button
                                                            onClick={() => onUpdateStatus(booking.id, "reserved")}
                                                            className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
                                                            title="Confirm booking"
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => onEditBooking(booking)}
                                                        className="text-slate-600 hover:text-blue-600"
                                                        title="Edit"
                                                    >
                                                        Edit
                                                    </button>
                                                    <div className="h-4 w-px bg-slate-300 mx-1" />

                                                    <button
                                                        onClick={() => handleDeleteClick(booking)}
                                                        className="text-slate-600 hover:text-red-600"
                                                        title="Delete"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {counts.total > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-xs text-slate-500">
                            Showing <span className="font-semibold">{startRecord}-{endRecord}</span> of <span className="font-semibold">{counts.total}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                className={ghostButton}
                                onClick={() => onPageChange(counts.page - 1)}
                                disabled={counts.page <= 1 || loading}
                            >
                                Previous
                            </button>
                            <span className="text-xs font-semibold text-slate-700">
                                Page {counts.page} of {totalPages}
                            </span>
                            <button
                                className={ghostButton}
                                onClick={() => onPageChange(counts.page + 1)}
                                disabled={counts.page >= totalPages || loading}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog.Root open={!!bookingToDelete} onOpenChange={(open) => !open && setBookingToDelete(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[16px] bg-white p-6 shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
                        <Dialog.Title className="text-lg font-semibold text-slate-900">
                            Confirm Deletion
                        </Dialog.Title>
                        <Dialog.Description className="mt-2 text-sm text-slate-500">
                            Are you sure you want to delete the booking for <span className="font-semibold text-slate-900">{bookingToDelete?.guest_name}</span>? This action cannot be undone.
                        </Dialog.Description>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setBookingToDelete(null)}
                                className={ghostButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className={dangerButton}
                            >
                                Delete Booking
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
