import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Client, ProposalStatus, Service } from "../types/database";
import { getProposalStatusLabel, isProposalStatus } from "../utils/proposalStatus";

type ProposalData = {
  id: string;
  proposal_number: string | null;
  client_id: string | null;
  issue_date: string;
  valid_until: string | null;
  status: ProposalStatus;
  subtotal: number;
  discount_type: string | null;
  discount_value: number | null;
  total: number;
  down_payment: number | null;
  notes: string | null;
};

type ProposalItemData = {
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

type SelectedItem = {
  localId: string;
  serviceId: string | null;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isCustom?: boolean;
};

function formatCurrency(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeProposalStatus(status: string | null): ProposalStatus {
  return isProposalStatus(status) ? status : "draft";
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function EditProposalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [discountValue, setDiscountValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    if (!id) {
      alert("ID da proposta não informado.");
      navigate("/propostas");
      return;
    }

    setLoading(true);

    const [
      proposalResponse,
      itemsResponse,
      clientsResponse,
      servicesResponse,
    ] = await Promise.all([
      supabase.from("proposals").select("*").eq("id", id).single(),
      supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", id)
        .order("sort_order"),
      supabase.from("clients").select("*").order("name"),
      supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name"),
    ]);

    if (proposalResponse.error || !proposalResponse.data) {
      console.error("Erro ao carregar proposta:", proposalResponse.error);
      alert("Erro ao carregar proposta.");
      navigate("/propostas");
      return;
    }

    if (itemsResponse.error) {
      console.error("Erro ao carregar itens:", itemsResponse.error);
      alert("Erro ao carregar itens da proposta.");
      navigate("/propostas");
      return;
    }

    if (clientsResponse.error) {
      console.error("Erro ao carregar clientes:", clientsResponse.error);
      alert("Erro ao carregar clientes.");
      navigate("/propostas");
      return;
    }

    if (servicesResponse.error) {
      console.error("Erro ao carregar serviços:", servicesResponse.error);
      alert("Erro ao carregar serviços.");
      navigate("/propostas");
      return;
    }

    const loadedProposal = proposalResponse.data as ProposalData;
    const loadedServices = (servicesResponse.data ?? []) as Service[];
    const serviceIds = new Set(loadedServices.map((service) => service.id));

    const loadedItems = ((itemsResponse.data ?? []) as ProposalItemData[]).map(
      (item, index) => {
        const isCatalogItem = item.service_id
          ? serviceIds.has(item.service_id)
          : false;

        return {
          localId: item.id ?? `item-${index}`,
          serviceId: item.service_id,
          serviceName: item.service_name,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          isCustom: !isCatalogItem,
        };
      },
    );

    setProposal({
      ...loadedProposal,
      status: normalizeProposalStatus(String(loadedProposal.status)),
    });
    setClientId(loadedProposal.client_id ?? "");
    setDiscountValue(Number(loadedProposal.discount_value ?? 0));
    setClients((clientsResponse.data ?? []) as Client[]);
    setServices(loadedServices);
    setItems(loadedItems);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id]);

  function toggleService(service: Service) {
    const exists = items.some(
      (item) => item.serviceId === service.id && !item.isCustom,
    );

    if (exists) {
      setItems((current) =>
        current.filter((item) => item.serviceId !== service.id),
      );
      return;
    }

    setItems((current) => [
      ...current,
      {
        localId: service.id,
        serviceId: service.id,
        serviceName: service.name,
        description: service.description,
        quantity: 1,
        unitPrice: Number(service.default_price),
      },
    ]);
  }

  function addCustomItem() {
    setItems((current) => [
      ...current,
      {
        localId: `custom-${Date.now()}`,
        serviceId: null,
        serviceName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        isCustom: true,
      },
    ]);
  }

  function removeItem(localId: string) {
    setItems((current) => current.filter((item) => item.localId !== localId));
  }

  function updateCatalogItem(
    localId: string,
    field: "quantity" | "unitPrice",
    value: number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, [field]: value } : item,
      ),
    );
  }

  function updateCustomItem(
    localId: string,
    field: "serviceName" | "description" | "quantity" | "unitPrice",
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, [field]: value } : item,
      ),
    );
  }

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum + normalizeNumber(item.quantity) * normalizeNumber(item.unitPrice),
      0,
    );
  }, [items]);

  const total = Math.max(subtotal - normalizeNumber(discountValue), 0);
  const downPayment = total / 2;

  async function saveProposal() {
    if (!id) {
      alert("ID da proposta não informado.");
      return;
    }

    if (!clientId) {
      alert("Selecione o cliente.");
      return;
    }

    if (items.length === 0) {
      alert("Selecione pelo menos um serviço ou adicione um item personalizado.");
      return;
    }

    const hasInvalidItem = items.some(
      (item) =>
        !item.serviceName.trim() ||
        !item.description.trim() ||
        normalizeNumber(item.quantity) <= 0 ||
        normalizeNumber(item.unitPrice) < 0,
    );

    if (hasInvalidItem) {
      alert(
        "Confira os itens da proposta. Nome, descrição, quantidade e valor são obrigatórios.",
      );
      return;
    }

    const shouldResetStatus =
      proposal?.status && proposal.status !== "draft"
        ? window.confirm(
            "Esta proposta não está como rascunho. Ao salvar alterações, o status voltará para Rascunho porque o PDF anterior pode ficar desatualizado. Deseja continuar?",
          )
        : true;

    if (!shouldResetStatus) return;

    setSaving(true);

    const rpcItems = items.map((item, index) => ({
      service_id: item.serviceId,
      service_name: item.serviceName.trim(),
      description: item.description.trim(),
      quantity: normalizeNumber(item.quantity),
      unit_price: normalizeNumber(item.unitPrice),
      total: normalizeNumber(item.quantity) * normalizeNumber(item.unitPrice),
      sort_order: index,
    }));

    const { error: rpcError } = await supabase.rpc(
      "update_proposal_with_items",
      {
        p_proposal_id: id,
        p_client_id: clientId,
        p_subtotal: subtotal,
        p_discount_type: discountValue > 0 ? "fixed" : "none",
        p_discount_value: normalizeNumber(discountValue),
        p_total: total,
        p_down_payment: downPayment,
        p_items: rpcItems,
      },
    );

    if (rpcError) {
      console.error("Erro ao atualizar proposta:", rpcError);
      alert(`Erro ao atualizar proposta: ${rpcError.message}`);
      setSaving(false);
      return;
    }

    if (proposal?.status !== "draft") {
      const { error: statusError } = await supabase
        .from("proposals")
        .update({
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (statusError) {
        console.error("Erro ao retornar status para rascunho:", statusError);
        alert(
          "A proposta foi atualizada, mas houve erro ao retornar o status para Rascunho.",
        );
        setSaving(false);
        return;
      }
    }

    alert("Proposta atualizada com sucesso.");
    setSaving(false);
    navigate("/propostas");
  }

  const customItems = items.filter((item) => item.isCustom);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 text-neutral-500 shadow-sm">
        Carregando proposta...
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="rounded-2xl bg-white p-6 text-neutral-500 shadow-sm">
        Proposta não encontrada.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Editar proposta</h2>
          <p className="mt-2 text-neutral-600">
            Ajuste cliente, serviços, quantidades, valores e desconto antes de
            gerar o PDF final.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <span>{proposal.proposal_number ?? "Sem número"}</span>
            <span>•</span>
            <span>Status atual: {getProposalStatusLabel(proposal.status)}</span>
          </div>
        </div>

        <Link
          to="/propostas"
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
        >
          Voltar
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <label className="text-sm font-semibold">Cliente</label>
          <select
            className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">Selecione...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} — {client.city}/{client.state}
              </option>
            ))}
          </select>

          {clients.length === 0 && (
            <p className="mt-2 text-sm text-red-600">
              Nenhum cliente cadastrado. Cadastre um cliente antes de editar a
              proposta.
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Serviços cadastrados</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Marque ou desmarque serviços do catálogo.
              </p>
            </div>

            <button
              type="button"
              onClick={addCustomItem}
              className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Adicionar item personalizado
            </button>
          </div>

          <div className="mt-4 grid gap-4">
            {services.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-500">
                Nenhum serviço ativo cadastrado. Você ainda pode adicionar um
                item personalizado.
              </div>
            ) : (
              services.map((service) => {
                const selected = items.find(
                  (item) => item.serviceId === service.id && !item.isCustom,
                );

                return (
                  <div
                    key={service.id}
                    className="rounded-2xl border border-neutral-200 p-4"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleService(service)}
                        className="mt-1"
                      />

                      <div>
                        <strong>{service.name}</strong>
                        <p className="mt-1 text-sm text-neutral-500">
                          {service.description}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {formatCurrency(Number(service.default_price))}
                        </p>
                      </div>
                    </label>

                    {selected && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                            value={selected.quantity}
                            onChange={(event) =>
                              updateCatalogItem(
                                selected.localId,
                                "quantity",
                                Number(event.target.value),
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold">
                            Valor unitário
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                            value={selected.unitPrice}
                            onChange={(event) =>
                              updateCatalogItem(
                                selected.localId,
                                "unitPrice",
                                Number(event.target.value),
                              )
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {customItems.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold">Itens personalizados</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Use esta área para serviços específicos da proposta.
              </p>

              <div className="mt-4 grid gap-4">
                {customItems.map((item) => (
                  <div
                    key={item.localId}
                    className="rounded-2xl border border-amber-300 bg-amber-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <strong>Item personalizado</strong>

                      <button
                        type="button"
                        onClick={() => removeItem(item.localId)}
                        className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <div>
                        <label className="text-sm font-semibold">
                          Nome do serviço
                        </label>
                        <input
                          className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                          value={item.serviceName}
                          onChange={(event) =>
                            updateCustomItem(
                              item.localId,
                              "serviceName",
                              event.target.value,
                            )
                          }
                          placeholder="Ex.: Pacote personalizado para gravação de EP"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold">
                          Descrição
                        </label>
                        <textarea
                          className="mt-1 min-h-24 w-full rounded-xl border border-neutral-300 p-3"
                          value={item.description}
                          onChange={(event) =>
                            updateCustomItem(
                              item.localId,
                              "description",
                              event.target.value,
                            )
                          }
                          placeholder="Descreva exatamente o que será entregue."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                            value={item.quantity}
                            onChange={(event) =>
                              updateCustomItem(
                                item.localId,
                                "quantity",
                                Number(event.target.value),
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold">
                            Valor unitário
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateCustomItem(
                                item.localId,
                                "unitPrice",
                                Number(event.target.value),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl bg-neutral-950 p-6 text-white shadow-sm">
          <h3 className="text-xl font-bold">Resumo</h3>

          <div className="mt-6 grid gap-3 text-sm">
            {items.length === 0 ? (
              <p className="text-neutral-400">
                Nenhum item selecionado ainda.
              </p>
            ) : (
              <div className="grid gap-3">
                {items.map((item) => (
                  <div
                    key={item.localId}
                    className="rounded-xl bg-neutral-900 p-3"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold">
                        {item.serviceName || "Item sem nome"}
                      </span>
                      <strong>
                        {formatCurrency(
                          normalizeNumber(item.quantity) *
                            normalizeNumber(item.unitPrice),
                        )}
                      </strong>
                    </div>

                    <p className="mt-1 text-xs text-neutral-400">
                      Qtd. {item.quantity} ×{" "}
                      {formatCurrency(normalizeNumber(item.unitPrice))}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between border-t border-neutral-700 pt-4">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>

            <div>
              <label className="text-sm">Desconto</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-white"
                value={discountValue}
                onChange={(event) =>
                  setDiscountValue(Number(event.target.value))
                }
              />
            </div>

            <div className="flex justify-between border-t border-neutral-700 pt-4">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>

            <div className="flex justify-between">
              <span>Sinal de 50%</span>
              <strong>{formatCurrency(downPayment)}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={saveProposal}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-amber-500 px-5 py-3 font-bold text-black disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </aside>
      </div>
    </div>
  );
}