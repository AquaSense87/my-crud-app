import { neon } from "@neondatabase/serverless";

if (!process.env.POSTGRES_URL) throw new Error("POSTGRES_URL not set");

export const sql = neon(process.env.POSTGRES_URL);
