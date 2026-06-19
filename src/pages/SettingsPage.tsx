import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { CompanySettings, PaymentTerm } from "../types/database";

type SettingsForm = {
  company_name: string;
  document: string;
  phone: string;
  email: string;
  instagram: string;
  city: string;
  state: string;
  pix_key: string;
  bank_name: string;
  bank_holder: string;
  bank_agency: string;
  bank_account: string;
  signature_name: string;
  default_down_payment_percentage: string;
  proposal_validity_days: string;
};

type PaymentTermForm = {
  title: string;
  description: string;
  sort_order: string;
};

const defaultSettingsForm: SettingsForm = {
  company_name: "Carambolo Studio",
  document: "",
  phone: "",
  email: "",
  instagram: "",
  city: "Teresina",
  state: "PI",
  pix_key: "",
  bank_name: "",
  bank_holder: "",
  bank_agency: "",
  bank_account: "",
  signature_name: "",
  default_down_payment_percentage: "50",
  proposal_validity_days: "7",
};

const emptyPaymentTermForm: PaymentTermForm = {
  title: "",
  description: "",
  sort_order: "1",
};

export function SettingsPage() {
  const [settingsForm, setSettingsForm] =
    useState<SettingsForm>(defaultSettingsForm);

  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [paymentTermForm, setPaymentTermForm] =
    useState<PaymentTermForm>(emptyPaymentTermForm);

  const [editingPaymentTerm, setEditingPaymentTerm] =
    useState<PaymentTerm | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPaymentTerm, setSavingPaymentTerm] = useState(false);

  async function loadSettings() {
    setLoading(true);

    const [settingsResponse, paymentTermsResponse] = await Promise.all([
      supabase
        .from("company_settings")
        .select("*")
        .eq("id", "main")
        .limit(1),
      supabase
        .from("payment_terms")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    if (settingsResponse.error) {
      console.error("Erro Supabase company_settings:", settingsResponse.error);
      alert(
        `Erro ao carregar configurações da empresa: ${settingsResponse.error.message}`,
      );
      setLoading(false);
      return;
    }

    if (paymentTermsResponse.error) {
      console.error("Erro Supabase payment_terms:", paymentTermsResponse.error);
      alert(
        `Erro ao carregar formas de pagamento: ${paymentTermsResponse.error.message}`,
      );
      setLoading(false);
      return;
    }

    let settings = (settingsResponse.data?.[0] ?? null) as CompanySettings | null;

    if (!settings) {
      const { data: createdRows, error: createSettingsError } = await supabase
        .from("company_settings")
        .insert({
          id: "main",
          company_name: "Carambolo Studio",
          document: "47.226.752/0001-39",
          phone: "(86) 99994-7314",
          email: "carambolostudio@gmail.com",
          instagram: "@carambolostudio",
          city: "Teresina",
          state: "PI",
          pix_key: "carambolostudio@gmail.com",
          bank_name: "BANCO DO BRASIL",
          bank_holder: "DIEGO PEREIRA DE OLIVEIRA",
          bank_agency: "3178-0",
          bank_account: "121451-9",
          signature_name: "DIEGO PEREIRA DE OLIVEIRA",
          default_down_payment_percentage: 50,
          proposal_validity_days: 7,
        })
        .select("*");

      if (createSettingsError) {
        console.error(
          "Erro Supabase ao criar company_settings:",
          createSettingsError,
        );
        alert(
          `Erro ao criar configurações iniciais: ${createSettingsError.message}`,
        );
        setLoading(false);
        return;
      }

      settings = (createdRows?.[0] ?? null) as CompanySettings | null;

      if (!settings) {
        alert("As configurações iniciais não foram criadas.");
        setLoading(false);
        return;
      }
    }

    setSettingsForm({
      company_name: settings.company_name ?? "",
      document: settings.document ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      instagram: settings.instagram ?? "",
      city: settings.city ?? "",
      state: settings.state ?? "",
      pix_key: settings.pix_key ?? "",
      bank_name: settings.bank_name ?? "",
      bank_holder: settings.bank_holder ?? "",
      bank_agency: settings.bank_agency ?? "",
      bank_account: settings.bank_account ?? "",
      signature_name: settings.signature_name ?? "",
      default_down_payment_percentage: String(
        settings.default_down_payment_percentage ?? 50,
      ),
      proposal_validity_days: String(settings.proposal_validity_days ?? 7),
    });

    setPaymentTerms(paymentTermsResponse.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateSettingsForm(field: keyof SettingsForm, value: string) {
    setSettingsForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePaymentTermForm(field: keyof PaymentTermForm, value: string) {
    setPaymentTermForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    const downPaymentPercentage = Number(
      settingsForm.default_down_payment_percentage,
    );

    const validityDays = Number(settingsForm.proposal_validity_days);

    if (!settingsForm.company_name.trim()) {
      alert("Informe o nome da empresa.");
      return;
    }

    if (
      Number.isNaN(downPaymentPercentage) ||
      downPaymentPercentage < 0 ||
      downPaymentPercentage > 100
    ) {
      alert("O percentual de sinal deve estar entre 0 e 100.");
      return;
    }

    if (Number.isNaN(validityDays) || validityDays < 0) {
      alert("Informe uma validade padrão válida.");
      return;
    }

    setSavingSettings(true);

    const { error } = await supabase.from("company_settings").upsert({
      id: "main",
      company_name: settingsForm.company_name.trim(),
      document: settingsForm.document.trim() || null,
      phone: settingsForm.phone.trim() || null,
      email: settingsForm.email.trim() || null,
      instagram: settingsForm.instagram.trim() || null,
      city: settingsForm.city.trim() || null,
      state: settingsForm.state.trim() || null,
      pix_key: settingsForm.pix_key.trim() || null,
      bank_name: settingsForm.bank_name.trim() || null,
      bank_holder: settingsForm.bank_holder.trim() || null,
      bank_agency: settingsForm.bank_agency.trim() || null,
      bank_account: settingsForm.bank_account.trim() || null,
      signature_name: settingsForm.signature_name.trim() || null,
      default_down_payment_percentage: downPaymentPercentage,
      proposal_validity_days: validityDays,
    });

    if (error) {
      console.error("Erro Supabase ao salvar company_settings:", error);
      alert(`Erro ao salvar configurações: ${error.message}`);
      setSavingSettings(false);
      return;
    }

    alert("Configurações salvas com sucesso.");
    setSavingSettings(false);
    await loadSettings();
  }

  function startEditPaymentTerm(term: PaymentTerm) {
    setEditingPaymentTerm(term);
    setPaymentTermForm({
      title: term.title,
      description: term.description,
      sort_order: String(term.sort_order ?? 1),
    });
  }

  function resetPaymentTermForm() {
    setEditingPaymentTerm(null);
    setPaymentTermForm(emptyPaymentTermForm);
  }

  async function savePaymentTerm(event: FormEvent) {
    event.preventDefault();

    const sortOrder = Number(paymentTermForm.sort_order);

    if (!paymentTermForm.title.trim()) {
      alert("Informe o título da forma de pagamento.");
      return;
    }

    if (!paymentTermForm.description.trim()) {
      alert("Informe a descrição da forma de pagamento.");
      return;
    }

    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      alert("Informe uma ordem válida.");
      return;
    }

    setSavingPaymentTerm(true);

    const payload = {
      title: paymentTermForm.title.trim(),
      description: paymentTermForm.description.trim(),
      sort_order: sortOrder,
    };

    const response = editingPaymentTerm
      ? await supabase
          .from("payment_terms")
          .update(payload)
          .eq("id", editingPaymentTerm.id)
      : await supabase.from("payment_terms").insert({
          ...payload,
          is_active: true,
        });

    if (response.error) {
      console.error("Erro Supabase ao salvar payment_terms:", response.error);
      alert(`Erro ao salvar forma de pagamento: ${response.error.message}`);
      setSavingPaymentTerm(false);
      return;
    }

    resetPaymentTermForm();
    setSavingPaymentTerm(false);
    await loadSettings();
  }

  async function deactivatePaymentTerm(term: PaymentTerm) {
    const confirmed = confirm(
      `Deseja inativar "${term.title}"? Ela não deverá aparecer nos próximos PDFs.`,
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("payment_terms")
      .update({ is_active: false })
      .eq("id", term.id);

    if (error) {
      console.error("Erro Supabase ao inativar payment_terms:", error);
      alert(`Erro ao inativar forma de pagamento: ${error.message}`);
      return;
    }

    await loadSettings();
  }

  async function reactivatePaymentTerm(term: PaymentTerm) {
    const { error } = await supabase
      .from("payment_terms")
      .update({ is_active: true })
      .eq("id", term.id);

    if (error) {
      console.error("Erro Supabase ao reativar payment_terms:", error);
      alert(`Erro ao reativar forma de pagamento: ${error.message}`);
      return;
    }

    await loadSettings();
  }

  if (loading) {
    return <p>Carregando configurações...</p>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold">Configurações</h2>
      <p className="mt-2 text-neutral-600">
        Edite os dados usados nas propostas e nas formas de pagamento.
      </p>

      <form
        onSubmit={saveSettings}
        className="mt-8 grid gap-6 rounded-2xl bg-white p-6 shadow-sm"
      >
        <h3 className="text-xl font-bold">Dados do estúdio</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Nome da empresa</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={settingsForm.company_name}
              onChange={(event) =>
                updateSettingsForm("company_name", event.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">CNPJ</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={settingsForm.document}
              onChange={(event) =>
                updateSettingsForm("document", event.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Telefone</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={settingsForm.phone}
              onChange={(event) =>
                updateSettingsForm("phone", event.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">E-mail</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={settingsForm.email}
              onChange={(event) =>
                updateSettingsForm("email", event.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Instagram</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={settingsForm.instagram}
              onChange={(event) =>
                updateSettingsForm("instagram", event.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Nome para assinatura</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={settingsForm.signature_name}
              onChange={(event) =>
                updateSettingsForm("signature_name", event.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Cidade</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={settingsForm.city}
              onChange={(event) =>
                updateSettingsForm("city", event.target.value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-semibold">UF</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={settingsForm.state}
              onChange={(event) =>
                updateSettingsForm("state", event.target.value)
              }
            />
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6">
          <h3 className="text-xl font-bold">Pagamento e proposta</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Chave Pix</label>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={settingsForm.pix_key}
                onChange={(event) =>
                  updateSettingsForm("pix_key", event.target.value)
                }
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Banco</label>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={settingsForm.bank_name}
                onChange={(event) =>
                  updateSettingsForm("bank_name", event.target.value)
                }
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Titular da conta</label>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={settingsForm.bank_holder}
                onChange={(event) =>
                  updateSettingsForm("bank_holder", event.target.value)
                }
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Agência</label>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={settingsForm.bank_agency}
                onChange={(event) =>
                  updateSettingsForm("bank_agency", event.target.value)
                }
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Conta</label>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={settingsForm.bank_account}
                onChange={(event) =>
                  updateSettingsForm("bank_account", event.target.value)
                }
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Percentual de sinal padrão
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={settingsForm.default_down_payment_percentage}
                onChange={(event) =>
                  updateSettingsForm(
                    "default_down_payment_percentage",
                    event.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Validade padrão da proposta em dias
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={settingsForm.proposal_validity_days}
                onChange={(event) =>
                  updateSettingsForm(
                    "proposal_validity_days",
                    event.target.value,
                  )
                }
              />
            </div>
          </div>
        </div>

        <button
          disabled={savingSettings}
          className="w-fit rounded-xl bg-neutral-950 px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {savingSettings ? "Salvando..." : "Salvar configurações"}
        </button>
      </form>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Formas de pagamento</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Estas condições devem aparecer na página final da proposta.
            </p>
          </div>

          {editingPaymentTerm && (
            <button
              type="button"
              onClick={resetPaymentTermForm}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={savePaymentTerm} className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1fr_140px]">
            <div>
              <label className="text-sm font-semibold">Título</label>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={paymentTermForm.title}
                onChange={(event) =>
                  updatePaymentTermForm("title", event.target.value)
                }
                placeholder="Ex.: Pix"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Ordem</label>
              <input
                type="number"
                min="0"
                step="1"
                className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
                value={paymentTermForm.sort_order}
                onChange={(event) =>
                  updatePaymentTermForm("sort_order", event.target.value)
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Descrição</label>
            <textarea
              className="mt-1 min-h-24 w-full rounded-xl border border-neutral-300 p-3"
              value={paymentTermForm.description}
              onChange={(event) =>
                updatePaymentTermForm("description", event.target.value)
              }
              placeholder="Descreva a condição de pagamento."
            />
          </div>

          <button
            disabled={savingPaymentTerm}
            className="w-fit rounded-xl bg-amber-500 px-5 py-3 font-bold text-black disabled:opacity-60"
          >
            {savingPaymentTerm
              ? "Salvando..."
              : editingPaymentTerm
                ? "Salvar forma de pagamento"
                : "Adicionar forma de pagamento"}
          </button>
        </form>

        <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-neutral-950 text-white">
              <tr>
                <th className="p-4">Ordem</th>
                <th className="p-4">Forma</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {paymentTerms.length === 0 ? (
                <tr>
                  <td className="p-4" colSpan={4}>
                    Nenhuma forma de pagamento cadastrada.
                  </td>
                </tr>
              ) : (
                paymentTerms.map((term) => (
                  <tr key={term.id} className="border-b border-neutral-200">
                    <td className="p-4">{term.sort_order ?? 0}</td>

                    <td className="p-4">
                      <strong>{term.title}</strong>
                      <p className="mt-1 max-w-2xl text-neutral-500">
                        {term.description}
                      </p>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          term.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {term.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEditPaymentTerm(term)}
                          className="rounded-xl border border-neutral-300 px-3 py-2 font-semibold"
                        >
                          Editar
                        </button>

                        {term.is_active ? (
                          <button
                            type="button"
                            onClick={() => deactivatePaymentTerm(term)}
                            className="rounded-xl bg-red-600 px-3 py-2 font-semibold text-white"
                          >
                            Inativar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => reactivatePaymentTerm(term)}
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
      </section>
    </div>
  );
}