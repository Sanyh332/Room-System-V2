"use client";

import { Suspense } from "react";
import { Dashboard } from "../page";

export default function PropertiesPage() {
  return (
    <Suspense>
      <Dashboard view="properties" />
    </Suspense>
  );
}

