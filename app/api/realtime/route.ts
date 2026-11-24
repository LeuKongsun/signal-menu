import { handle } from "@upstash/realtime";
import { connection } from "next/server";
import { getRealtime, isRealtimeConfigured } from "@/lib/realtime";

const allowedChannel = /^signal:(?:order:SIG-\d{4}:[A-Za-z0-9_-]{43}|loyalty:[0-9a-f-]{36})$/;

export async function GET(request: Request) {
  await connection();
  if (!isRealtimeConfigured()) {
    return Response.json({ error: "Realtime is not configured" }, { status: 404 });
  }

  return handle({
    realtime: getRealtime(),
    middleware: ({ channels }) => {
      if (channels.some((channel) => !allowedChannel.test(channel))) {
        return Response.json({ error: "Realtime access denied" }, { status: 403 });
      }
    },
  })(request);
}
