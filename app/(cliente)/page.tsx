import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BookingStepper } from "@/components/booking/BookingStepper";
import { CobrancaBanner } from "@/components/CobrancaBanner";
import { cachedHorizonteDias } from "@/lib/cache";
import { dataISOLocal } from "@/lib/utils/format";
import { getAdminSession } from "@/lib/auth";

export default async function HomePage() {
  // Se o admin estiver logado, redireciona para o painel.
  // Garante que o PWA instalado pelo barbeiro não caia sempre na tela do cliente.
  const isAdmin = await getAdminSession();
  if (isAdmin) redirect("/admin");

  const horizonteDias = await cachedHorizonteDias();
  const limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() + horizonteDias);
  const limiteISO = dataISOLocal(limite);

  return (
    <Suspense>
      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        <CobrancaBanner />
      </div>
      <BookingStepper limite={limiteISO} />
    </Suspense>
  );
}
