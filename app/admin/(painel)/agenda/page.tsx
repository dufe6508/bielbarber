import { AdminPage, AdminHeader } from "@/components/admin/primitives";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AgendaSemanalEditor } from "@/components/admin/agenda/AgendaSemanalEditor";
import { AgendaExcecoes } from "@/components/admin/agenda/AgendaExcecoes";
import { AgendaHorizonte } from "@/components/admin/agenda/AgendaHorizonte";

export default function AgendaPage() {
  return (
    <AdminPage className="max-w-3xl">
      <AdminHeader
        titulo="Sua agenda"
        descricao="Defina sua rotina, marque folgas e diga até quando aceitar agendamentos."
      />
      <AdminTabs
        abas={[
          { id: "semana", rotulo: "Rotina semanal", conteudo: <AgendaSemanalEditor /> },
          { id: "excecoes", rotulo: "Folgas e ajustes", conteudo: <AgendaExcecoes /> },
          { id: "limite", rotulo: "Disponibilidade", conteudo: <AgendaHorizonte /> },
        ]}
      />
    </AdminPage>
  );
}
