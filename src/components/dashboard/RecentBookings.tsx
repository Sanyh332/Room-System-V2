
export type RecentBookingRow = {
    id: string;
    guest: string;
    email?: string | null;
    room: string;
    status: string;
    amountLabel: string;
    stayLabel: string;
};

type RecentBookingsProps = {
    rows: RecentBookingRow[];
    loading?: boolean;
};

export function RecentBookings({ rows, loading = false }: RecentBookingsProps) {
    const hasRows = rows.length > 0;

    return (
        <div className="glass-card rounded-xl">
            <div className="p-6">
                <h3 className="font-semibold leading-none tracking-tight">
                    Recent Bookings
                </h3>
                <p className="text-sm text-muted-foreground">
                    Most recently created bookings.
                </p>
            </div>
            {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading bookings...</div>
            ) : hasRows ? (
                <div className="p-0">
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Guest
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Stay
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Room
                                    </th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {rows.map((booking) => (
                                    <tr
                                        key={booking.id}
                                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                                    >
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{booking.guest}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {booking.email || "No email"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-sm text-muted-foreground">
                                            {booking.stayLabel}
                                        </td>
                                        <td className="p-4 align-middle">{booking.room}</td>
                                        <td className="p-4 align-middle">
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            {booking.amountLabel}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="p-6 text-sm text-muted-foreground">
                    No bookings yet. Create a booking to see it here.
                </div>
            )}
        </div>
    );
}
