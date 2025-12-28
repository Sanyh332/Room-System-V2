import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string;
    trend?: string;
    trendUp?: boolean;
    icon: LucideIcon;
    description: string;
}

export function StatsCard({
    title,
    value,
    trend,
    trendUp,
    icon: Icon,
    description,
}: StatsCardProps) {
    return (
        <div className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold">{value}</div>
                {trend && (
                    <span
                        className={cn(
                            "text-xs font-medium",
                            trendUp === undefined
                                ? "text-muted-foreground"
                                : trendUp
                                    ? "text-green-500"
                                    : "text-red-500"
                        )}
                    >
                        {trend}
                    </span>
                )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
    );
}
