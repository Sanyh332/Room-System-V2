
import { formatDistanceToNow } from "date-fns";
import { BookingLog } from "@/app/types";

export type ActivityRow = {
    id: string;
    user: string;
    action: "create" | "delete" | "update";
    details: string;
    property: string;
    time: string;
    dates: string;
};

type RecentBookingsProps = {
    rows: ActivityRow[];
    loading?: boolean;
};

export function RecentBookings({ rows, loading = false }: RecentBookingsProps) {
    const hasRows = rows.length > 0;

    return (
        <div className="glass-card rounded-xl h-full flex flex-col">
            <div className="p-6 pb-2">
                <h3 className="font-semibold leading-none tracking-tight">
                    Recent Activity
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Latest booking actions.
                </p>
            </div>
            {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading activity...</div>
            ) : hasRows ? (
                <div className="flex-1 overflow-auto">
                    <div className="relative w-full">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b sticky top-0 bg-white z-10">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">
                                        User
                                    </th>
                                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[80px]">
                                        Action
                                    </th>
                                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                                        Details
                                    </th>
                                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground w-[100px]">
                                        Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                                    >
                                        <td className="p-4 align-middle font-medium">
                                            {row.user}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${row.action === "create"
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : row.action === "delete"
                                                        ? "border-rose-200 bg-rose-50 text-rose-700"
                                                        : "border-slate-200 bg-slate-50 text-slate-700"
                                                    }`}
                                            >
                                                {row.action === "create" ? "Added" : row.action === "delete" ? "Deleted" : "Updated"}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-medium">{row.details}</span>
                                                <span className="text-xs text-slate-500">
                                                    {row.dates}
                                                </span>
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    {row.property}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-right text-muted-foreground text-xs whitespace-nowrap">
                                            {row.time}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="p-6 text-sm text-muted-foreground">
                    No recent activity recorded.
                </div>
            )}
        </div>
    );
}
