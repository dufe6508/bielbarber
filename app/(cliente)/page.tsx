import { Suspense } from "react";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { RepetirUltimoCorte } from "@/components/booking/RepetirUltimoCorte";
import { CobrancaBanner } from "@/components/CobrancaBanner";

export default function HomePage() {
  return (
    <Suspense>
      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        <CobrancaBanner />
        <RepetirUltimoCorte />
      </div>
      <BookingStepper />
    </Suspense>
  );
}
