export type Property = {
    id: string;
    name: string;
    code: string | null;
    address: string | null;
    timezone: string | null;
};

export type RoomCategory = {
    id: string;
    property_id: string;
    name: string;
    description: string | null;
    base_rate: number | null;
    capacity: number | null;
};

export type Room = {
    id: string;
    property_id: string;
    category_id: string | null;
    number: string;
    floor: string | null;
    status: string;
    notes: string | null;
};

export type Booking = {
    id: string;
    property_id: string;
    room_id: string | null;
    guest_name: string;
    guest_email: string | null;
    guest_passport: string | null;
    second_guest_name: string | null;
    second_guest_email: string | null;
    second_guest_passport: string | null;
    adults: number | null;
    check_in: string;
    check_out: string;
    status: string;
    auto_release_at: string | null;
    reference_code: string | null;
    notes: string | null;
    created_by: string | null;
    created_by_name?: string | null; // Populated via join
};

export type BookingWithDates = Booking & {
    checkInDate: Date;
    checkOutDate: Date;
};

export type UserProfile = {
    id: string;
    email: string;
    display_name: string;
    role: "admin" | "user";
    status: "pending" | "approved" | "rejected";
    created_at: string;
};

export type CategoryDraft = {
    id?: string;
    name: string;
    base_rate: string;
    capacity: string;
    description: string;
};

export type RoomDraft = {
    id?: string;
    number: string;
    category_id: string;
    floor: string;
    status: string;
    notes: string;
};

export type BookingDraft = {
    id?: string;
    guest_name: string;
    guest_email: string;
    guest_passport: string;
    second_guest_name: string;
    second_guest_email: string;
    second_guest_passport: string;
    room_ids: string[];
    check_in: string;
    check_out: string;
    status: string;
    auto_release_at: string | null;
    notes: string;
};

export type DashboardView =
    | "all"
    | "properties"
    | "categories"
    | "rooms"
    | "bookings"
    | "availability"
    | "tentative";

export const roomStatuses = [
    { value: "available", label: "Available" },
    { value: "occupied", label: "Occupied" },
    { value: "dirty", label: "Dirty" },
    { value: "out_of_service", label: "Out of Service" },
];

export const bookingStatuses = [
    { value: "reserved", label: "Reserved" },
    { value: "tentative", label: "Tentative" },
    { value: "checked_in", label: "Checked in" },
    { value: "checked_out", label: "Checked out" },
    { value: "cancelled", label: "Cancelled" },
];

export type BookingLog = {
    id: string;
    booking_id: string | null;
    property_id: string;
    action: "create" | "delete" | "update";
    performed_by: string | null;
    performed_at: string;
    details: {
        guest_name: string;
        room_number?: string;
        check_in?: string;
        check_out?: string;
        amount?: number;
    };
    performed_by_user?: {
        display_name: string;
    } | null;
    property?: {
        name: string;
    } | null;
};
