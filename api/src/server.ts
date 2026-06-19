import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
});

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Variáveis do Supabase não configuradas no backend.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value: unknown) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Fortaleza",
  });
}

function getLogoDataUrl() {
  const logoPath = path.resolve(process.cwd(), "assets", "carambolo-logo.png");

  if (!fs.existsSync(logoPath)) {
    throw new Error(`Logo não encontrado em: ${logoPath}`);
  }

  const buffer = fs.readFileSync(logoPath);
  const base64 = buffer.toString("base64");

  return `data:image/png;base64,${base64}`;
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks.length ? chunks : [[]];
}

function buildProposalHtml(payload: any) {
  const { proposal, client, items } = payload;

  const logoDataUrl = getLogoDataUrl();
  const issueDate = formatDate(proposal.issue_date);

  const issueYear = proposal.issue_date
    ? new Date(`${proposal.issue_date}T00:00:00`).getFullYear()
    : new Date().getFullYear();

  const company = {
    name: "Carambolo Studio",
    cnpj: "47.226.752/0001-39",
    phone: "(86) 99994-7314",
    email: "carambolostudio@gmail.com",
    instagram: "@carambolostudio",
    pixKey: "carambolostudio@gmail.com",
    bank: "Banco do Brasil",
    bankHolder: "Diego Pereira de Oliveira",
    bankAgency: "3178-0",
    bankAccount: "121451-9",
    responsibleName: "Diego Pereira de Oliveira",
    city: "Teresina",
  };

  const itemPages = chunkItems(items ?? [], 3);

  function renderItemsRows(pageItems: any[]) {
    return pageItems
      .map((item: any) => {
        const quantity = Number(item.quantity ?? 0);
        const unitPrice = Number(item.unit_price ?? 0);
        const total = Number(item.total ?? quantity * unitPrice);

        return `
          <tr>
            <td class="service-name">${escapeHtml(item.service_name)}</td>
            <td class="description">${escapeHtml(item.description)}</td>
            <td class="quantity">${quantity}</td>
            <td class="money">${formatCurrency(unitPrice)}</td>
            <td class="money strong">${formatCurrency(total)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderBudgetPage(
    pageItems: any[],
    pageIndex: number,
    totalPages: number,
  ) {
    const isLastBudgetPage = pageIndex === totalPages - 1;

    return `
      <section class="page budget-page">
        <header class="document-header">
          <div class="brand-block">
            <img class="header-logo" src="${logoDataUrl}" alt="Carambolo Studio" />
            <div>
              <p class="eyebrow">Proposta comercial</p>
              <h2>${escapeHtml(company.name)}</h2>
            </div>
          </div>

          <div class="header-meta">
            <p><span>Data</span>${issueDate}</p>
            <p><span>Proposta</span>${escapeHtml(proposal.proposal_number ?? "")}</p>
          </div>
        </header>

        <main class="budget-content">
          <section class="info-grid">
            <div class="info-card company-card">
              <p class="card-label">Contratada</p>
              <h3>${escapeHtml(company.name)}</h3>
              <p>CNPJ ${escapeHtml(company.cnpj)}</p>
              <p>${escapeHtml(company.phone)}</p>
              <p>${escapeHtml(company.email)}</p>
              <p>${escapeHtml(company.instagram)}</p>
            </div>

            <div class="info-card client-card">
              <p class="card-label">Cliente</p>
              <h3>${escapeHtml(client.name)}</h3>
              <p>${escapeHtml(client.city)} / ${escapeHtml(client.state)}</p>
              ${client.phone ? `<p>${escapeHtml(client.phone)}</p>` : ""}
              ${client.email ? `<p>${escapeHtml(client.email)}</p>` : ""}
            </div>
          </section>

          <section class="table-section">
            <div class="table-title-row">
              <div>
                <p class="eyebrow dark">Serviços selecionados</p>
                <h3>Escopo do orçamento</h3>
              </div>

              ${
                totalPages > 1
                  ? `<p class="page-note">Página ${pageIndex + 1} de ${totalPages}</p>`
                  : ""
              }
            </div>

            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Descrição</th>
                  <th>Qnt</th>
                  <th>Valor unit.</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                ${renderItemsRows(pageItems)}
              </tbody>
            </table>
          </section>

          ${
            isLastBudgetPage
              ? `
                <section class="summary-section">
                  <div class="notes-box">
                    <p class="card-label">Observações</p>
                    <p>${escapeHtml(
                      proposal.notes ??
                        "Valores sujeitos à confirmação de agenda. A reserva da data ocorre mediante pagamento do sinal previsto nesta proposta.",
                    )}</p>
                  </div>

                  <div class="summary-box">
                    <div class="summary-line">
                      <span>Subtotal</span>
                      <strong>${formatCurrency(proposal.subtotal)}</strong>
                    </div>

                    ${
                      Number(proposal.discount_value ?? 0) > 0
                        ? `
                          <div class="summary-line muted">
                            <span>Desconto</span>
                            <strong>${formatCurrency(proposal.discount_value)}</strong>
                          </div>
                        `
                        : ""
                    }

                    <div class="summary-divider"></div>

                    <div class="summary-line total">
                      <span>Custo total</span>
                      <strong>${formatCurrency(proposal.total)}</strong>
                    </div>

                    <div class="summary-line down-payment">
                      <span>Sinal de 50%</span>
                      <strong>${formatCurrency(proposal.down_payment)}</strong>
                    </div>
                  </div>
                </section>
              `
              : ""
          }
        </main>

        <footer class="document-footer light">
          <span>${escapeHtml(company.phone)}</span>
          <span>${escapeHtml(company.email)}</span>
          <span>${escapeHtml(company.instagram)}</span>
        </footer>
      </section>
    `;
  }

  const budgetPages = itemPages
    .map((pageItems, pageIndex) =>
      renderBudgetPage(pageItems, pageIndex, itemPages.length),
    )
    .join("");

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta ${escapeHtml(proposal.proposal_number ?? "")}</title>

  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #161616;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .cover-page,
    .payment-page {
      background:
        radial-gradient(circle at 18% 15%, rgba(243, 175, 0, 0.20), transparent 28%),
        linear-gradient(135deg, #0f0f10 0%, #191919 45%, #0b0b0c 100%);
      color: #f5f1e8;
    }

    .cover-page::before,
    .payment-page::before {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0.065;
      background-image:
        linear-gradient(45deg, rgba(243, 175, 0, 0.7) 1px, transparent 1px),
        linear-gradient(-45deg, rgba(255, 255, 255, 0.25) 1px, transparent 1px);
      background-size: 18mm 18mm;
      pointer-events: none;
    }

    .cover-frame {
      position: absolute;
      inset: 18mm;
      border: 1px solid rgba(243, 175, 0, 0.34);
      padding: 14mm;
      display: flex;
      flex-direction: column;
      z-index: 1;
    }

    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .cover-logo {
      width: 52mm;
      height: auto;
      object-fit: contain;
    }

    .proposal-number {
      text-align: right;
      color: #c9c4b9;
      font-size: 9px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .proposal-number strong {
      display: block;
      color: #f3af00;
      margin-top: 4px;
      font-size: 12px;
      letter-spacing: 0.08em;
    }

    .cover-main {
      margin-top: auto;
      margin-bottom: 28mm;
    }

    .gold-line {
      width: 30mm;
      height: 2px;
      background: #f3af00;
      margin-bottom: 10mm;
    }

    .cover-title {
      margin: 0;
      font-size: 45px;
      line-height: 0.96;
      text-transform: uppercase;
      letter-spacing: -0.04em;
      color: #f3af00;
      font-weight: 900;
    }

    .cover-year {
      margin-top: 8mm;
      font-size: 22px;
      letter-spacing: 0.28em;
      color: #f5f1e8;
    }

    .client-strip {
      margin-top: 14mm;
      padding-top: 6mm;
      border-top: 1px solid rgba(245, 241, 232, 0.32);
    }

    .client-strip span {
      display: block;
      color: #a8a39a;
      font-size: 9px;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      margin-bottom: 3mm;
    }

    .client-strip strong {
      display: block;
      color: #ffffff;
      font-size: 18px;
      line-height: 1.2;
      letter-spacing: 0.10em;
      text-transform: uppercase;
    }

    .cover-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      color: #aaa49a;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-top: 1px solid rgba(243, 175, 0, 0.25);
      padding-top: 6mm;
    }

    .budget-page {
      background: #f7f3ea;
      padding: 16mm 18mm;
      color: #151515;
    }

    .document-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 7mm;
      border-bottom: 1px solid rgba(21, 21, 21, 0.16);
    }

    .brand-block {
      display: flex;
      align-items: center;
      gap: 6mm;
    }

    .header-logo {
      width: 31mm;
      height: auto;
      object-fit: contain;
    }

    .eyebrow {
      margin: 0 0 2mm 0;
      color: #f3af00;
      font-size: 8px;
      line-height: 1;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      font-weight: 800;
    }

    .eyebrow.dark {
      color: #7f5c00;
    }

    .brand-block h2 {
      margin: 0;
      font-size: 20px;
      text-transform: uppercase;
      letter-spacing: -0.03em;
      line-height: 1;
    }

    .header-meta {
      text-align: right;
      font-size: 10px;
      color: #333;
    }

    .header-meta p {
      margin: 0 0 3mm 0;
    }

    .header-meta span {
      display: block;
      color: #8c7f63;
      font-size: 8px;
      letter-spacing: 0.20em;
      text-transform: uppercase;
      font-weight: 800;
      margin-bottom: 1mm;
    }

    .budget-content {
      padding-top: 9mm;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 6mm;
    }

    .info-card {
      background: #ffffff;
      border: 1px solid rgba(21, 21, 21, 0.10);
      border-left: 3px solid #f3af00;
      padding: 6mm;
      min-height: 38mm;
    }

    .card-label {
      margin: 0 0 3mm 0;
      color: #7f5c00;
      font-size: 8px;
      letter-spacing: 0.20em;
      text-transform: uppercase;
      font-weight: 900;
    }

    .info-card h3 {
      margin: 0 0 4mm 0;
      font-size: 16px;
      line-height: 1.15;
      text-transform: uppercase;
    }

    .info-card p {
      margin: 0 0 1.6mm 0;
      color: #444;
      font-size: 10px;
      line-height: 1.3;
    }

    .client-card {
      text-align: right;
      border-left: 1px solid rgba(21, 21, 21, 0.10);
      border-right: 3px solid #f3af00;
    }

    .table-section {
      margin-top: 9mm;
    }

    .table-title-row {
      display: flex;
      align-items: end;
      justify-content: space-between;
      margin-bottom: 4mm;
    }

    .table-title-row h3 {
      margin: 0;
      font-size: 17px;
      text-transform: uppercase;
      letter-spacing: -0.02em;
    }

    .page-note {
      margin: 0;
      color: #766b57;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      background: #fff;
      border: 1px solid rgba(21, 21, 21, 0.16);
    }

    th {
      background: #151515;
      color: #f3af00;
      padding: 4mm 3mm;
      font-size: 8px;
      line-height: 1.2;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      text-align: left;
      border-right: 1px solid rgba(255, 255, 255, 0.10);
    }

    th:nth-child(1),
    td:nth-child(1) {
      width: 22%;
    }

    th:nth-child(2),
    td:nth-child(2) {
      width: 36%;
    }

    th:nth-child(3),
    td:nth-child(3) {
      width: 8%;
      text-align: center;
    }

    th:nth-child(4),
    td:nth-child(4),
    th:nth-child(5),
    td:nth-child(5) {
      width: 17%;
      text-align: right;
    }

    td {
      padding: 4mm 3mm;
      vertical-align: top;
      border-bottom: 1px solid rgba(21, 21, 21, 0.10);
      border-right: 1px solid rgba(21, 21, 21, 0.08);
      font-size: 10px;
      line-height: 1.35;
    }

    tr:nth-child(even) td {
      background: #fbfaf7;
    }

    .service-name {
      font-weight: 800;
      color: #191919;
    }

    .description {
      color: #555;
    }

    .quantity {
      color: #222;
      font-weight: 700;
    }

    .money {
      white-space: nowrap;
      color: #222;
    }

    .money.strong {
      font-weight: 900;
    }

    .summary-section {
      margin-top: 8mm;
      display: grid;
      grid-template-columns: 1fr 72mm;
      gap: 7mm;
      align-items: stretch;
    }

    .notes-box {
      background: #efe8d9;
      border: 1px solid rgba(21, 21, 21, 0.10);
      padding: 5mm;
    }

    .notes-box p:last-child {
      margin: 0;
      font-size: 9.5px;
      color: #4a4235;
      line-height: 1.45;
    }

    .summary-box {
      background: #151515;
      color: #ffffff;
      padding: 6mm;
      border-top: 3px solid #f3af00;
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      gap: 6mm;
      font-size: 10px;
      margin-bottom: 3mm;
    }

    .summary-line span {
      color: #c9c4b9;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 8px;
      font-weight: 800;
    }

    .summary-line strong {
      color: #ffffff;
      font-size: 11px;
    }

    .summary-line.muted strong {
      color: #c9c4b9;
    }

    .summary-divider {
      height: 1px;
      background: rgba(243, 175, 0, 0.45);
      margin: 4mm 0;
    }

    .summary-line.total {
      align-items: baseline;
      margin-bottom: 4mm;
    }

    .summary-line.total span {
      color: #f3af00;
      font-size: 10px;
    }

    .summary-line.total strong {
      color: #f3af00;
      font-size: 20px;
      letter-spacing: -0.04em;
    }

    .summary-line.down-payment {
      padding-top: 4mm;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      margin-bottom: 0;
    }

    .document-footer {
      position: absolute;
      left: 18mm;
      right: 18mm;
      bottom: 12mm;
      display: flex;
      justify-content: space-between;
      gap: 6mm;
      font-size: 8px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding-top: 4mm;
    }

    .document-footer.light {
      color: #6f6656;
      border-top: 1px solid rgba(21, 21, 21, 0.16);
    }

    .payment-page {
      padding: 18mm;
    }

    .payment-inner {
      position: relative;
      z-index: 1;
      height: 100%;
      border: 1px solid rgba(243, 175, 0, 0.28);
      padding: 12mm;
      display: flex;
      flex-direction: column;
    }

    .payment-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 8mm;
      border-bottom: 1px solid rgba(243, 175, 0, 0.24);
    }

    .payment-logo {
      width: 42mm;
      height: auto;
      object-fit: contain;
    }

    .payment-title {
      margin: 0;
      color: #f3af00;
      text-align: right;
      font-size: 36px;
      line-height: 1.02;
      letter-spacing: -0.04em;
      text-transform: uppercase;
    }

    .payment-methods {
      margin-top: 14mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7mm;
    }

    .payment-card {
      position: relative;
      min-height: 50mm;
      padding: 7mm;
      background: rgba(255, 255, 255, 0.045);
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-left: 3px solid #f3af00;
    }

    .payment-number {
      position: absolute;
      right: 5mm;
      top: 4mm;
      color: rgba(243, 175, 0, 0.20);
      font-size: 34px;
      line-height: 1;
      font-weight: 900;
    }

    .payment-card h3 {
      position: relative;
      margin: 0 0 5mm 0;
      color: #ffffff;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      padding-right: 18mm;
    }

    .payment-card p,
    .payment-card li {
      margin: 0 0 2mm 0;
      color: #c9c4b9;
      font-size: 10.5px;
      line-height: 1.45;
    }

    .payment-card strong {
      color: #f3af00;
      font-weight: 900;
    }

    .bank-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm 5mm;
    }

    .bank-grid span {
      display: block;
      color: #8e887f;
      font-size: 7px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin-bottom: 1mm;
      font-weight: 900;
    }

    .signature-box {
      margin-top: auto;
      margin-left: auto;
      width: 78mm;
      text-align: right;
      padding-top: 6mm;
      border-top: 1px solid rgba(243, 175, 0, 0.32);
    }

    .signature-box p {
      margin: 0 0 2mm 0;
      color: #c9c4b9;
      font-size: 10px;
    }

    .signature-box strong {
      display: block;
      color: #f3af00;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .payment-footer {
      margin-top: 8mm;
      display: flex;
      justify-content: space-between;
      color: #8e887f;
      font-size: 8px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 5mm;
    }
  </style>
</head>

<body>
  <section class="page cover-page">
    <div class="cover-frame">
      <div class="cover-top">
        <img class="cover-logo" src="${logoDataUrl}" alt="Carambolo Studio" />

        <div class="proposal-number">
          Proposta
          <strong>${escapeHtml(proposal.proposal_number ?? "")}</strong>
        </div>
      </div>

      <main class="cover-main">
        <div class="gold-line"></div>

        <h1 class="cover-title">
          Proposta<br />
          de Orçamento
        </h1>

        <div class="cover-year">${issueYear}</div>

        <div class="client-strip">
          <span>Cliente</span>
          <strong>${escapeHtml(client.name)}</strong>
        </div>
      </main>

      <footer class="cover-footer">
        <span>${escapeHtml(company.instagram)}</span>
        <span>${escapeHtml(company.phone)}</span>
        <span>${escapeHtml(company.email)}</span>
      </footer>
    </div>
  </section>

  ${budgetPages}

  <section class="page payment-page">
    <div class="payment-inner">
      <header class="payment-header">
        <img class="payment-logo" src="${logoDataUrl}" alt="Carambolo Studio" />
        <h2 class="payment-title">
          Formas de<br />
          Pagamento
        </h2>
      </header>

      <main class="payment-methods">
        <article class="payment-card">
          <div class="payment-number">01</div>
          <h3>Cartão de Crédito</h3>
          <p>Pagamento em até <strong>12x</strong>, com juros da operadora por conta do cliente.</p>
        </article>

        <article class="payment-card">
          <div class="payment-number">02</div>
          <h3>Condição de Agendamento</h3>
          <p>Pagamento de <strong>50%</strong> para reserva e agendamento das datas.</p>
          <p>O restante será pago na conclusão do serviço.</p>
        </article>

        <article class="payment-card">
          <div class="payment-number">03</div>
          <h3>Pix</h3>
          <p>Chave Pix:</p>
          <p><strong>${escapeHtml(company.pixKey)}</strong></p>
        </article>

        <article class="payment-card">
          <div class="payment-number">04</div>
          <h3>Transferência Bancária</h3>

          <div class="bank-grid">
            <p>
              <span>Banco</span>
              ${escapeHtml(company.bank)}
            </p>

            <p>
              <span>Titular</span>
              ${escapeHtml(company.bankHolder)}
            </p>

            <p>
              <span>Agência</span>
              ${escapeHtml(company.bankAgency)}
            </p>

            <p>
              <span>Conta</span>
              ${escapeHtml(company.bankAccount)}
            </p>
          </div>
        </article>
      </main>

      <section class="signature-box">
        <p>${escapeHtml(company.city)}, ${issueDate}</p>
        <strong>${escapeHtml(company.responsibleName)}</strong>
      </section>

      <footer class="payment-footer">
        <span>${escapeHtml(company.instagram)}</span>
        <span>${escapeHtml(company.phone)}</span>
        <span>${escapeHtml(company.email)}</span>
      </footer>
    </div>
  </section>
</body>
</html>
`;
}

app.get("/health", async () => {
  return { ok: true };
});

app.post("/proposals/:id/generate-pdf", async (request, reply) => {
  app.log.info("USANDO TEMPLATE NOVO CARAMBOLO PDF V2");

  const { id } = request.params as { id: string };

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    app.log.info({ proposalId: id }, "Iniciando geração de PDF");

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .single();

    if (proposalError || !proposal) {
      app.log.error({ proposalError }, "Proposta não encontrada");
      return reply.status(404).send({ error: "Proposta não encontrada." });
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", proposal.client_id)
      .single();

    if (clientError || !client) {
      app.log.error({ clientError }, "Cliente não encontrado");
      return reply.status(404).send({ error: "Cliente não encontrado." });
    }

    const { data: items, error: itemsError } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", id)
      .order("sort_order");

    if (itemsError) {
      app.log.error({ itemsError }, "Erro ao buscar itens");
      return reply.status(500).send({ error: "Erro ao buscar itens." });
    }

    if (!items || items.length === 0) {
      return reply.status(400).send({
        error:
          "Esta proposta não possui itens. Adicione serviços antes de gerar o PDF.",
      });
    }

    const html = buildProposalHtml({
      proposal,
      client,
      items,
    });

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    const safeProposalNumber = String(proposal.proposal_number ?? id).replace(
      /[^a-zA-Z0-9-_]/g,
      "-",
    );

    const generatedAt = new Date().toISOString().replace(/[:.]/g, "-");

    const fileName = `proposta-${safeProposalNumber}-${generatedAt}.pdf`;

    const bucketName = "proposal-pdfs";

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      app.log.error({ uploadError }, "Erro ao salvar PDF no Storage");
      return reply.status(500).send({
        error: `Erro ao salvar PDF no Supabase Storage: ${uploadError.message}`,
      });
    }

    const signedUrlExpiresInSeconds = 60 * 60 * 24 * 7;

    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from(bucketName)
        .createSignedUrl(fileName, signedUrlExpiresInSeconds);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      app.log.error({ signedUrlError }, "Erro ao gerar link assinado do PDF");

      return reply.status(500).send({
        error:
          signedUrlError?.message ??
          "PDF salvo, mas houve erro ao gerar o link privado de acesso.",
      });
    }

    const { error: fileRecordError } = await supabase
      .from("proposal_files")
      .insert({
        proposal_id: id,
        file_url: signedUrlData.signedUrl,
        file_name: fileName,
      });

    if (fileRecordError) {
      app.log.error(
        { fileRecordError },
        "PDF gerado, mas houve erro ao registrar arquivo",
      );
    }

    app.log.info(
      {
        proposalId: id,
        fileName,
        signedUrlExpiresInSeconds,
      },
      "PDF gerado com sucesso",
    );

    return {
      fileName,
      fileUrl: signedUrlData.signedUrl,
      expiresInSeconds: signedUrlExpiresInSeconds,
    };
  } catch (error) {
    app.log.error({ error }, "Erro inesperado ao gerar PDF");

    return reply.status(500).send({
      error:
        error instanceof Error
          ? `Erro interno ao gerar PDF: ${error.message}`
          : "Erro interno ao gerar PDF.",
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function getDaysBetweenIsoDates(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const diffInMilliseconds = end.getTime() - start.getTime();
  const diffInDays = Math.round(diffInMilliseconds / (1000 * 60 * 60 * 24));

  return diffInDays > 0 ? diffInDays : null;
}

function buildDuplicatedProposalNumber() {
  const year = new Date().getFullYear();
  return `CAR-${year}-${Date.now()}`;
}

app.post("/proposals/:id/duplicate", async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    app.log.info({ proposalId: id }, "Iniciando duplicação de proposta");

    const { data: originalProposal, error: proposalError } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .single();

    if (proposalError || !originalProposal) {
      app.log.error({ proposalError }, "Proposta original não encontrada");
      return reply.status(404).send({
        error: "Proposta original não encontrada.",
      });
    }

    const { data: originalItems, error: itemsError } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", id)
      .order("sort_order");

    if (itemsError) {
      app.log.error({ itemsError }, "Erro ao buscar itens da proposta original");
      return reply.status(500).send({
        error: "Erro ao buscar itens da proposta original.",
      });
    }

    if (!originalItems || originalItems.length === 0) {
      return reply.status(400).send({
        error:
          "Não é possível duplicar uma proposta sem itens. Adicione serviços antes de duplicar.",
      });
    }

    const today = getTodayIsoDate();

    const validityDays = getDaysBetweenIsoDates(
      originalProposal.issue_date,
      originalProposal.valid_until,
    );

    const duplicatedValidUntil =
      validityDays !== null ? addDaysToIsoDate(today, validityDays) : null;

    const duplicatedProposalNumber = buildDuplicatedProposalNumber();

    const { data: duplicatedProposal, error: duplicatedProposalError } =
      await supabase
        .from("proposals")
        .insert({
          proposal_number: duplicatedProposalNumber,
          client_id: originalProposal.client_id,
          title: originalProposal.title ?? "Proposta de Orçamento",
          issue_date: today,
          valid_until: duplicatedValidUntil,
          status: "draft",
          subtotal: originalProposal.subtotal,
          discount_type: originalProposal.discount_type,
          discount_value: originalProposal.discount_value,
          total: originalProposal.total,
          down_payment: originalProposal.down_payment,
          notes: originalProposal.notes,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

    if (duplicatedProposalError || !duplicatedProposal) {
      app.log.error(
        { duplicatedProposalError },
        "Erro ao criar proposta duplicada",
      );

      return reply.status(500).send({
        error:
          duplicatedProposalError?.message ??
          "Erro ao criar proposta duplicada.",
      });
    }

    const duplicatedItems = originalItems.map((item: any, index: number) => ({
      proposal_id: duplicatedProposal.id,
      service_id: item.service_id,
      service_name: item.service_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      sort_order: item.sort_order ?? index,
    }));

    const { error: duplicatedItemsError } = await supabase
      .from("proposal_items")
      .insert(duplicatedItems);

    if (duplicatedItemsError) {
      app.log.error(
        { duplicatedItemsError },
        "Erro ao criar itens da proposta duplicada",
      );

      await supabase.from("proposals").delete().eq("id", duplicatedProposal.id);

      return reply.status(500).send({
        error:
          duplicatedItemsError.message ??
          "Erro ao criar itens da proposta duplicada.",
      });
    }

    app.log.info(
      {
        originalProposalId: id,
        duplicatedProposalId: duplicatedProposal.id,
        duplicatedProposalNumber,
      },
      "Proposta duplicada com sucesso",
    );

    return {
      proposal: duplicatedProposal,
      itemsCount: duplicatedItems.length,
    };
  } catch (error) {
    app.log.error({ error }, "Erro inesperado ao duplicar proposta");

    return reply.status(500).send({
      error:
        error instanceof Error
          ? `Erro interno ao duplicar proposta: ${error.message}`
          : "Erro interno ao duplicar proposta.",
    });
  }
});

const port = Number(process.env.PORT ?? 3333);

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});