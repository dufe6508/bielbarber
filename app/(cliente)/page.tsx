import { Suspense } from "react";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { CobrancaBanner } from "@/components/CobrancaBanner";

export default function HomePage() {
  return (
    <Suspense>
      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        <CobrancaBanner />
      </div>
      <BookingStepper />
    </Suspense>
  );
}
