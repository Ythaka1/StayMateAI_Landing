import SmoothScroll from "@/lib/lenis";
import Stage from "@/components/stage/Stage";
import Footer from "@/components/site/Footer";
import { TypeSlab } from "@/components/flat/TypeSlab";
import { AskIt } from "@/components/flat/AskIt";
import { TheRoom } from "@/components/flat/TheRoom";
import { EveryLanguage } from "@/components/flat/EveryLanguage";
import { Plans } from "@/components/flat/Plans";
import { Pilot } from "@/components/flat/Pilot";

/*
 * The whole site, in order.
 *
 * The 3D is punctuation. Stage owns the one WebGL canvas and the three
 * segments cut out of a single continuous camera path; everything between
 * those segments is flat, photographic, ordinary DOM — no canvas, no shader,
 * no camera — and is passed in here so the page reads as its own running
 * order rather than being buried inside the renderer.
 *
 *   1  card in darkness → the descent    3D
 *   2  the type slab                     flat
 *   3  the pivot into the card           3D
 *   4  ask it something                  flat, interactive
 *   5  the room                          flat
 *   6  every language                    flat
 *   7  corridor → the number             3D
 *   8  plans                             flat
 *   9  the pilot, then the footer        flat
 *
 * Only AskIt and the ambient videos are client components. The other flat
 * sections are server-rendered and cross the client boundary as children of
 * Stage, so none of their markup ships as JavaScript.
 */
export default function Home() {
  return (
    <>
      <SmoothScroll />
      <main id="top">
        <Stage
          afterDescent={<TypeSlab />}
          afterPivot={
            <>
              <AskIt />
              <TheRoom />
              <EveryLanguage />
            </>
          }
          afterCorridor={
            <>
              <Plans />
              <Pilot />
            </>
          }
        />
      </main>
      <Footer />
    </>
  );
}
