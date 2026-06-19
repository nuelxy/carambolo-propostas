import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ProposalStatus } from "../types/database";
import {
  getProposalStatusBadgeClassName,
  getProposalStatusLabel,
  isProposalStatus,
  PROPOSAL_STATUS_OPTIONS,
} from "../utils/proposalStatus";

type ProposalClient = {
  name: string;
  city: string | null;
  state: string | null;
};

type ProposalRow = {
  id: string;
  proposal_number: string | null;
  issue_date: string;
  status: ProposalStatus;
  total: number;
  clients: ProposalClient | null;
};

type SupabaseProposalRow = Omit<ProposalRow, "clients" | "status"> & {
  status: string | null;
  clients: ProposalClient | ProposalClient[] | null;
};

type PdfResponse = {
  fileName?: string;
  fileUrl?: string;
  error?: string;
};

function getApiUrl() {
  const envApiUrl = import.meta.env.VITE_API_URL;

  if (envApiUrl) {
    return String(envApiUrl).replace(/\/$/, "");
  }

  if (window.location.hostname === "localhost") {
    return "http://localhost:3333";
  }

  return "";
}

function formatCurrency(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function normalizeProposalRow(proposal: SupabaseProposalRow): ProposalRow {
  return {
    ...proposal,
    status: isProposalStatus(proposal.status) ? proposal.status : "draft",
    clients: Array.isArray(proposal.clients)
      ? proposal.clients[0] ?? null
      : proposal.clients ?? null,
  };
}

export function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  async function loadProposals() {
    setLoading(true);

    const { data, error } = await supabase
      .from("proposals")
      .select(
        `
        id,
        proposal_number,
        issue_date,
        status,
        total,
        clients (
          name,
          city,
          state
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar propostas:", error);
      alert(`Erro ao carregar propostas: ${error.message}`);
      setLoading(false);
      return;
    }

    const normalizedData = ((data ?? []) as unknown as SupabaseProposalRow[]).map(
      normalizeProposalRow,
    );

    setProposals(normalizedData);
    setLoading(false);
  }

  useEffect(() => {
    loadProposals();
  }, []);

  async function updateStatus(proposalId: string, status: ProposalStatus) {
    const previousProposals = proposals;

    setUpdatingStatusId(proposalId);

    setProposals((currentProposals) =>
      currentProposals.map((proposal) =>
        proposal.id === proposalId ? { ...proposal, status } : proposal,
      ),
    );

    const { error } = await supabase
      .from("proposals")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (error) {
      console.error("Erro ao atualizar status:", error);
      setProposals(previousProposals);
      alert(`Erro ao atualizar status: ${error.message}`);
      setUpdatingStatusId(null);
      return;
    }

    setUpdatingStatusId(null);
  }

  async function generatePdf(proposalId: string) {
    const apiUrl = getApiUrl();

    if (!apiUrl) {
      alert("VITE_API_URL não configurada.");
      return;
    }

    setLoadingPdfId(proposalId);

    try {
      const response = await fetch(
        `${apiUrl}/proposals/${proposalId}/generate-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const contentType = response.headers.get("content-type");

      const result: PdfResponse = contentType?.includes("application/json")
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        console.error("Erro ao gerar PDF:", result);
        alert(result.error ?? "Erro ao gerar PDF.");
        return;
      }

      if (!result.fileUrl) {
        console.error("Backend não retornou fileUrl:", result);
        alert("PDF gerado, mas o backend não retornou o link do arquivo.");
        return;
      }

      window.open(result.fileUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Erro de conexão com o backend:", error);
      alert("Erro de conexão com o backend.");
    } finally {
      setLoadingPdfId(null);
    }
  }

  return (
    <div>
      <div>
        <h2 className="text-3xl font-bold">Propostas</h2>
        <p className="mt-2 text-neutral-600">
          Histórico de orçamentos gerados pelo sistema.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-neutral-950 text-white">
            <tr>
              <th className="p-4">Número</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Data</th>
              <th className="p-4">Status</th>
              <th className="p-4">Total</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-neutral-500" colSpan={6}>
                  Carregando propostas...
                </td>
              </tr>
            )}

            {!loading &&
              proposals.map((proposal) => (
                <tr key={proposal.id} className="border-b border-neutral-200">
                  <td className="p-4">
                    <span className="font-medium">
                      {proposal.proposal_number ?? "Sem número"}
                    </span>
                  </td>

                  <td className="p-4">
                    <strong>
                      {proposal.clients?.name ?? "Cliente não localizado"}
                    </strong>
                    <p className="text-neutral-500">
                      {proposal.clients?.city ?? "-"}
                      {proposal.clients?.state
                        ? `/${proposal.clients.state}`
                        : ""}
                    </p>
                  </td>

                  <td className="p-4">{formatDate(proposal.issue_date)}</td>

                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getProposalStatusBadgeClassName(
                          proposal.status,
                        )}`}
                      >
                        {getProposalStatusLabel(proposal.status)}
                      </span>

                      <select
                        className="w-fit rounded-xl border border-neutral-300 bg-white p-2"
                        value={proposal.status}
                        disabled={updatingStatusId === proposal.id}
                        onChange={(event) => {
                          const nextStatus = event.target.value;

                          if (!isProposalStatus(nextStatus)) {
                            alert("Status inválido.");
                            return;
                          }

                          updateStatus(proposal.id, nextStatus);
                        }}
                      >
                        {PROPOSAL_STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>

                      {updatingStatusId === proposal.id && (
                        <span className="text-xs text-neutral-500">
                          Atualizando...
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-4 font-bold">
                    {formatCurrency(proposal.total)}
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => generatePdf(proposal.id)}
                      disabled={loadingPdfId === proposal.id}
                      className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-black disabled:opacity-60"
                    >
                      {loadingPdfId === proposal.id
                        ? "Gerando..."
                        : "Gerar PDF"}
                    </button>
                  </td>
                </tr>
              ))}

            {!loading && proposals.length === 0 && (
              <tr>
                <td className="p-4 text-neutral-500" colSpan={6}>
                  Nenhuma proposta cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}