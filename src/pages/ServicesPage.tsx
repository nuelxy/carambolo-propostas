import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Service } from "../types/database";

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadServices() {
    setLoading(true);

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name");

    if (error) {
      console.error(error);
      alert("Erro ao carregar serviços.");
      setLoading(false);
      return;
    }

    setServices(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadServices();
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-bold">Serviços</h2>
      <p className="mt-2 text-neutral-600">
        Catálogo de serviços usados nas propostas.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-amber-500 text-black">
            <tr>
              <th className="p-4">Serviço</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Valor padrão</th>
              <th className="p-4">Ativo</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={4}>
                  Carregando...
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="border-b border-neutral-200">
                  <td className="p-4">
                    <strong>{service.name}</strong>
                    <p className="mt-1 text-neutral-500">
                      {service.description}
                    </p>
                  </td>
                  <td className="p-4">{service.category}</td>
                  <td className="p-4">
                    {Number(service.default_price).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="p-4">{service.is_active ? "Sim" : "Não"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}