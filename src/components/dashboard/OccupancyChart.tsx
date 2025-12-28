"use client";

import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

type OccupancyChartProps = {
    data: { name: string; total: number }[];
    loading?: boolean;
    totalRooms?: number;
};

export function OccupancyChart({ data, loading = false, totalRooms = 0 }: OccupancyChartProps) {
    const hasData = data.length > 0 && data.some((d) => d.total > 0);

    return (
        <div className="glass-card rounded-xl p-6">
            <div className="mb-4">
                <h3 className="font-semibold leading-none tracking-tight">
                    Weekly Occupancy
                </h3>
                <p className="text-sm text-muted-foreground">
                    Number of rooms booked per day.
                </p>
                {totalRooms > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Tracking {totalRooms} room{totalRooms === 1 ? "" : "s"} across your properties.
                    </p>
                )}
            </div>
            {loading ? (
                <div className="h-[300px] w-full rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-sm text-muted-foreground grid place-items-center">
                    Loading occupancy...
                </div>
            ) : hasData ? (
                <div className="w-full min-w-0">
                    {/* Use a fixed chart height so ResponsiveContainer never measures 0 */}
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={data}>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar
                                dataKey="total"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                    Add rooms and bookings to see occupancy trends.
                </div>
            )}
        </div>
    );
}
