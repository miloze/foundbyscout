import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Uploads and image-layout writes run here, on the server, under the service
// role — never in the browser.
//
// They used to run in the browser under the anon key, which meant the bucket
// and park_images had to grant write to `public` for the admin page to work.
// The anon key ships in the client bundle, so that granted the same write to
// every visitor: anyone could delete every park image. Moving the writes here
// is what lets 008 take those grants away.
//
// Auth is middleware.ts (matcher covers /api/admin/:path*) plus the check
// below, so this route is not relying on the matcher alone.

const BUCKET = "park-images";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const RATIOS = new Set(["16x9", "9x16", "1x1"]);

function authed(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const cookie = req.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)fbs-admin=([^;]*)/.exec(cookie);
  return match?.[1] === secret;
}

/** Slugs address a storage folder, so anything outside this set is refused. */
function safeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug) ? slug : null;
}

function safeFilename(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(-80) || "image";
}

/** A stored path must sit inside its own park's folder and climb nowhere. */
function pathBelongsTo(path: unknown, slug: string): path is string {
  return typeof path === "string"
    && path.startsWith(`${slug}/`)
    && !path.includes("..")
    && !path.includes("\\");
}

// ── Upload files ───────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const slug = safeSlug(form.get("parkSlug"));
  if (!slug) return NextResponse.json({ error: "Invalid park slug" }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

  const db = createServerClient();
  const uploaded: { name: string; url: string; path: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `${file.name}: unsupported type ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `${file.name}: over ${MAX_BYTES / 1024 / 1024}MB` }, { status: 400 });
    }

    const path = `${slug}/${Date.now()}-${safeFilename(file.name)}`;
    const { error } = await db.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) {
      return NextResponse.json({ error: `Failed to upload ${file.name}: ${error.message}` }, { status: 500 });
    }

    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    uploaded.push({ name: file.name, url: data.publicUrl, path });
  }

  return NextResponse.json({ uploaded });
}

// ── Save the layout for one park ───────────────────────────────────────────
export async function PUT(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const slug = safeSlug(body?.parkSlug);
  if (!slug) return NextResponse.json({ error: "Invalid park slug" }, { status: 400 });

  const images = Array.isArray(body?.images) ? body.images : null;
  if (!images) return NextResponse.json({ error: "No images" }, { status: 400 });

  // Columns are listed explicitly rather than spreading the request body, so a
  // caller cannot set id, created_at, is_hero or spot_id by adding a key.
  const rows = [];
  for (const [index, image] of images.entries()) {
    if (!pathBelongsTo(image?.path, slug)) {
      return NextResponse.json({ error: `Image ${index + 1}: path outside ${slug}/` }, { status: 400 });
    }
    if (image.ratio != null && !RATIOS.has(image.ratio)) {
      return NextResponse.json({ error: `Image ${index + 1}: bad ratio` }, { status: 400 });
    }
    rows.push({ park_slug: slug, path: image.path, ratio: image.ratio ?? null, sort_order: index });
  }

  const db = createServerClient();

  const { error: clearError } = await db.from("park_images").delete().eq("park_slug", slug);
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 400 });

  if (rows.length) {
    const { error } = await db.from("park_images").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
