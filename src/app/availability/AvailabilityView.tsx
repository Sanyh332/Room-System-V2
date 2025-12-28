"use client";

import {
    Booking,
    BookingWithDates,
    Room,
    RoomCategory,
} from "../types";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    Cross2Icon,
} from "@radix-ui/react-icons";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import clsx from "clsx";
import {
    addDays,
    addMonths,
    differenceInDays,
    endOfMonth,
    format,
    isSameDay,
    isWithinInterval,
    startOfDay,
    startOfMonth,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";

type AvailabilityViewProps = {
    rooms: Room[];
    categories: RoomCategory[];
    bookings: Booking[];
    onAddBooking: (roomId: string, checkIn: Date, checkOut: Date) => void;
    onEditBooking: (booking: Booking) => void;
    currentMonth: Date;
    onMonthChange: (next: Date) => void;

    loading?: boolean;
    onUpdateStatus: (bookingId: string, status: string) => Promise<void>;
};

type RangeSelection = {
    roomId: string | null;
    checkIn: Date | null;
    checkOut: Date | null;
};

export function AvailabilityView({
    rooms,
    categories,
    bookings,
    onAddBooking,
    onEditBooking,
    currentMonth,
    onMonthChange,
    loading = false,
    onUpdateStatus,
}: AvailabilityViewProps) {
    const [previewBooking, setPreviewBooking] = useState<BookingWithDates | null>(null);
    const [viewMode, setViewMode] = useState<"month" | "half">("month");
    const [halfIndex, setHalfIndex] = useState<0 | 1>(0);
    const [rangeSelection, setRangeSelection] = useState<RangeSelection>({
        roomId: null,
        checkIn: null,
        checkOut: null,
    });

    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
            setViewMode("half");
            setHalfIndex(0);
        }
    }, []);

    const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
    const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
    const currentYear = monthStart.getFullYear();
    const currentMonthIndex = monthStart.getMonth();

    useEffect(() => {
        // Reset to the first half whenever the month changes
        setHalfIndex(0);
    }, [monthStart]);

    const monthTabs = useMemo(
        () => Array.from({ length: 12 }, (_, i) => format(new Date(2024, i, 1), "MMM")),
        []
    );

    const yearOptions = useMemo(
        () => Array.from({ length: 7 }, (_, i) => currentYear - 3 + i),
        [currentYear]
    );

    // 1. Data Prep
    const daysInMonth = useMemo(() => {
        return Array.from(
            { length: differenceInDays(monthEnd, monthStart) + 1 },
            (_, i) => addDays(monthStart, i)
        );
    }, [monthEnd, monthStart]);

    const halfMonthRange = useMemo(() => {
        const isFirstHalf = halfIndex === 0;
        const start = addDays(monthStart, isFirstHalf ? 0 : 15);
        const plannedEnd = isFirstHalf ? addDays(monthStart, 14) : monthEnd;
        const clampedEnd = plannedEnd > monthEnd ? monthEnd : plannedEnd;

        if (start > monthEnd) {
            return {
                start: monthEnd,
                endExclusive: addDays(monthEnd, 1),
                days: [monthEnd],
            };
        }

        return {
            start,
            endExclusive: addDays(clampedEnd, 1),
            days: Array.from(
                { length: differenceInDays(clampedEnd, start) + 1 },
                (_, i) => addDays(start, i)
            ),
        };
    }, [halfIndex, monthEnd, monthStart]);

    const visibleRange = useMemo(
        () =>
            viewMode === "month"
                ? {
                    start: monthStart,
                    endExclusive: addDays(monthEnd, 1),
                    days: daysInMonth,
                }
                : halfMonthRange,
        [daysInMonth, halfMonthRange, monthEnd, monthStart, viewMode]
    );

    const visibleRangeStartKey = useMemo(
        () => visibleRange.start.getTime(),
        [visibleRange.start]
    );

    const visibleDays = visibleRange.days;

    const bookingsWithDates = useMemo<BookingWithDates[]>(
        () =>
            bookings.map((b) => ({
                ...b,
                checkInDate: startOfDay(new Date(b.check_in)),
                checkOutDate: startOfDay(new Date(b.check_out)),
            })),
        [bookings]
    );

    const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

    // Group rooms by category
    const groupedRooms = useMemo(() => {
        // Create a map of category ID to category
        const categoryMap = new Map(categories.map((c) => [c.id, c]));

        // Group rooms
        const groups = new Map<string, Room[]>();
        // Initialize groups for all categories to ensure they show up even if empty
        categories.forEach(c => groups.set(c.id, []));
        // Add a group for unassigned rooms
        groups.set("unassigned", []);

        rooms.forEach((room) => {
            const catId = room.category_id && categoryMap.has(room.category_id) ? room.category_id : "unassigned";
            const group = groups.get(catId);
            if (group) {
                group.push(room);
            }
        });

        // Sort rooms within groups by number
        groups.forEach(group => group.sort((a, b) => a.number.localeCompare(b.number)));

        return Array.from(groups.entries()).map(([catId, roomList]) => ({
            category: categoryMap.get(catId),
            rooms: roomList,
        })).filter(g => g.rooms.length > 0 || g.category); // Keep if has rooms or is a valid category
    }, [rooms, categories]);

    // 2. Statistics Calculation
    const stats = useMemo(() => {
        const today = startOfDay(new Date());

        // Daily Occupancy % (Today)
        const totalRooms = rooms.length;
        const occupiedToday = bookingsWithDates.filter(b =>
            (b.status === 'checked_in' || b.status === 'reserved') &&
            isWithinInterval(today, { start: b.checkInDate, end: addDays(b.checkOutDate, -1) })
        ).length;

        const dailyOccupancy = totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0;

        // Monthly Avg Occ %
        // Simplification: Average of daily occupancy for current viewed month
        let totalOccupiedDays = 0;
        const daysCount = daysInMonth.length;
        daysInMonth.forEach(day => {
            const occ = bookingsWithDates.filter(b =>
                (b.status === 'checked_in' || b.status === 'reserved') &&
                isWithinInterval(day, { start: b.checkInDate, end: addDays(b.checkOutDate, -1) })
            ).length;
            totalOccupiedDays += occ;
        });
        const monthlyOccupancy = (totalRooms * daysCount) > 0
            ? Math.round((totalOccupiedDays / (totalRooms * daysCount)) * 100)
            : 0;

        // Today's Arrivals
        const arrivals = bookingsWithDates.filter(b => isSameDay(b.checkInDate, today)).length;

        // Today's Departures
        const departures = bookingsWithDates.filter(b => isSameDay(b.checkOutDate, today)).length;

        // Total In-House
        const inHouse = bookingsWithDates.filter(b => b.status === 'checked_in').length;

        return {
            dailyOccupancy,
            monthlyOccupancy,
            arrivals,
            departures,
            inHouse,
            vacant: totalRooms - occupiedToday,
            occupied: occupiedToday
        };
    }, [rooms, bookingsWithDates, daysInMonth]);

    // Daily Occupancy Footer Data (for the visible range)
    const visibleOccupancyPercents = useMemo(() => {
        if (rooms.length === 0) return visibleDays.map(() => 0);
        return visibleDays.map(day => {
            const occupied = bookingsWithDates.filter(b =>
                (b.status === 'checked_in' || b.status === 'reserved') &&
                isWithinInterval(day, { start: b.checkInDate, end: addDays(b.checkOutDate, -1) })
            ).length;
            return Math.round((occupied / rooms.length) * 100);
        });
    }, [rooms, bookingsWithDates, visibleDays]);


    // Helper to calculate position of a booking bar
    const getBookingPosition = (booking: BookingWithDates) => {
        const rangeStart = visibleRange.start;
        const rangeEnd = visibleRange.endExclusive;

        let start = booking.checkInDate;
        let end = booking.checkOutDate;

        // Clip to the currently visible range
        if (end <= rangeStart || start >= rangeEnd) return null;
        if (start < rangeStart) start = rangeStart;
        if (end > rangeEnd) end = rangeEnd;

        const startIndex = differenceInDays(start, rangeStart);
        const duration = differenceInDays(end, start);

        return {
            left: `${(startIndex / visibleRange.days.length) * 100}%`,
            width: `${(duration / visibleRange.days.length) * 100}%`
        };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "checked_in":
                return "from-emerald-500/80 via-emerald-500/75 to-emerald-400/75 text-white ring-1 ring-emerald-200/70";
            case "reserved":
                return "from-emerald-400/80 via-emerald-400/70 to-emerald-300/70 text-white ring-1 ring-emerald-200/60";
            case "checked_out":
                return "from-slate-500/80 via-slate-500/70 to-slate-400/70 text-white ring-1 ring-slate-200/60";
            case "cancelled":
                return "from-rose-500/80 via-rose-500/75 to-rose-400/75 text-white ring-1 ring-rose-200/60";
            case "tentative":
                return "from-amber-400/80 via-amber-400/70 to-amber-300/70 text-white ring-1 ring-amber-200/60 dashed border-amber-200";
            default:
                return "from-emerald-500/80 via-emerald-500/75 to-emerald-400/75 text-white ring-1 ring-emerald-200/70";
        }
    };

    const handleMonthChange = (next: Date) => {
        const normalized = startOfMonth(next);
        setHalfIndex(0);
        onMonthChange(normalized);
    };

    const clearRangeSelection = () =>
        setRangeSelection({ roomId: null, checkIn: null, checkOut: null });

    const handleDayClick = (roomId: string, day: Date) => {
        const normalizedDay = startOfDay(day);

        // Start a new selection if none exists, the room changes, or a range was already completed
        if (!rangeSelection.checkIn || rangeSelection.roomId !== roomId || rangeSelection.checkOut) {
            setRangeSelection({ roomId, checkIn: normalizedDay, checkOut: null });
            return;
        }

        // If the clicked day is before or the same as the current check-in, treat it as a new start
        if (normalizedDay <= rangeSelection.checkIn) {
            setRangeSelection({ roomId, checkIn: normalizedDay, checkOut: null });
            return;
        }

        const checkInDate = rangeSelection.checkIn;
        const checkOutDate = normalizedDay;

        setRangeSelection({ roomId, checkIn: checkInDate, checkOut: checkOutDate });
        onAddBooking(roomId, checkInDate, checkOutDate);
        clearRangeSelection();
    };

    useEffect(() => {
        // Avoid keeping stale selections when the visible range changes; only update if needed
        setRangeSelection((prev) => {
            if (!prev.roomId && !prev.checkIn && !prev.checkOut) return prev;
            return { roomId: null, checkIn: null, checkOut: null };
        });
    }, [visibleRangeStartKey]);

    const formatDateRange = (start: Date, end: Date) =>
        `${format(start, 'MMM d, yyyy')} → ${format(addDays(end, -1), 'MMM d, yyyy')}`;

    return (
        <>
            <div className="flex flex-col gap-6">
                {loading && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
                        Refreshing availability for this month...
                    </div>
                )}
                {/* Stats Header */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard label="Daily Occupancy %" value={`${stats.dailyOccupancy}%`} />
                    <StatCard label="Monthly Avg Occ %" value={`${stats.monthlyOccupancy}%`} />
                    <StatCard label="Today's Arrivals" value={stats.arrivals.toString()} />
                    <StatCard label="Today's Departures" value={stats.departures.toString()} />
                    <StatCard label="Total In-House" value={stats.inHouse.toString()} />
                    <StatCard label="Vacant / Occupied" value={`${stats.vacant} / ${stats.occupied}`} />
                </div>

                {/* Controls */}
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="font-semibold text-lg text-slate-800 px-2">
                                {format(currentMonth, "MMMM yyyy")}
                            </div>

                            <div className="flex items-center bg-slate-100 rounded-full p-1 text-xs font-semibold text-slate-600">
                                <button
                                    className={clsx(
                                        "px-3 py-1.5 rounded-full transition-all",
                                        viewMode === "half"
                                            ? "bg-white shadow text-emerald-700"
                                            : "hover:text-emerald-700"
                                    )}
                                    onClick={() => {
                                        setViewMode("half");
                                        setHalfIndex(0);
                                    }}
                                >
                                    15 days
                                </button>
                                <button
                                    className={clsx(
                                        "px-3 py-1.5 rounded-full transition-all",
                                        viewMode === "month"
                                            ? "bg-white shadow text-emerald-700"
                                            : "hover:text-emerald-700"
                                    )}
                                    onClick={() => setViewMode("month")}
                                >
                                    Full month
                                </button>
                            </div>

                            {viewMode === "half" && (
                                <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                                    <button
                                        className={clsx(
                                            "px-3 py-1 rounded-full transition-all",
                                            halfIndex === 0
                                                ? "bg-emerald-50 text-emerald-700 shadow-sm"
                                                : "hover:bg-slate-50"
                                        )}
                                        onClick={() => setHalfIndex(0)}
                                    >
                                        Days 1–15
                                    </button>
                                    <button
                                        className={clsx(
                                            "px-3 py-1 rounded-full transition-all",
                                            halfIndex === 1
                                                ? "bg-emerald-50 text-emerald-700 shadow-sm"
                                                : "hover:bg-slate-50"
                                        )}
                                        onClick={() => setHalfIndex(1)}
                                    >
                                        {`Days 16–${format(monthEnd, "d")}`}
                                    </button>
                                </div>
                            )}
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

                {/* Calendar */}
                <div className="overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm relative select-none">
                    {loading && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm text-sm font-semibold text-slate-700">
                            Loading bookings for this month...
                        </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60 text-xs font-semibold text-slate-600">
                        <span>
                            {rangeSelection.checkIn
                                ? `Check-in selected: ${format(rangeSelection.checkIn, "MMM d")}. Choose a check-out date in the same room.`
                                : "Select a check-in date, then a check-out date to open the booking form."}
                        </span>
                        {rangeSelection.checkIn && (
                            <button
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                onClick={clearRangeSelection}
                            >
                                Clear selection
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[720px] relative">
                            {/* Header Row */}
                            <div className="flex border-b border-slate-100">
                                <div className="sticky left-0 w-48 bg-emerald-50/50 backdrop-blur-sm z-20 border-r border-slate-100 flex items-center px-4 font-semibold text-emerald-800 text-sm h-14">
                                    Rooms
                                </div>
                                <div className="flex-1 flex">
                                    {visibleDays.map((day, i) => {
                                        const isWeekend = [0, 6].includes(day.getDay());
                                        const isToday = isSameDay(day, new Date());
                                        return (
                                            <div key={i} className={clsx(
                                                "flex-1 min-w-[32px] flex flex-col items-center justify-center border-r border-slate-50/50",
                                                isToday && "bg-amber-50",
                                                isWeekend ? "bg-slate-50/50" : ""
                                            )}>
                                                <span className="text-[10px] text-slate-400 uppercase font-medium">
                                                    {format(day, "d")}
                                                </span>
                                                <span className={clsx("text-xs font-semibold", isToday ? "text-amber-600" : "text-slate-600")}>
                                                    {format(day, "EEE")}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Body */}
                            <div className="relative">
                                {/* Background Grid Lines */}
                                <div className="absolute inset-0 flex pl-48 pointer-events-none z-0">
                                    {visibleDays.map((day, i) => {
                                        const isWeekend = [0, 6].includes(day.getDay());
                                        return (
                                            <div key={i} className={clsx("flex-1 border-r border-slate-100", isWeekend ? "bg-slate-50/30" : "")} />
                                        );
                                    })}
                                </div>

                                {/* Rows */}
                                <div className="relative z-10">
                                    {groupedRooms.map((group) => (
                                        <div key={group.category?.id ?? 'unassigned'}>
                                            {/* Category Header */}
                                            <div className="flex bg-emerald-50/30 border-b border-emerald-100/50 h-8 items-center">
                                                <div className="sticky left-0 w-48 bg-emerald-50 border-r border-emerald-100 px-4 flex items-center z-10">
                                                    <span className="text-xs font-bold text-emerald-800">
                                                        {group.category?.name ?? "Other Rooms"}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    {/* Could put agg stats here if needed, keeping plain for now matching mockup style */}
                                                </div>
                                            </div>

                                            {/* Room Rows */}
                                            {group.rooms.map(room => (
                                                <div key={room.id} className="flex h-12 border-b border-slate-100 relative group hover:bg-slate-50/50 transition-colors">
                                                    <div className="sticky left-0 w-48 bg-white group-hover:bg-slate-50 transition-colors border-r border-slate-100 px-4 flex flex-col justify-center z-10">
                                                        <div className="text-sm font-semibold text-slate-700">{room.number}</div>
                                                        <div className="text-[10px] text-slate-400 capitalize">{room.status.replace('_', ' ')}</div>
                                                    </div>

                                                    {/* Interactive Cells Layer */}
                                                    <div className="flex-1 flex relative">
                                                        {visibleDays.map((day, i) => (
                                                            <div
                                                                key={i}
                                                                className={clsx(
                                                                    "flex-1 h-full cursor-pointer transition-colors hover:bg-black/5",
                                                                    rangeSelection.roomId === room.id &&
                                                                    rangeSelection.checkIn &&
                                                                    rangeSelection.checkOut &&
                                                                    isWithinInterval(day, {
                                                                        start: rangeSelection.checkIn,
                                                                        end: addDays(rangeSelection.checkOut, -1),
                                                                    }) && "bg-emerald-50",
                                                                    rangeSelection.roomId === room.id &&
                                                                    rangeSelection.checkIn &&
                                                                    isSameDay(day, rangeSelection.checkIn) &&
                                                                    "bg-emerald-100 ring-2 ring-emerald-500/70 ring-inset",
                                                                    rangeSelection.roomId === room.id &&
                                                                    rangeSelection.checkOut &&
                                                                    isSameDay(day, rangeSelection.checkOut) &&
                                                                    "bg-emerald-100 ring-2 ring-emerald-500/70 ring-inset"
                                                                )}
                                                                onClick={() => handleDayClick(room.id, day)}
                                                                title={rangeSelection.roomId === room.id && rangeSelection.checkIn && !rangeSelection.checkOut
                                                                    ? `Select check-out after ${format(rangeSelection.checkIn, 'MMM d')}`
                                                                    : `Start booking for ${room.number} on ${format(day, 'MMM d')}`}
                                                            ></div>
                                                        ))}

                                                        {/* Booking Bars Layer */}
                                                        <div className="absolute inset-y-0 left-0 right-0 pointer-events-none py-2">
                                                            {bookingsWithDates
                                                                .filter(b => b.room_id === room.id)
                                                                .map(b => {
                                                                    const pos = getBookingPosition(b);
                                                                    if (!pos) return null;
                                                                    return (
                                                                        <div
                                                                            key={b.id}
                                                                            style={{ left: pos.left, width: pos.width }}
                                                                            className={clsx(
                                                                                "absolute h-full min-h-[32px] rounded-xl px-3 flex items-center gap-2 overflow-hidden whitespace-nowrap pointer-events-auto cursor-pointer transition-all duration-200 z-20 mx-px bg-gradient-to-r backdrop-blur-md border border-white/40 shadow-lg hover:shadow-xl hover:-translate-y-0.5",
                                                                                getStatusColor(b.status)
                                                                            )}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setPreviewBooking(b);
                                                                            }}
                                                                        >
                                                                            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide truncate">
                                                                                {b.guest_name}
                                                                            </span>
                                                                            <span className="ml-2 text-[10px] sm:text-[11px] opacity-90 hidden lg:inline font-medium">
                                                                                {format(b.checkInDate, 'MMM d')} - {format(b.checkOutDate, 'MMM d')}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer Occupancy Row */}
                            <div className="flex border-t border-slate-200 bg-emerald-50/10 h-10 items-center">
                                <div className="sticky left-0 w-48 bg-white border-r border-slate-200 px-4 font-semibold text-slate-700 text-xs z-10 flex items-center h-full">
                                    % Occupancy
                                </div>
                                <div className="flex-1 flex h-full">
                                    {visibleOccupancyPercents.map((pct, i) => (
                                        <div key={i} className="flex-1 flex items-center justify-center border-r border-slate-100 text-[10px] font-semibold text-emerald-700">
                                            {pct}%
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog.Root
                open={!!previewBooking}
                onOpenChange={(open) => {
                    if (!open) setPreviewBooking(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <Dialog.Title className="text-lg font-semibold text-slate-900">
                                    Booking details
                                </Dialog.Title>
                                <Dialog.Description className="text-sm text-slate-600">
                                    Quick view from the availability calendar.
                                </Dialog.Description>
                            </div>
                            <Dialog.Close className="text-slate-500 hover:text-slate-700">
                                <Cross2Icon />
                            </Dialog.Close>
                        </div>

                        {previewBooking && (
                            <div className="mt-4 space-y-3 text-sm text-slate-800">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-base font-semibold text-slate-900">
                                            {previewBooking.guest_name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {previewBooking.guest_email || "No email provided"}
                                        </p>
                                        {previewBooking.created_by_name && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Created by: {previewBooking.created_by_name}
                                            </p>
                                        )}
                                    </div>
                                    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold capitalize">
                                        {previewBooking.status.replace("_", " ")}
                                    </span>
                                </div>

                                {previewBooking.status === "tentative" && previewBooking.auto_release_at && (
                                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-800">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide">
                                            Tentative Hold Expires
                                        </p>
                                        <p className="text-sm font-medium">
                                            {format(new Date(previewBooking.auto_release_at), 'MMM d, yyyy h:mma')}
                                        </p>
                                    </div>
                                )}

                                <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 space-y-1">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Guests
                                    </p>
                                    <p className="text-sm text-slate-900">
                                        {previewBooking.guest_name}
                                        {previewBooking.second_guest_name ? ` + ${previewBooking.second_guest_name}` : ""}
                                    </p>
                                    {previewBooking.second_guest_email && (
                                        <p className="text-[11px] text-slate-500">
                                            2nd email: {previewBooking.second_guest_email}
                                        </p>
                                    )}
                                    {(previewBooking.adults ?? 1) > 0 && (
                                        <p className="text-[11px] text-slate-500">
                                            Count: {previewBooking.adults ?? 1}
                                        </p>
                                    )}
                                    {(previewBooking.guest_passport || previewBooking.second_guest_passport) && (
                                        <p className="text-[11px] text-slate-500">
                                            {previewBooking.guest_passport ? `Pass: ${previewBooking.guest_passport}` : "Pass: —"}
                                            {previewBooking.second_guest_passport
                                                ? `${previewBooking.guest_passport ? " • " : ""}Pass 2: ${previewBooking.second_guest_passport}`
                                                : ""}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Stay dates
                                    </p>
                                    <p className="text-sm text-slate-900">
                                        {formatDateRange(previewBooking.checkInDate, previewBooking.checkOutDate)}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">
                                            Room
                                        </p>
                                        <p className="text-sm text-slate-900">
                                            {previewBooking.room_id
                                                ? roomMap.get(previewBooking.room_id)?.number
                                                    ? `Room ${roomMap.get(previewBooking.room_id)?.number}`
                                                    : "Assigned"
                                                : "Unassigned"}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">
                                            Reference
                                        </p>
                                        <p className="text-sm text-slate-900">
                                            {previewBooking.reference_code ?? "—"}
                                        </p>
                                    </div>
                                </div>

                                {previewBooking.notes && (
                                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                                        <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">
                                            Notes
                                        </p>
                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">
                                            {previewBooking.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-2">
                            <Dialog.Close className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                Close
                            </Dialog.Close>
                            <button
                                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                                onClick={() => {
                                    if (previewBooking) {
                                        onEditBooking(previewBooking);
                                        setPreviewBooking(null);
                                    }
                                }}
                            >
                                Edit booking
                            </button>
                            {previewBooking?.status === "tentative" && (
                                <button
                                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                                    onClick={() => {
                                        if (previewBooking) {
                                            onUpdateStatus(previewBooking.id, "reserved");
                                            setPreviewBooking(null);
                                        }
                                    }}
                                >
                                    Confirm
                                </button>
                            )}
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
            <span className="text-2xl font-bold text-slate-900">{value}</span>
        </div>
    );
}

// Add these to globals css or tailwind config for custom scrollbar
// .custom-scrollbar::-webkit-scrollbar { height: 8px; }
// .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
// .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
// .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
