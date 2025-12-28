"use client";

import { Suspense } from "react";
import { Dashboard } from "../page";

export default function AvailabilityPage() {
  return (
    <Suspense>
      <Dashboard view="availability" />
    </Suspense>
  );
}

