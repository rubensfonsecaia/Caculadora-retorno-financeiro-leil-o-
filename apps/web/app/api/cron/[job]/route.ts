import { timingSafeEqual } from "node:crypto";
import { JOBS, runJob, type JobName } from "@/lib/jobs";
import { serverEnv } from "@/lib/server-env";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(header: string | null): boolean {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

// A Vercel chama com "Authorization: Bearer $CRON_SECRET" (vercel.json).
export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(req.headers.get("authorization"))) return new Response("não autorizado", { status: 401 });
  const { job } = await params;
  if (!(job in JOBS)) return new Response("job desconhecido", { status: 404 });
  const r = await runJob(job as JobName);
  return Response.json(r, { status: r.status === "failed" ? 500 : 200 });
}
