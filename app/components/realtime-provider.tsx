"use client";

import { RealtimeProvider } from "@upstash/realtime/client";
import { Suspense } from "react";

export function AppRealtimeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <RealtimeProvider api={{ url: "/api/realtime" }}>{children}</RealtimeProvider>
    </Suspense>
  );
}
