"use client";

import { createRealtime } from "@upstash/realtime/client";
import type { realtimeSchema } from "./realtime-schema";

export const { useRealtime } = createRealtime<typeof realtimeSchema>();
