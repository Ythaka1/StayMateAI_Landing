import SmoothScroll from "@/lib/lenis";
import { PropertyProvider } from "@/lib/property";
import Stage from "@/components/stage/Stage";
import Footer from "@/components/site/Footer";
import { PutYourName } from "@/components/flat/PutYourName";
import { TypeSlab } from "@/components/flat/TypeSlab";
import { AskIt } from "@/components/flat/AskIt";
import { TheRoom } from "@/components/flat/TheRoom";
import { EveryLanguage } from "@/components/flat/EveryLanguage";
import { StaffScreen } from "@/components/flat/StaffScreen";
import { LastQuestion } from "@/components/flat/LastQuestion";
import { WorkingDay } from "@/components/flat/WorkingDay";
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
 *   1  the hero, then the rise          3D over the photographic plate
 *   2  put your property on it         flat, interactive
 *   3  the type slab                   flat
 *   4  the pivot into the card         3D
 *   5  ask it something                flat, interactive
 *   6  the room                        flat, pinned horizontal strip
 *   7  every language                  flat
 *   8  corridor → the number           3D
 *   9  the staff screen                flat
 *  10  the last question               flat
 *  11  nothing new to watch            flat
 *  12  plans                           flat
 *  13  the pilot, then the footer      flat
 *
 * The staff screen sits where it does deliberately: here is what it does,
 * here is what it is worth, here is what it costs you to run, here is what
 * it costs. A general manager asks what their team has to look at before
 * they ask the price.
 *
 * AskIt, TheRoom and StaffScreen are client components. The other flat
 * sections are server-rendered and cross the client boundary as children of
 * Stage, so none of their markup ships as JavaScript.
 */
export default function Home() {
  return (
    <PropertyProvider>
      <SmoothScroll />
      <main id="top">
        <Stage
          afterDescent={
            <>
              <PutYourName />
              <TypeSlab />
            </>
          }
          afterPivot={
            <>
              <AskIt />
              <TheRoom />
              <EveryLanguage />
            </>
          }
          afterCorridor={
            <>
              <StaffScreen />
              <LastQuestion />
              <WorkingDay />
              <Plans />
              <Pilot />
            </>
          }
        />
      </main>
      <Footer />
    </PropertyProvider>
  );
}
