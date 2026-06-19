import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Client } from "../types/database";

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [city, setCity] = useState("Teresina");
  const [state, setState] = useState("PI");
  const [phone, setPhone] = useState("");

  async function loadClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar clientes.");
      return;
    }

    setClients(data ?? []);
  }

  async function createClient(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    const { error } = await supabase.from("clients").insert({
      name,
      city,
      state,
      phone,
    });

    if (error) {
      console.error("Erro Supabase ao cadastrar cliente:", error);
      alert(`Erro ao cadastrar cliente: ${error.message}`);
      return;
    }

    setName("");
    setCity("Teresina");
    setState("PI");
    setPhone("");
    loadClients();
  }

  useEffect(() => {
    loadClients();
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold">Clientes</h2>

      <form
        onSubmit={createClient}
        className="mt-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div>
          <label className="text-sm font-semibold">Nome</label>
          <input
            className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Melquizedeque"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold">Cidade</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Estado</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={state}
              onChange={(event) => setState(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Telefone</label>
            <input
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
        </div>

        <button className="w-fit rounded-xl bg-neutral-950 px-5 py-3 font-semibold text-white">
          Cadastrar cliente
        </button>
      </form>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Clientes cadastrados</h3>

        <div className="mt-4 grid gap-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="rounded-xl border border-neutral-200 p-4"
            >
              <strong>{client.name}</strong>
              <p className="text-sm text-neutral-500">
                {client.city} - {client.state} {client.phone ? `| ${client.phone}` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}