import type { ReactElement } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ProposalsPage } from "./pages/ProposalsPage";
import { NewProposalPage } from "./pages/NewProposalPage";
import { LoginPage } from "./pages/LoginPage";

function RequireAuth({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function Layout() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-100">
      <aside className="fixed left-0 top-0 h-screen w-64 bg-neutral-950 p-6 text-white">
        <h1 className="text-xl font-black uppercase tracking-wide">
          Carambolo
        </h1>
        <p className="mt-1 text-sm text-neutral-400">Propostas</p>

        <nav className="mt-10 flex flex-col gap-3 text-sm">
          <Link to="/">Dashboard</Link>
          <Link to="/clientes">Clientes</Link>
          <Link to="/servicos">Serviços</Link>
          <Link to="/propostas">Propostas</Link>
          <Link to="/propostas/nova">Nova proposta</Link>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <p className="mb-3 break-all text-xs text-neutral-500">
            {user?.email}
          </p>

          <button
            onClick={signOut}
            className="w-full rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/servicos" element={<ServicesPage />} />
          <Route path="/propostas" element={<ProposalsPage />} />
          <Route path="/propostas/nova" element={<NewProposalPage />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/*"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}