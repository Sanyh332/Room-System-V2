"use client";

import { Suspense } from "react";
import { Dashboard } from "../page";

export default function BookingsPage() {
  return (
    <Suspense>
      <Dashboard view="bookings" />
    </Suspense>
  );
}

