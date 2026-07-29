import { QR_MODULES, qrRects } from "@/lib/qr";

/*
 * The card, in DOM.
 *
 * The same object the 3D card is, drawn with type and an SVG instead of a
 * shader: same code block, same order, same hierarchy. The property's name
 * dominates and StayMate sits at the foot.
 *
 * ── Why not the 3D one ───────────────────────────────────────────────────
 * The name section needs a card that changes on every keystroke. The 3D card
 * is a canvas texture inside a scroll-driven timeline whose camera path is
 * measured to a hex value at the pivot handoff; repainting its print texture
 * from an input event means a canvas upload per keystroke and a scene marked
 * dirty at a rate scroll does not control. More to the point, the 3D card is
 * only on screen during the hero and the pivot, both of which are above this
 * section, so nobody typing here could see it change.
 *
 * A DOM card costs nothing, renders on the server, works with no WebGL at
 * all, and can be read by a screen reader. The 3D card keeps the default
 * property; this one carries whatever is typed.
 *
 * The rects are computed once at module scope from the shared generator, so
 * this is a static array by the time React sees it.
 */

const RECTS = qrRects();

/**
 * Name size, stepped down by length.
 *
 * The card is a fixed physical object: the name has one measure and has to
 * fit it. Continuous rather than a few breakpoints, so there is no single
 * character that visibly jolts the type down a size while somebody is in the
 * middle of typing their own hotel's name.
 */
function nameSize(len: number): string {
  const rem = Math.max(1.2, Math.min(2.5, 26 / Math.max(len, 1)));
  return `${rem.toFixed(3)}rem`;
}

export function PropertyCard({
  property,
  className,
}: {
  property: string;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative flex aspect-[3/4] flex-col items-center rounded-md",
        "bg-paper px-[9%] pt-[9%] pb-[6%]",
        "shadow-[0_24px_60px_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.25)]",
        className ?? "",
      ].join(" ")}
    >
      {/* The code. aria-hidden because it is set dressing, not a link: it
          does not resolve to anything and never will on this page. */}
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${QR_MODULES} ${QR_MODULES}`}
        className="w-[42%] shrink-0"
        shapeRendering="crispEdges"
      >
        {RECTS.map((r) => (
          <rect
            key={`${r.x}-${r.y}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={1}
            fill="#15171b"
          />
        ))}
      </svg>

      <span
        aria-hidden="true"
        className="mt-[7%] h-px w-[24%] shrink-0 bg-brass"
      />

      {/*
        The property, larger than anything else on the card. min-h so the
        card does not resize as the name grows and shrinks under typing;
        nothing below it may move.
      */}
      <p
        className="mt-[6%] flex min-h-[2.6em] items-start justify-center text-center font-display leading-[1.1] tracking-[0.1em] text-ink"
        style={{ fontSize: nameSize(property.length) }}
      >
        {property}
      </p>

      <p className="mt-[1%] text-center font-body text-[0.6875rem] leading-snug text-muted sm:text-[0.75rem]">
        Scan for your concierge
      </p>

      {/* Ours, at the foot, at the size a printer signs a menu. */}
      <p className="mt-auto pt-[8%] font-body text-[0.5rem] uppercase tracking-[0.3em] text-muted/70">
        StayMate
      </p>
    </div>
  );
}
