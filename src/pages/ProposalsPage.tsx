import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ProposalRow = {
  id: string;
  proposal_number: string | null;
  issue_date: string;
  status: string;
  total: number;
  clients: {
    name: string;
    city: string | null;
    state: string | null;
  } | null;
};

export function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalRow[]>([]);

  async function loadProposals() {
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
      console.error(error);
      alert("Erro ao carregar propostas.");
      return;
    }

    const normalizedData = (data ?? []).map((proposal) => ({
  ...proposal,
  clients: Array.isArray(proposal.clients)
    ? proposal.clients[0] ?? null
    : proposal.clients ?? null,
}));

setProposals(normalizedData as unknown as ProposalRow[]);
  }

  useEffect(() => {
    loadProposals();
  }, []);

  function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div>
      <h2 className="text-3xl font-bold">Propostas</h2>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-neutral-950 text-white">
            <tr>
              <th className="p-4">Número</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Data</th>
              <th className="p-4">Status</th>
              <th className="p-4">Total</th>
            </tr>
          </thead>

          <tbody>
            {proposals.map((proposal) => (
              <tr key={proposal.id} className="border-b border-neutral-200">
                <td className="p-4">{proposal.proposal_number}</td>
                <td className="p-4">
                  <strong>{proposal.clients?.name}</strong>
                  <p className="text-neutral-500">
                    {proposal.clients?.city}/{proposal.clients?.state}
                  </p>
                </td>
                <td className="p-4">
                  {new Date(proposal.issue_date).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-4">{proposal.status}</td>
                <td className="p-4 font-bold">
                  {formatCurrency(proposal.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}