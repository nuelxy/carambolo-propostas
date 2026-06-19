import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ProposalsPage } from "./pages/ProposalsPage";
import { NewProposalPage } from "./pages/NewProposalPage";

function Layout() {
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

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}