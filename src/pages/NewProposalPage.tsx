import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Client, Service } from "../types/database";

type SelectedItem = {
  localId: string;
  serviceId: string | null;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isCustom?: boolean;
};

export function NewProposalPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [discountValue, setDiscountValue] = useState(0);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const [clientsResponse, servicesResponse] = await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name"),
    ]);

    if (clientsResponse.error) {
      console.error(clientsResponse.error);
      alert("Erro ao carregar clientes.");
      return;
    }

    if (servicesResponse.error) {
      console.error(servicesResponse.error);
      alert("Erro ao carregar serviços.");
      return;
    }

    setClients(clientsResponse.data ?? []);
    setServices(servicesResponse.data ?? []);
  }

  useEffect(() => {
    loadData();
  }, []);

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

  function updateItem(
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
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
  }, [items]);

  const total = Math.max(subtotal - Number(discountValue), 0);
  const downPayment = total / 2;

  function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  async function saveProposal() {
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
        Number(item.quantity) <= 0 ||
        Number(item.unitPrice) < 0,
    );

    if (hasInvalidItem) {
      alert(
        "Confira os itens da proposta. Nome, descrição, quantidade e valor são obrigatórios.",
      );
      return;
    }

    setSaving(true);

    const proposalNumber = `CAR-${new Date().getFullYear()}-${Date.now()}`;

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .insert({
        proposal_number: proposalNumber,
        client_id: clientId,
        status: "draft",
        subtotal,
        discount_type: discountValue > 0 ? "fixed" : "none",
        discount_value: discountValue,
        total,
        down_payment: downPayment,
      })
      .select("*")
      .single();

    if (proposalError || !proposal) {
      console.error(proposalError);
      alert("Erro ao salvar proposta.");
      setSaving(false);
      return;
    }

    const proposalItems = items.map((item, index) => ({
      proposal_id: proposal.id,
      service_id: item.serviceId,
      service_name: item.serviceName.trim(),
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      total: Number(item.quantity) * Number(item.unitPrice),
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("proposal_items")
      .insert(proposalItems);

    if (itemsError) {
      console.error(itemsError);
      alert("Proposta criada, mas houve erro ao salvar os itens.");
      setSaving(false);
      return;
    }

    alert("Proposta salva com sucesso.");

    setClientId("");
    setItems([]);
    setDiscountValue(0);
    setSaving(false);
  }

  const customItems = items.filter((item) => item.isCustom);

  return (
    <div>
      <h2 className="text-3xl font-bold">Nova proposta</h2>
      <p className="mt-2 text-neutral-600">
        Selecione serviços cadastrados ou adicione itens personalizados para este
        orçamento específico.
      </p>

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
              Nenhum cliente cadastrado. Cadastre um cliente antes de criar a
              proposta.
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">Serviços cadastrados</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Estes itens vêm do catálogo do estúdio.
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
                              updateItem(
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
                              updateItem(
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
                Use esta área para serviços específicos de uma proposta, sem
                poluir o catálogo fixo.
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
                          Number(item.quantity) * Number(item.unitPrice),
                        )}
                      </strong>
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      Qtd. {item.quantity} ×{" "}
                      {formatCurrency(Number(item.unitPrice))}
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
            {saving ? "Salvando..." : "Salvar proposta"}
          </button>
        </aside>
      </div>
    </div>
  );
}