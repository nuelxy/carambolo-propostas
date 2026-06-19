import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Client, Service } from "../types/database";

type SelectedItem = {
  serviceId: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
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
    const exists = items.some((item) => item.serviceId === service.id);

    if (exists) {
      setItems((current) =>
        current.filter((item) => item.serviceId !== service.id),
      );
      return;
    }

    setItems((current) => [
      ...current,
      {
        serviceId: service.id,
        serviceName: service.name,
        description: service.description,
        quantity: 1,
        unitPrice: Number(service.default_price),
      },
    ]);
  }

  function updateItem(
    serviceId: string,
    field: "quantity" | "unitPrice",
    value: number,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.serviceId === serviceId ? { ...item, [field]: value } : item,
      ),
    );
  }

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
  }, [items]);

  const total = Math.max(subtotal - discountValue, 0);
  const downPayment = total / 2;

  async function saveProposal() {
    if (!clientId) {
      alert("Selecione o cliente.");
      return;
    }

    if (items.length === 0) {
      alert("Selecione pelo menos um serviço.");
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
      service_name: item.serviceName,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice,
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
    setSaving(false);
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div>
      <h2 className="text-3xl font-bold">Nova proposta</h2>

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

          <h3 className="mt-8 text-xl font-bold">Serviços</h3>

          <div className="mt-4 grid gap-4">
            {services.map((service) => {
              const selected = items.find(
                (item) => item.serviceId === service.id,
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
                          className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                          value={selected.quantity}
                          onChange={(event) =>
                            updateItem(
                              service.id,
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
                          className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                          value={selected.unitPrice}
                          onChange={(event) =>
                            updateItem(
                              service.id,
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
            })}
          </div>
        </section>

        <aside className="h-fit rounded-2xl bg-neutral-950 p-6 text-white shadow-sm">
          <h3 className="text-xl font-bold">Resumo</h3>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>

            <div>
              <label className="text-sm">Desconto</label>
              <input
                type="number"
                min="0"
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