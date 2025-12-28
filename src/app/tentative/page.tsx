"use client";

import { Suspense } from "react";
import { Dashboard } from "../page";

export default function TentativePage() {
    return (
        <Suspense>
            <Dashboard view="tentative" />
        </Suspense>
    );
}
