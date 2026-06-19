import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    if (!email || !password) {
      alert("Informe e-mail e senha.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Login inválido.");
      return;
    }

    navigate("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"
      >
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-500">
            Carambolo Studio
          </p>
          <h1 className="mt-2 text-3xl font-black">Acessar propostas</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Área interna para criação e gestão de orçamentos.
          </p>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="text-sm font-semibold">E-mail</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@carambolostudio.com.br"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Senha</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-neutral-300 p-3"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
            />
          </div>

          <button
            disabled={loading}
            className="mt-2 rounded-xl bg-neutral-950 px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>
    </main>
  );
}