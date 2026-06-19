import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ProposalStatus } from "../types/database";
import {
  getProposalStatusBadgeClassName,
  getProposalStatusLabel,
  isProposalStatus,
  PROPOSAL_STATUS_OPTIONS,
} from "../utils/proposalStatus";

type DashboardProposalRow = {
  id: string;
  proposal_number: string | null;
  status: ProposalStatus;
  total: number;
  created_at: string;
};

type SupabaseDashboardProposalRow = Omit<
  DashboardProposalRow,
  "status" | "total"
> & {
  status: string | null;
  total: number | string | null;
};

type StatusSummary = {
  status: ProposalStatus;
  count: number;
  total: number;
};

function normalizeProposalRow(
  proposal: SupabaseDashboardProposalRow,
): DashboardProposalRow {
  return {
    ...proposal,
    status: isProposalStatus(proposal.status) ? proposal.status : "draft",
    total: Number(proposal.total ?? 0),
  };
}

function formatCurrency(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{title}</p>
      <strong className="mt-3 block text-2xl font-black text-neutral-950">
        {value}
      </strong>
      <p className="mt-2 text-sm text-neutral-500">{description}</p>
    </div>
  );
}

export function DashboardPage() {
  const [proposals, setProposals] = useState<DashboardProposalRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);

    const { data, error } = await supabase
      .from("proposals")
      .select(
        `
        id,
        proposal_number,
        status,
        total,
        created_at
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar dashboard:", error);
      alert(`Erro ao carregar dashboard: ${error.message}`);
      setLoading(false);
      return;
    }

    const normalizedData = (
      (data ?? []) as unknown as SupabaseDashboardProposalRow[]
    ).map(normalizeProposalRow);

    setProposals(normalizedData);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const dashboardData = useMemo(() => {
    const statusSummaries: StatusSummary[] = PROPOSAL_STATUS_OPTIONS.map(
      (option) => {
        const filtered = proposals.filter(
          (proposal) => proposal.status === option.value,
        );

        return {
          status: option.value,
          count: filtered.length,
          total: filtered.reduce((sum, proposal) => sum + proposal.total, 0),
        };
      },
    );

    const totalProposals = proposals.length;

    const totalNegotiated = proposals.reduce(
      (sum, proposal) => sum + proposal.total,
      0,
    );

    const openPipelineStatuses: ProposalStatus[] = ["sent", "negotiating"];

    const openPipelineTotal = proposals
      .filter((proposal) => openPipelineStatuses.includes(proposal.status))
      .reduce((sum, proposal) => sum + proposal.total, 0);

    const wonStatuses: ProposalStatus[] = ["approved", "completed"];

    const wonProposals = proposals.filter((proposal) =>
      wonStatuses.includes(proposal.status),
    );

    const wonTotal = wonProposals.reduce(
      (sum, proposal) => sum + proposal.total,
      0,
    );

    const lostProposals = proposals.filter(
      (proposal) => proposal.status === "lost",
    );

    const commercialBase = proposals.filter(
      (proposal) => proposal.status !== "draft",
    );

    const conversionRate =
      commercialBase.length > 0
        ? (wonProposals.length / commercialBase.length) * 100
        : 0;

    return {
      statusSummaries,
      totalProposals,
      totalNegotiated,
      openPipelineTotal,
      wonTotal,
      wonCount: wonProposals.length,
      lostCount: lostProposals.length,
      conversionRate,
    };
  }, [proposals]);

  return (
    <div>
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="mt-2 text-neutral-600">
          Visão comercial das propostas geradas pelo sistema.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl bg-white p-6 text-neutral-500 shadow-sm">
          Carregando indicadores...
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Propostas cadastradas"
              value={String(dashboardData.totalProposals)}
              description="Inclui rascunhos, enviadas, aprovadas e perdidas."
            />

            <StatCard
              title="Valor total orçado"
              value={formatCurrency(dashboardData.totalNegotiated)}
              description="Soma de todas as propostas registradas."
            />

            <StatCard
              title="Valor em aberto"
              value={formatCurrency(dashboardData.openPipelineTotal)}
              description="Soma das propostas enviadas e em negociação."
            />

            <StatCard
              title="Receita aprovada"
              value={formatCurrency(dashboardData.wonTotal)}
              description="Soma das propostas aprovadas e concluídas."
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <StatCard
              title="Propostas ganhas"
              value={String(dashboardData.wonCount)}
              description="Propostas aprovadas ou concluídas."
            />

            <StatCard
              title="Propostas perdidas"
              value={String(dashboardData.lostCount)}
              description="Propostas recusadas ou sem avanço comercial."
            />

            <StatCard
              title="Taxa de conversão"
              value={formatPercent(dashboardData.conversionRate)}
              description="Ganhas sobre todas as propostas que saíram de rascunho."
            />
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-6">
              <h3 className="text-xl font-bold">Resumo por status</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Distribuição das propostas por etapa comercial.
              </p>
            </div>

            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-neutral-950 text-white">
                <tr>
                  <th className="p-4">Status</th>
                  <th className="p-4">Quantidade</th>
                  <th className="p-4">Valor total</th>
                </tr>
              </thead>

              <tbody>
                {dashboardData.statusSummaries.map((summary) => (
                  <tr
                    key={summary.status}
                    className="border-b border-neutral-200"
                  >
                    <td className="p-4">
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getProposalStatusBadgeClassName(
                          summary.status,
                        )}`}
                      >
                        {getProposalStatusLabel(summary.status)}
                      </span>
                    </td>

                    <td className="p-4 font-medium">{summary.count}</td>

                    <td className="p-4 font-bold">
                      {formatCurrency(summary.total)}
                    </td>
                  </tr>
                ))}

                {proposals.length === 0 && (
                  <tr>
                    <td className="p-4 text-neutral-500" colSpan={3}>
                      Nenhuma proposta cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}