import { sql } from "drizzle-orm";
import { getDb } from "../server/db";

type Request = { method?: string };
type Response = {
  status: (code: number) => Response;
  setHeader: (name: string, value: string) => void;
  json: (value: unknown) => void;
};

export default async function handler(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ ok: false, database: "not_configured", error: "Database is not configured." });
  }

  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ ok: false, database: "unavailable", error: "Database is unavailable." });
    await db.execute(sql`SELECT 1 AS ok`);
    return res.status(200).json({ ok: true, database: "mysql_tidb" });
  } catch (error) {
    console.error("[VercelHealth] Database probe failed", error);
    return res.status(503).json({ ok: false, database: "unavailable", error: "Database connection failed." });
  }
}
