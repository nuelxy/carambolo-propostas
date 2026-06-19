import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Service } from "../types/database";

type ServiceForm = {
  name: string;
  description: string;
  category: string;
  default_price: string;
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  category: "",
  default_price: "",
};

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadServices() {
    setLoading(true);

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro Supabase services:", error);
      alert(`Erro ao carregar serviços: ${error.message}`);
      setLoading(false);
      return;
    }

    setServices(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  function updateForm(field: keyof ServiceForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingService(null);
  }

  function startEdit(service: Service) {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description,
      category: service.category ?? "",
      default_price: String(Number(service.default_price)),
    });
  }

  async function saveService(event: FormEvent) {
    event.preventDefault();

    const price = Number(form.default_price);

    if (!form.name.trim()) {
      alert("Informe o nome do serviço.");
      return;
    }

    if (!form.description.trim()) {
      alert("Informe a descrição do serviço.");
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      alert("Informe um valor válido.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim() || null,
      default_price: price,
    };

    const response = editingService
      ? await supabase
          .from("services")
          .update(payload)
          .eq("id", editingService.id)
      : await supabase.from("services").insert({
          ...payload,
          is_active: true,
        });

    if (response.error) {
      console.error("Erro Supabase ao salvar service:", response.error);
      alert(`Erro ao salvar serviço: ${response.error.message}`);
      setSaving(false);
      return;
    }

    resetForm();
    await loadServices();
    setSaving(false);
  }

  async function deactivateService(service: Service) {
    const confirmed = confirm(
      `Deseja remover "${service.name}" das próximas propostas? O histórico será preservado.`,
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("services")
      .update({ is_active: false })
      .eq("id", service.id);

    if (error) {
      console.error("Erro Supabase ao inativar service:", error);
      alert(`Erro ao inativar serviço: ${error.message}`);
      return;
    }

    await loadServices();
  }

  async function reactivateService(service: Service) {
    const { error } = await supabase
      .from("services")
      .update({ is_active: true })
      .eq("id", service.id);

    if (error) {
      console.error("Erro Supabase ao reativar service:", error);
      alert(`Erro ao reativar serviço: ${error.message}`);
      return;
    }

    await loadServices();
  }

  function formatCurrency(value: number) {
    return Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div>
      <h2 className="text-3xl font-bold">Serviços</h2>
      <p className="mt-2 text-neutral-600">
        Cadastre, edite ou inative os serviços que aparecem nas propostas.
      </p>

      <form
        onSubmit={saveService}
        className="mt-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {editingService ? "Editar serviço" : "Novo serviço"}
          </h3>

          {editingService && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold">Nome do serviço</label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
            value={form.name}
            onChange={(event) => updateForm("name", event.target.value)}
            placeholder="Ex.: Gravação de podcast"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Descrição padrão</label>
          <textarea
            className="mt-1 min-h-28 w-full rounded-xl border border-neutral-300 p-3"
            value={form.description}
            onChange={(event) =>
              updateForm("description", event.target.value)
            }
            placeholder="Descreva exatamente o que está incluso nesse serviço."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Categoria</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={form.category}
              onChange={(event) => updateForm("category", event.target.value)}
              placeholder="Ex.: Captação, Pós-produção, Ensaio"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Valor padrão</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={form.default_price}
              onChange={(event) =>
                updateForm("default_price", event.target.value)
              }
              placeholder="Ex.: 1500"
            />
          </div>
        </div>

        <button
          disabled={saving}
          className="w-fit rounded-xl bg-neutral-950 px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {saving
            ? "Salvando..."
            : editingService
              ? "Salvar alterações"
              : "Cadastrar serviço"}
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-amber-500 text-black">
            <tr>
              <th className="p-4">Serviço</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Valor padrão</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={5}>
                  Carregando...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={5}>
                  Nenhum serviço cadastrado.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="border-b border-neutral-200">
                  <td className="p-4">
                    <strong>{service.name}</strong>
                    <p className="mt-1 max-w-xl text-neutral-500">
                      {service.description}
                    </p>
                  </td>

                  <td className="p-4">{service.category ?? "—"}</td>

                  <td className="p-4">
                    {formatCurrency(Number(service.default_price))}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        service.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {service.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(service)}
                        className="rounded-xl border border-neutral-300 px-3 py-2 font-semibold"
                      >
                        Editar
                      </button>

                      {service.is_active ? (
                        <button
                          type="button"
                          onClick={() => deactivateService(service)}
                          className="rounded-xl bg-red-600 px-3 py-2 font-semibold text-white"
                        >
                          Excluir
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reactivateService(service)}
                          className="rounded-xl bg-neutral-950 px-3 py-2 font-semibold text-white"
                        >
                          Reativar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}