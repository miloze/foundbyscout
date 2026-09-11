import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase-server";
import { catalogueMark } from "@/lib/catalogue";
import CTAButton from "@/components/CTAButton";
import HeroEntrance from "@/components/HeroEntrance";
import { VISITED_COOKIE } from "@/lib/first-visit";
import ParkHeroMeta from "@/components/ParkHeroMeta";
import HeroNavOverlay from "@/components/HeroNavOverlay";
import FooterWordmark from "@/components/FooterWordmark";
import FoundObject from "@/components/FoundObject";
import { FOUND_OBJECT_SLUGS } from "@/lib/foundObjects";
import HomeLogoHandoff from "@/components/HomeLogoHandoff";

// cookies() below already opts this route into per-request rendering, so this
// is redundant today — and kept anyway. The featured park is chosen per request;
// if the cookie read is ever refactored out, the page would silently fall back
// to being rendered once and every visitor would see the same park until the
// next deploy. That failure is invisible in dev and would be slow to spot in
// production, so the guarantee is stated rather than inferred.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const db = createServerClient();

  // Read on the server so the first painted frame is already right: a returning
  // visitor gets the finished hero with no clipped state to flash, and a first
  // visitor gets the clipped state without waiting for hydration. A client hook
  // can only answer this after paint, which is the one thing the entrance can't
  // afford. See lib/first-visit.ts. The cookie is written client-side, by
  // <HeroEntrance>, since a Server Component can't set one.
  const firstVisit = !(await cookies()).has(VISITED_COOKIE);

  // No catalogue count is read here. The collection header used to print one
  // and the hero badge before that; neither does now — see the note on the
  // header's CTA for why the homepage deliberately does not foreground how
  // many parks the archive currently holds.
  //
  // postcode is in the strip's columns for the secondary field-notation line
  // ("SE24 / SOUTH LONDON"). Columns are still named rather than *.
type HeroPark = {
  slug: string;
  name: string;
  type: string | null;
  address: string[] | null;
  /** Optional: absent until migration 010 has been applied. See lib/parkArea. */
  area?: string | null;
  borough: string | null;
  postcode: string | null;
  opened: string | null;
  scanned: string | null;
  catalogue_id: string | null;
  hero_image: string | null;
  is_free: boolean | null;
  is_covered: boolean | null;
};

  // The hero's columns, minus `area` — see the note on the query below.
  const HERO_COLUMNS =
    "slug, name, type, address, borough, postcode, opened, scanned, catalogue_id, hero_image, is_free, is_covered";

  const [{ data: featuredParks }, { data: heroPool }, { data: foundObjectParks }] = await Promise.all([
    db
      .from("parks")
      .select("slug, name, location, postcode, type, hero_image, thumbnail, catalogue_id, sort_order")
      .eq("published", true)
      .gt("sort_order", 0)
      .order("sort_order", { ascending: true })
      // Eight, not four. The grid below is repeat(4, 1fr) and wraps on its own,
      // so the second four land as a second row of the same catalogue at the
      // same 2px gutter — one selection, no second heading, no new container.
      // Nothing here fabricates rows: with four published parks this renders
      // one row today and becomes two the moment 007-010 exist.
      .limit(8),
    // Random-from-archive, replacing the Bloblands hardcode. Only parks that
    // actually have a hero image are eligible: this hero is that image at full
    // bleed, so a pick without one would render the #111 fallback and read as
    // broken rather than as a different park.
    //
    // The eligible set comes back and the choice is made below rather than in
    // SQL — PostgREST has no ORDER BY random(), and the alternative (count,
    // then fetch by offset) is two round trips to save a handful of rows on a
    // catalogue this size. Columns are named rather than *, so the payload is
    // only what the hero renders; worth revisiting if the table grows large.
    // `area` arrives with migration 010, and naming a column PostgREST does not
    // know is a 400 for the whole query — whose failure mode here is silent:
    // the pool comes back empty, `featured` is null, and the entire hero
    // section is skipped, so the page renders logo straight to intro with no
    // error anywhere on it. Rather than make the homepage depend on migration
    // order, this asks for `area` and falls back to the same select without it.
    // The fallback can go once 010 is applied everywhere.
    (async (): Promise<{ data: HeroPark[] | null }> => {
      const pool = (columns: string) =>
        db
          .from("parks")
          .select(columns)
          .eq("published", true)
          .not("hero_image", "is", null)
          .neq("hero_image", "");
      const withArea = await pool(`${HERO_COLUMNS}, area`);
      const res = withArea.error ? await pool(HERO_COLUMNS) : withArea;
      // The column list is a runtime string, so the client cannot infer a row
      // type from it the way a literal select does. HeroPark is that type,
      // declared once above; `area` is optional on it precisely because the
      // fallback branch does not return it.
      return { data: (res.data as unknown as HeroPark[] | null) ?? null };
    })(),
    // Found Object reads its park facts from here rather than carrying its own
    // copies. Two rows, named columns: the name for the display type, the
    // postcode and region for the field notation, the coordinates for the
    // position. A hardcoded copy of any of these is how the module came to
    // print SE24 for a park whose postcode is SE27.
    db
      .from("parks")
      .select("slug, name, postcode, location, lat, lng")
      .in("slug", FOUND_OBJECT_SLUGS)
      .eq("published", true),
  ]);

  // A different park per request. Nothing is remembered between visits, so the
  // same park can repeat — that's the intent, not a shuffle through the set.
  const pool = heroPool ?? [];

  // ...except in development, where ?park=<slug> pins the hero to one record.
  // The frame is meant to hold every park without per-park tuning, and a random
  // hero makes that unreviewable: comparing two widths, or a change against the
  // state before it, needs the same park in both frames. Same shape as the
  // ?fixtures=<n> gate on /parks (see lib/devParkFixtures) — NODE_ENV is
  // inlined at build time, so in production this branch is a literal false and
  // the hero is random for every visitor, as before. An unknown slug falls
  // through to the random pick rather than rendering nothing.
  const pinnedSlug = (await searchParams).park;
  const pinned =
    process.env.NODE_ENV !== "production"
      ? pool.find((p) => p.slug === pinnedSlug)
      : undefined;
  const featured = pinned ?? (pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null);


  // Derive tag list from structured fields
  const featureTags: string[] = featured ? [
    featured.type,
    featured.is_free ? "Free" : null,
    featured.is_covered ? "Covered" : "Outdoor",
  ].filter(Boolean) as string[] : [];

  return (
    <div>
      {/* Releases the fixed Scout mark once the PARKS heading reaches it, so the
          catalogue is not read through the logo. Homepage only. */}
      <HomeLogoHandoff targetId="fbs-parks-heading" />

      {/* HERO — static single-park feature */}
      {featured && (
        <section
          className="full-bleed"
          // Every entrance rule is scoped under this attribute, so on a return
          // visit the CSS simply doesn't apply and the hero renders as it
          // always has — nothing to reset, nothing to override.
          data-hero-entrance={firstVisit ? "" : undefined}
          style={{
            position: "relative",
            // 16:9 as a floor, not as a fixed height. It matches hero-01.webp's
            // native 2560×1440, so at the widths where the frame holds its
            // content the image is uncropped — that was the point of the
            // `aspect-ratio: 16 / 9` this replaces, and it is unchanged for
            // every park whose name fits on one line.
            //
            // aspect-ratio *is* a fixed height, though: it derives the box from
            // the width and content overflows it. With the title group free to
            // wrap, a two-line name at a mid width pushed the catalogue mark
            // past the top of the section and `overflow: hidden` cut it off —
            // measured at 820px on CRYSTAL PALACE, 10px of the mark gone. As a
            // minimum the ratio still shapes the frame and the section grows
            // instead, trading a little crop on the photograph for content that
            // is never clipped. 420px stays as the floor below ~750px wide,
            // where 16:9 alone is too short to hold the block at all.
            minHeight: "var(--frame-height)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            // Vertical only — the horizontal inset is now the .contained
            // layers inside, so the hero's copy lines up with the body column
            // below it rather than with the narrower gutter.
            //
            // The foot is the frame's defining proportion, not spare space: the
            // reference leaves roughly a seventh of the hero as open image below
            // the location chip, so the title group reads as sitting *in* the
            // photograph rather than on its bottom edge. 3rem left 48px there
            // and the block looked dropped out of the frame. Fluid, so the
            // proportion holds rather than the pixel count.
            padding: "8rem 0 clamp(2.5rem, 8vw, 7.5rem)",
            // Pull up by the nav's real height so the image reaches the very top
            // of the viewport behind the transparent nav. Was a hardcoded -44px,
            // which left a strip of page background once the bar measured 50px.
            marginTop: "calc(-1 * var(--nav-height, 44px))",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {/* Makes the nav transparent while this hero is behind it */}
          {/* tone="photo": a full-bleed photograph runs under the bar here,
              so the nav cannot use its theme colours over it. */}
          <HeroNavOverlay tone="photo" />

          {/* Carries the entrance's stylesheet and writes the visited cookie.
              Mounted only on a first visit, so neither exists otherwise. */}
          {firstVisit && <HeroEntrance />}

          {/* Hero background */}
          {featured.hero_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.hero_image}
              alt=""
              // Leads the sequence — the curtain the rest of the hero rides in
              // behind. clip-path makes a stacking context, but the img stays
              // at z-index auto, so it can't climb over the zIndex:2 copy.
              className="fbs-he-img"
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", objectPosition: "center center",
              }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "#111" }} />
          )}

          {/* No overlay treatment behind the hero copy — the blur panel read
              badly over real photography and the gradient it replaced washed
              the image out. Plain white type straight on the image for now;
              legibility over busy frames is a known, accepted gap pending a
              better approach. The title's drop shadow stays removed — it was
              never carrying this, and reinstating it would just be the old
              muddying by another route. */}


          {/* Crosshair texture — the frame's ground, behind everything.

              Same column system as the Found Object graticule below: the marks
              sit on the reading column's own edges and its quarters, with one
              step between each, so the hero and that module are reading off one
              grid rather than two. z-index 1 puts it over the photograph and
              under the zIndex:2 copy; it takes no pointer events and is not in
              the accessibility tree. */}
          <div className="fbs-hero-grid fbs-he-grid" aria-hidden="true">
            <span /><span /><span /><span /><span /><span /><span /><span /><span />
          </div>

          {/* Postcode badge — the frame's upper-right anchor. It sits below the
              bar and inside the column's right edge by half a grid step, so it
              reads as an object in the open part of the photograph rather than
              as something hanging off the header.

              Not aria-hidden. The outward code is the only place the featured
              park's postcode appears on this page — the thumbnail strip below
              prints one per card, but for those parks, not this one — so
              hiding it removed a fact rather than a decoration. The crosshair
              layer and the title's arrow stay hidden, because both of those
              carry nothing a reader would otherwise miss. pointer-events stays
              off: it is not a control, it is just readable.

              It used to centre itself on a flex row the height of the logo, so
              that it tracked the mark across breakpoints. The mark is smaller
              now and the badge is larger, so that ratio no longer holds and the
              two are sized independently — both fluidly, so neither needs
              re-tuning per breakpoint. */}
          {featured.postcode && (
            <div className="fbs-hero-badge">
              {/* Snaps in with the catalogue mark while the image is still
                  wiping — a circle this size can't carry a wipe of its own
                  without reading as a flicker. */}
              <div className="fbs-he-badge fbs-hero-badge__disc">
                {/* Display face, not --font-heading: the badge is a display mark
                    like the park name below it, so it takes MSCHN italic rather
                    than Rubik. Sized off the circle so it holds ~30% of the
                    diameter as the badge resizes. */}
                <span>{featured.postcode.split(" ")[0]}</span>
              </div>
            </div>
          )}

          {/* Hero meta block — contained, so the park name shares a left edge
              with the intro paragraph and every section beneath it. */}
          <div className="contained" style={{ position: "relative", zIndex: 2 }}>
            <ParkHeroMeta
              catalogueId={featured.catalogue_id ?? undefined}
              name={featured.name}
              address={featured.address ?? undefined}
              area={featured.area}
              borough={featured.borough}
              postcode={featured.postcode ?? undefined}
              opened={featured.opened ?? undefined}
              scanned={featured.scanned ?? undefined}
              slug={featured.slug}
            />
          </div>
        </section>
      )}

      {/* SITE INTRO — the one-line pitch for the whole site, sitting between
          the hero and the first section. Rubik 300 rather than MSCHN: it's a
          statement to read, not a display word, so it stays sentence case and
          sits below the section headings in the hierarchy. The second sentence
          is muted so the claim leads and the detail follows. */}
      <section style={{ paddingTop: "clamp(3rem, 7vw, 5rem)", paddingBottom: "clamp(1.5rem, 3.5vw, 2.25rem)" }}>
        <p style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(1.25rem, 2.6vw, 2rem)",
          lineHeight: 1.35,
          fontWeight: 300,
          letterSpacing: "-0.01em",
          maxWidth: "34ch",
        }}>
          A curated guide to skateparks.{" "}
          <span style={{ color: "var(--muted)" }}>
            Photography, interactive 3D models, maps and detailed park profiles.
          </span>
        </p>
      </section>

      {/* PARKS COLLECTION
          The proposition above used to hand off to the collection through an
          EXPLORE eyebrow, a second line of copy restating what the parks are,
          and an EXPLORE button — a marketing layer between the reader and the
          photography, and about 200px of it. All three are gone. What is left
          is the collection announcing itself and saying how big it is, which
          is the same pair /parks leads with (.pda-count there: display name
          over a mono count).

          The whitespace either side is deliberately still generous — the point
          was to remove the redundant layer, not to tighten the page. */}
      <section style={{ paddingTop: "clamp(1.5rem, 3.5vw, 2.5rem)", paddingBottom: "6rem" }}>

        {/* PARKS / VIEW ALL PARKS →. The heading keeps the section-heading
            rule it already had, untouched.

            The four cards below are a *selection*, not the archive, and the
            header is the only thing that can say so. A count cannot do it:
            printed beside four cards it reads as a caption for those four, and
            printed in the link it invites the reader to size the archive at
            the moment it is smallest. The link alone carries the point — there
            is more than this, and here is the way to it — without quoting a
            figure that has to grow before it flatters.

            Baseline, not flex-end. flex-end aligns the two *boxes*, and the
            heading's 0.9 line-height puts its box bottom nowhere near its
            baseline — measured, that dropped the CTA about 10px below the foot
            of PARKS. Baseline sets the button's label on the heading's own
            line, from the type's metrics rather than a measured offset that
            would go stale if the heading's size or leading changed. */}
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          gap: "clamp(1rem, 4vw, 3rem)", marginBottom: "clamp(1.25rem, 2.5vw, 1.75rem)",
        }}>
          <h2 id="fbs-parks-heading" style={{
            fontFamily: "var(--font-display), Arial, sans-serif",
            fontSize: "clamp(3rem, 7vw, 6rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.03em",
            fontWeight: 300,
            textTransform: "uppercase",
            flexShrink: 0,
          }}>
            Parks
          </h2>
          {/* The site's CTA, not a new one: same component, same DM Mono 11/500,
              same 3px corner, same caret and the same nudge as VIEW SCAN. Only
              the label is this section's. The EXPLORE button that used to sit
              under a paragraph of copy was already this component — what is
              gone is the marketing layer around it, not the control.

              No count in the label. "VIEW ALL 4 PARKS" is accurate and is
              exactly the wrong thing to lead with: it invites the reader to
              measure the archive at the moment it is smallest, and it would
              read as a smaller claim than "VIEW ALL PARKS" until the catalogue
              is well into double figures. The link still does the job the count
              was added for — it says these four are a selection and that there
              is somewhere else to go — without pricing the collection. */}
          <CTAButton label="View all parks" href="/parks" />
        </div>

        {/* Thumbnails — 4 across */}
        {/* Gap comes from --park-image-gap, shared with the Parks Grid contact
            sheet so the two cannot drift apart again. This was hardcoded to 0
            because the old 2px gaps showed the container's --border backing
            through as vertical rules; that backing is gone, so the gap now
            shows page background like any other grid. Take every park grid to
            edge to edge by setting the token to 0. */}
        <div data-park-thumbs style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--park-image-gap)" }}>
          {(featuredParks ?? []).map((park) => (
            <Link key={park.slug} href={`/parks/${park.slug}`} style={{ display: "block", background: "var(--background)", textDecoration: "none", color: "inherit" }}>
              <div style={{ position: "relative", overflow: "hidden", background: "#111", aspectRatio: "3/4" }}>
                {(park.thumbnail || park.hero_image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={park.thumbnail || park.hero_image}
                    alt=""
                    style={{
                      position: "absolute", inset: 0,
                      width: "100%", height: "100%",
                      objectFit: "cover",
                      // Colour, not grayscale. The b/w treatment read as too
                      // grungy against the current palette; the interactive
                      // B&W toggles (hero/3D viewer, gallery) are a separate
                      // concern and are untouched — see the note in the
                      // <style> block about .fbs-colour.
                    }}
                    className="fbs-thumb-img"
                  />
                )}
                <div className="fbs-thumb-overlay" />
                {/* The type used to sit here as a rounded outline pill over the
                    photograph — the last .fbs-meta-tag on the site. It reads as
                    tertiary metadata, so it has moved down into the card's
                    field notation with the rest of it, and the frame is left as
                    a photograph. */}
              </div>
              {/* Field notation — the same three tiers the park cards carry:
                    001/ CRYSTAL PALACE
                    SE19 / SOUTH LONDON
                    BOWL
                  The layout is this strip's own (the name is body type at 13px,
                  not the display face, because these cells are a quarter of a
                  row wide). Only the notation is shared. */}
              <div style={{ padding: "10px 12px 14px" }}>
                {/* The catalogue mark, from the one helper that builds it. This
                    was a bare "003" with no slash — a third format for a fact
                    the cards and the hero were already agreeing on. */}
                {catalogueMark(park.catalogue_id) && (
                  <p style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
                    color: "var(--accent)", letterSpacing: "0.08em",
                    textTransform: "uppercase", marginBottom: 3,
                  }}>
                    {catalogueMark(park.catalogue_id)}
                  </p>
                )}
                {/* The display face, uppercase — the same rule that names a
                    park in the directory, the grid and both heroes. It was
                    13px/600 Geist, which is a weight Geist does not ship
                    (next/font loads 300 and 400 only), so the browser was
                    faking the bold and the name still sat only 3px clear of
                    its own 10px metadata. 16px/600 on MSCHN is a real cut and
                    a real step up in rank, without touching the metadata
                    below it or the 3:4 frame above. Scaled to the cell, not
                    to the grid's 18px tile — these are a quarter of a row. */}
                <p style={{
                  fontFamily: "var(--font-display), Arial, sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  fontVariationSettings: "'wght' 600",
                  lineHeight: 1.15,
                  letterSpacing: "0.005em",
                  textTransform: "uppercase",
                }}>
                  {park.name}
                </p>
                {(park.postcode || park.location) && (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginTop: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {[park.postcode?.split(" ")[0], park.location].filter(Boolean).join(" / ")}
                  </p>
                )}
                {park.type && (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", marginTop: 2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {park.type}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

{/* FOUND OBJECT — the archive exhibiting one scanned form.

          Third of three things the homepage does, and deliberately the only
          one that is not a way into a park: the hero features a place, PARKS
          browses places, and this shows skateable *form* on its own. Placed
          after the eight and before the wordmark because it is the one that
          does not end.

          VIEW ALL PARKS stays in the PARKS header rather than moving down
          here — it belongs to the selection ("these eight are not all of
          them"), it is already baseline-aligned with the heading, and this
          module is not an alternative route to the catalogue for it to sit
          after.

          The Random Park prototype it replaces is paused, not deleted:
          components/RandomPark.tsx and randomRenderUrl() are both still there
          and still work. */}
      <FoundObject parks={foundObjectParks ?? []} />

      <style>{`
        /* ── Frame ground: the crosshair lattice ─────────────────────────
           One step of the grid. The Found Object graticule below draws the
           reading column's edges and its quarters — the PARKS grid's four
           columns — so this halves that step and marks every crossing, which
           makes the two modules the same grid at two densities rather than two
           inventions.

           Written from the two tokens .contained is built from, so the pitch is
           exact at every width with nothing measured: the column is
           min(max-width, usable width) less its two paddings, and --vw is the
           usable width Nav publishes. */
        .fbs-hero-grid {
          --hg: calc(
            (min(var(--content-max-width), var(--vw, 100vw)) - 2 * var(--content-padding)) / 8
          );
          /* Half a step up from the foot, so the bottom row sits inside the
             open image below the title group rather than on the hero's edge. */
          --hg-phase: calc(var(--hg) / 2);
          /* White, not --border: this layer sits on a photograph rather than
             on the page, so the theme's hairline colour would describe the
             wrong surface — the same reason the nav label is pinned dark over
             the hero. 0.7 is where the marks stay legible over pale concrete,
             which is most of Scout's photography, without becoming a lattice
             drawn on top of the picture. */
          --hg-ink: rgba(255,255,255,0.7);
          position: absolute;
          top: 0; bottom: 0;
          z-index: 1;
          pointer-events: none;
          /* The reading column, rebuilt inside the full-bleed hero from the
             same expression .fbs-fo-grid-marks uses. */
          left: max(var(--content-padding),
            calc((100% - var(--content-max-width)) / 2 + var(--content-padding)));
          right: max(var(--content-padding),
            calc((100% - var(--content-max-width)) / 2 + var(--content-padding)));
          /* Texture, not structure: it fades in over the hero's upper negative
             space so the open top of the frame stays open, and only reaches
             full strength around the title group. Masked rather than faded per
             mark, so the marks themselves stay 1px and stay sharp — the same
             call .fbs-fo-grid makes at its own two ends. */
          -webkit-mask-image: linear-gradient(to bottom, transparent 0, transparent 28%, #000 52%);
          mask-image: linear-gradient(to bottom, transparent 0, transparent 28%, #000 52%);
        }
        /* One span per vertical, each carrying that vertical's whole run of
           marks as a repeating background rather than one element per crossing.
           The hero's height is fluid and its row count is therefore not knowable
           in markup; a repeat is, and it costs nine nodes instead of fifty.

           Two layers, both tiled at the pitch: a 1px-wide strip whose ink is its
           top 11px (the mark's stem) and an 11px-wide strip whose ink is its
           top 1px (its bar). Each tile is narrow in the axis it is not drawing, so
           the pair composes a cross without needing a 2D image. The half-pixel
           offsets centre each arm on the crossing, exactly as .fbs-fo-mark does
           against the lines it sits on. */
        .fbs-hero-grid > span {
          position: absolute;
          top: 0; bottom: 0;
          width: 11px;
          margin-left: -5px;
          background-image:
            linear-gradient(to bottom, var(--hg-ink) 0 11px, transparent 11px),
            linear-gradient(to bottom, var(--hg-ink) 0 1px, transparent 1px);
          background-size: 1px var(--hg), 11px var(--hg);
          background-repeat: repeat-y, repeat-y;
          background-position:
            left 5px bottom calc(var(--hg-phase) + 5.5px),
            left 0   bottom calc(var(--hg-phase) + 0.5px);
        }
        .fbs-hero-grid > span:nth-child(1) { left: 0; }
        .fbs-hero-grid > span:nth-child(2) { left: 12.5%; }
        .fbs-hero-grid > span:nth-child(3) { left: 25%; }
        .fbs-hero-grid > span:nth-child(4) { left: 37.5%; }
        .fbs-hero-grid > span:nth-child(5) { left: 50%; }
        .fbs-hero-grid > span:nth-child(6) { left: 62.5%; }
        .fbs-hero-grid > span:nth-child(7) { left: 75%; }
        .fbs-hero-grid > span:nth-child(8) { left: 87.5%; }
        .fbs-hero-grid > span:nth-child(9) { left: 100%; }

        /* ── Postcode badge ──────────────────────────────────────────────
           Charcoal, not accent. Orange is the CTA and the wordmark; a filled
           accent circle this size was the loudest object in the frame and put
           the brand colour on a piece of metadata. Same ink and the same
           translucency as the chips in the title group, so the frame's two
           dark objects are one family.

           Sized against the viewport rather than against the logo. The two used
           to share --logo-h so the badge tracked the mark; the mark is smaller
           now and the badge is larger, so a ratio between them would have to be
           re-tuned rather than tracked. A clamp does the same job on its own. */
        .fbs-hero-badge {
          --pc-d: clamp(56px, 6.2vw, 90px);
          position: absolute;
          z-index: 2;
          /* Below the bar, measured from the bar's own published height so it
             follows if the bar ever changes. */
          top: calc(var(--nav-height, 68px) + clamp(18px, 3.4vw, 50px));
          /* Inside the column's right edge by half a grid step, so it reads as
             an object placed in the photograph rather than as another element
             on the frame's right inset with the CTA. */
          right: calc(
            max(var(--content-padding),
              calc((100% - var(--content-max-width)) / 2 + var(--content-padding)))
            + (min(var(--content-max-width), var(--vw, 100vw)) - 2 * var(--content-padding)) / 16
          );
          pointer-events: none;
        }
        .fbs-hero-badge__disc {
          width: var(--pc-d);
          height: var(--pc-d);
          border-radius: var(--radius-circle);
          background: rgba(20,18,15,0.82);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fbs-hero-badge__disc > span {
          font-family: var(--font-display), Arial, sans-serif;
          font-size: calc(var(--pc-d) * 0.3);
          font-weight: 400;
          font-style: italic;
          color: #fff;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        /* The lattice drops to the Found Object grid's own mobile density here
           — column edges and midpoint only — for the same reason that module
           drops its quarters: the catalogue grid is two columns wide at this
           width, so a finer step is clutter in a phone gutter rather than
           structure. Same 700px threshold, so there is one number for both. */
        @media (max-width: 700px) {
          .fbs-hero-grid { --hg: calc(
            (min(var(--content-max-width), var(--vw, 100vw)) - 2 * var(--content-padding)) / 4
          ); }
          .fbs-hero-grid > span:nth-child(2n) { display: none; }
        }

        .fbs-thumb-img { color: transparent; transition: filter 0.4s ease; }
        /* .fbs-colour was the opt-out from the grayscale default. Nothing in
           the app ever set that class on an ancestor, so it never fired and
           the thumbnails were permanently b/w. Colour is now the default and
           the dead hook is gone. The real B&W toggles — ParkHeroShell's bw
           state and GalleryColorToggle — are separate and unaffected. */

        .fbs-thumb-overlay { position:absolute; inset:0; background:var(--accent); opacity:0; transition:opacity 0.3s ease; pointer-events:none; }
        a:hover .fbs-thumb-overlay { opacity:0.28; }
        a:active .fbs-thumb-overlay { opacity:0.28; }
        @media (max-width: 700px) {
          [data-park-thumbs] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Full-bleed so the mark is sized off the viewport rather than the
          reading column, but at scale/slice 1 — no overhang past the screen
          edges and no bottom crop, so the whole wordmark reads. Still larger
          than the contained version it replaced. */}
      <div className="full-bleed" style={{ position: "relative", zIndex: 0 }}>
        <FooterWordmark />
      </div>
    </div>
  );
}
