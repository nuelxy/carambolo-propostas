export type Client = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  document: string | null;
  notes: string | null;
  created_at: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  default_price: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
};

export type ProposalStatus =
  | "draft"
  | "sent"
  | "negotiating"
  | "approved"
  | "lost"
  | "completed";

export type Proposal = {
  id: string;
  proposal_number: string | null;
  client_id: string | null;
  title: string | null;
  issue_date: string;
  valid_until: string | null;
  status: ProposalStatus;
  subtotal: number;
  discount_type: string | null;
  discount_value: number | null;
  total: number;
  down_payment: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProposalItem = {
  id: string;
  proposal_id: string;
  service_id: string | null;
  service_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number | null;
};