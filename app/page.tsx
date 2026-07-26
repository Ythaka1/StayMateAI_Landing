import SmoothScroll from "@/lib/lenis";
import Pivot from "@/components/pivot/Pivot";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <main>
        {/*
          STUB — beats 1 and 2 (the card in darkness, the descent) are built
          in pass 02. Their camera positions live in CAMERA_BEATS in
          components/pivot/scene.ts. This block only exists to give the pivot
          somewhere to start scrolling from; it is not beat 1.
        */}
        <section className="flex min-h-[70svh] flex-col items-center justify-center bg-night px-6 py-24 text-center">
          <p className="font-body text-[0.6875rem] uppercase tracking-[0.2em] text-brass">
            Beats 1–2 · stub
          </p>
          <h1 className="mt-6 max-w-[30rem] font-display text-[clamp(1.6rem,6vw,2.4rem)] leading-tight text-paper">
            One card on the desk.
          </h1>
          <p className="mt-4 font-body text-sm text-muted">Keep scrolling.</p>
        </section>

        <Pivot />

        {/*
          STUB — beats 4, 5, 6 (the pull-back, the revenue figure, the cards
          fanning out) are pass 03. This tail only proves the pivot releases
          the scroll cleanly on the way out.
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
