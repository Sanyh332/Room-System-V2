"use client";

import { Suspense } from "react";
import { Dashboard } from "../page";

export default function CategoriesPage() {
  return (
    <Suspense>
      <Dashboard view="categories" />
    </Suspense>
  );
}

