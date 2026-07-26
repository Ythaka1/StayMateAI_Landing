import SmoothScroll from "@/lib/lenis";
import Stage from "@/components/stage/Stage";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <main>
        {/*
          Beats 1, 2 and 3 — darkness, the descent, the pivot. One sticky
          section, one canvas, one camera path; there is no cut anywhere in
          it. The page opens directly on the card, with no hero above it and
          nothing to load through.
        */}
        <Stage />

        {/*
          STUB — beats 4, 5, 6 (the pull-back to the corridor, the revenue
          figure, the cards fanning out) are pass 03. This tail only proves
          the stage releases the scroll cleanly on the way out.
        */}
        <section className="flex min-h-[70svh] flex-col items-center justify-center bg-night px-6 py-24 text-center">
          <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
            Beats 4–6 · stub
          </p>
          <p className="mt-6 font-body text-sm text-muted">
            The camera pulls back from here.
          </p>
        </section>
      </main>
    </>
  );
}
