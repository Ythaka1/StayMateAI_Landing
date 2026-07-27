import SmoothScroll from "@/lib/lenis";
import Stage from "@/components/stage/Stage";
import Footer from "@/components/site/Footer";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <main id="top">
        {/*
          The whole stage — all six beats. One sticky section, one canvas, one
          camera path; there is no cut anywhere in it, from the opening frame
          to the fan coming to rest.
        */}
        <Stage />
      </main>
      <Footer />
    </>
  );
}
