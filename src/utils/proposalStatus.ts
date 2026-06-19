import type { ProposalStatus } from "../types/database";

export type ProposalStatusOption = {
  value: ProposalStatus;
  label: string;
  description: string;
  badgeClassName: string;
};

export const PROPOSAL_STATUS_OPTIONS: ProposalStatusOption[] = [
  {
    value: "draft",
    label: "Rascunho",
    description: "Proposta criada, ainda não enviada ao cliente.",
    badgeClassName:
      "bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200",
  },
  {
    value: "sent",
    label: "Enviada",
    description: "Proposta enviada ao cliente e aguardando resposta.",
    badgeClassName:
      "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  },
  {
    value: "negotiating",
    label: "Em negociação",
    description: "Cliente respondeu e a proposta está sendo ajustada.",
    badgeClassName:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  },
  {
    value: "approved",
    label: "Aprovada",
    description: "Cliente aprovou a proposta.",
    badgeClassName:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  },
  {
    value: "lost",
    label: "Perdida",
    description: "Cliente recusou ou não avançou com a proposta.",
    badgeClassName:
      "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  },
  {
    value: "completed",
    label: "Concluída",
    description: "Serviço executado e proposta encerrada.",
    badgeClassName:
      "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200",
  },
];

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  negotiating: "Em negociação",
  approved: "Aprovada",
  lost: "Perdida",
  completed: "Concluída",
};

export const PROPOSAL_STATUS_BADGE_CLASSNAMES: Record<ProposalStatus, string> =
  {
    draft: "bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200",
    sent: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    negotiating:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    approved:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    lost: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
    completed:
      "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200",
  };

export function isProposalStatus(value: unknown): value is ProposalStatus {
  return PROPOSAL_STATUS_OPTIONS.some((option) => option.value === value);
}

export function getProposalStatusLabel(
  status: ProposalStatus | string | null | undefined,
): string {
  if (!isProposalStatus(status)) {
    return "Status inválido";
  }

  return PROPOSAL_STATUS_LABELS[status];
}

export function getProposalStatusBadgeClassName(
  status: ProposalStatus | string | null | undefined,
): string {
  if (!isProposalStatus(status)) {
    return "bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200";
  }

  return PROPOSAL_STATUS_BADGE_CLASSNAMES[status];
}

export function getProposalStatusOption(
  status: ProposalStatus | string | null | undefined,
): ProposalStatusOption | null {
  if (!isProposalStatus(status)) {
    return null;
  }

  return (
    PROPOSAL_STATUS_OPTIONS.find((option) => option.value === status) ?? null
  );
}