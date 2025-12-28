"use client";

import { Suspense } from "react";
import { Dashboard } from "../page";

export default function RoomsPage() {
  return (
    <Suspense>
      <Dashboard view="rooms" />
    </Suspense>
  );
}

