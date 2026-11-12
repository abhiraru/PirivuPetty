import "server-only";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { billKey, parseBillKey, validateBill } from "./bills";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT).map(([t, e]) => [e, t]));

// Local-folder storage is for development only. The ignore hints stop the bundler from tracing the whole project for these runtime paths.
const uploadDir = () => process.env.UPLOAD_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");
const localFile = (name: string) => path.join(/* turbopackIgnore: true */ uploadDir(), name);

/** Stores a bill and returns the key to save on the expense. Vercel Blob in production, a local folder in development. */
export async function saveBill(file: File): Promise<string> {
  const problem = validateBill(file);
  if (problem) throw new Error(problem);
  const name = `${randomUUID()}.${EXT[file.type]}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`bills/${name}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
    return billKey("blob", blob.url);
  }
  if (process.env.NODE_ENV === "production") throw new Error("File storage is not set up yet. Ask the admin.");
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ localFile(name), Buffer.from(await file.arrayBuffer()));
  return billKey("local", name);
}

export async function readBill(key: string | null): Promise<{ data: Uint8Array; contentType: string } | null> {
  const parsed = parseBillKey(key);
  if (!parsed) return null;
  if (parsed.backend === "local") {
    try {
      const data = await readFile(/* turbopackIgnore: true */ localFile(parsed.ref));
      return { data, contentType: TYPE_BY_EXT[parsed.ref.split(".").pop() ?? ""] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
  const res = await fetch(parsed.ref);
  if (!res.ok) return null;
  return { data: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}
