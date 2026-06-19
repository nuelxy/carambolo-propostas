import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: true,
});

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Variáveis do Supabase não configuradas no backend.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function formatCurrency(value: number) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildProposalHtml(payload: any) {
  const { proposal, client, items } = payload;

  const year = new Date(proposal.issue_date).getFullYear();

  const rows = items
    .map(
      (item: any) => `
      <tr>
        <td>${item.service_name}</td>
        <td>${item.description}</td>
        <td class="center">${Number(item.quantity)}</td>
        <td class="right">${formatCurrency(item.unit_price)}</td>
      </tr>
    `,
    )
    .join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      color: #111;
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 22mm;
      page-break-after: always;
      position: relative;
    }

    .cover {
      background: #1f1f1f;
      color: white;
      border-top: 18mm solid #f6aa00;
      border-bottom: 18mm solid #f6aa00;
    }

    .logo-box {
      width: 90px;
      height: 90px;
      background: #f6aa00;
      color: #111;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      border-radius: 14px;
    }

    .cover-title {
      margin-top: 90mm;
      font-size: 42px;
      line-height: 1;
      font-weight: 900;
      text-transform: uppercase;
    }

    .cover-year {
      margin-top: 10px;
      font-size: 36px;
      letter-spacing: 6px;
    }

    .cover-client {
      margin-top: 12px;
      border-top: 2px solid white;
      padding-top: 8px;
      text-transform: uppercase;
      letter-spacing: 5px;
      font-size: 14px;
    }

    .header {
      text-align: center;
    }

    .brand {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: 4px;
      text-transform: uppercase;
    }

    .info-grid {
      margin-top: 28mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24mm;
      font-size: 13px;
    }

    .label {
      color: #f6aa00;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    table {
      width: 100%;
      margin-top: 28mm;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12px;
    }

    th {
      background: #f6aa00;
      color: #111;
      padding: 12px;
      text-transform: uppercase;
      border: 1px solid #ddd;
    }

    td {
      padding: 12px;
      border: 1px solid #ddd;
      vertical-align: middle;
      background: #f7f7f7;
    }

    th:nth-child(1), td:nth-child(1) {
      width: 28%;
    }

    th:nth-child(2), td:nth-child(2) {
      width: 38%;
    }

    th:nth-child(3), td:nth-child(3) {
      width: 12%;
    }

    th:nth-child(4), td:nth-child(4) {
      width: 22%;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .total-box {
      margin-top: 22mm;
      margin-left: auto;
      width: 85mm;
      background: #f2f2f2;
      padding: 12px;
      text-align: right;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 2px;
    }

    .footer {
      position: absolute;
      left: 22mm;
      right: 22mm;
      bottom: 14mm;
      display: flex;
      justify-content: space-between;
      border-top: 3px solid #f6aa00;
      padding-top: 10px;
      font-size: 12px;
    }

    .payment {
      background: #1f1f1f;
      color: white;
      border-top: 18mm solid #f6aa00;
      border-bottom: 18mm solid #f6aa00;
    }

    .payment-title {
      text-align: right;
      font-size: 42px;
      font-weight: 900;
      line-height: 1.15;
    }

    .payment-grid {
      margin-top: 55mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24mm;
      font-size: 14px;
    }

    .payment-item {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 16px;
      align-items: start;
    }

    .number {
      width: 48px;
      height: 48px;
      border-radius: 999px;
      background: #f6aa00;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 20px;
    }

    .signature {
      position: absolute;
      bottom: 40mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <section class="page cover">
    <div class="logo-box">CS</div>
    <div class="cover-title">
      Proposta<br />
      de Orçamento
    </div>
    <div class="cover-year">${year}</div>
    <div class="cover-client">${client.name}</div>
  </section>

  <section class="page">
    <div class="header">
      <div class="logo-box" style="margin: 0 auto 16px auto;">CS</div>
      <div class="brand">Carambolo Studio</div>
    </div>

    <div class="info-grid">
      <div>
        <p><strong>DATA:</strong> ${new Date(proposal.issue_date).toLocaleDateString("pt-BR")}</p>
        <p class="label">Carambolo Studio</p>
        <p>CNPJ 47.226.752/0001-39</p>
        <p>(86) 99994-7314</p>
        <p>carambolostudio@gmail.com</p>
        <p>@carambolostudio</p>
      </div>

      <div style="text-align: right;">
        <p class="label">Cliente:</p>
        <p>${client.name}</p>
        <p>${client.city ?? ""} ${client.state ?? ""}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Serviço</th>
          <th>Descrição</th>
          <th>QNT</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="total-box">
      CUSTO TOTAL: ${formatCurrency(proposal.total)}
    </div>

    <div class="footer">
      <span>(86) 99994-7314</span>
      <span>carambolostudio@gmail.com</span>
      <span>@carambolostudio</span>
    </div>
  </section>

  <section class="page payment">
    <div class="logo-box">CS</div>

    <div class="payment-title">
      Formas de<br />
      Pagamento
    </div>

    <div class="payment-grid">
      <div class="payment-item">
        <div class="number">01</div>
        <div>Pagamento da proposta deverá ser realizado 50% para o agendamento das datas e o restante na conclusão do serviço.</div>
      </div>

      <div class="payment-item">
        <div class="number">02</div>
        <div>Cartão de Crédito em até 12x com juros da operadora por conta do Cliente.</div>
      </div>

      <div class="payment-item">
        <div class="number">03</div>
        <div>Pagamento através de Pix<br />Chave: carambolostudio@gmail.com</div>
      </div>

      <div class="payment-item">
        <div class="number">04</div>
        <div>Transferência Bancária<br />BANCO DO BRASIL<br />DIEGO PEREIRA DE OLIVEIRA<br />AG: 3178-0<br />CC: 121451-9</div>
      </div>
    </div>

    <div class="signature">
      Teresina, ${new Date(proposal.issue_date).toLocaleDateString("pt-BR")}<br />
      DIEGO PEREIRA DE OLIVEIRA
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
  const { id } = request.params as { id: string };

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (proposalError || !proposal) {
    return reply.status(404).send({ error: "Proposta não encontrada." });
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", proposal.client_id)
    .single();

  if (clientError || !client) {
    return reply.status(404).send({ error: "Cliente não encontrado." });
  }

  const { data: items, error: itemsError } = await supabase
    .from("proposal_items")
    .select("*")
    .eq("proposal_id", id)
    .order("sort_order");

  if (itemsError) {
    return reply.status(500).send({ error: "Erro ao buscar itens." });
  }

  const html = buildProposalHtml({
    proposal,
    client,
    items: items ?? [],
  });

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  const fileName = `proposta-${proposal.proposal_number ?? id}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("proposal-pdfs")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error(uploadError);
    return reply.status(500).send({ error: "Erro ao salvar PDF." });
  }

  const { data: publicUrlData } = supabase.storage
    .from("proposal-pdfs")
    .getPublicUrl(fileName);

  await supabase.from("proposal_files").insert({
    proposal_id: id,
    file_url: publicUrlData.publicUrl,
    file_name: fileName,
  });

  return {
    fileName,
    fileUrl: publicUrlData.publicUrl,
  };
});

app.listen({ port: Number(process.env.PORT ?? 3333), host: "0.0.0.0" });