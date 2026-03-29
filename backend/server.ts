import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// 1. Criação do Webhook (Recebimento de Mensagens)
app.post("/api/webhooks/whatsapp", (req, res) => {
  console.log("\n=======================================================");
  console.log("📞 [WEBHOOK WHATSAPP] Nova Mensagem Recebida");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Payload/Body:", JSON.stringify(req.body, null, 2));
  
  const { messages, contacts } = req.body;
  
  if (messages && messages.length > 0) {
    const msg = messages[0];
    const from = msg.from || contacts?.[0]?.wa_id || "Desconhecido";
    const body = msg.text?.body || msg.type || "Conteúdo não textual";
    
    console.log(`\n💬 Nova mensagem de [${from}]: "${body}"`);
    console.log(`💾 Simulando salvamento da mensagem no banco de dados (Supabase/Postgres)...`);
    console.log(`🔗 Simulando vínculo da mensagem ao Lead/Contato correspondente no pipeline.`);
  } else {
    console.log(`\n⚠️ O formato do payload recebido não contém 'messages' no padrão genérico/Meta.`);
  }

  console.log("=======================================================\n");
  
  // O provedor de WhatsApp (Meta, Z-API, Evolution) exige um "status 200" rápido
  res.status(200).send("Webhook recebido com sucesso");
});

// Endpoint Genérico / Mock de Envio de Mensagem (Recebe chamadas da UI / whatsapp.service.ts)
app.post("/api/whatsapp/send", (req, res) => {
  const { number, text } = req.body;
  console.log(`\n📤 [API DE ENVIO WHATSAPP] Solicitação processada pelo backend!`);
  console.log(`Destinatário: ${number}`);
  console.log(`Mensagem: "${text}"`);
  console.log(`Status de envio da operadora: Success.`);
  
  // Retorna o sucesso para que o Front-End dê a resposta no Inbox
  res.status(200).json({ success: true, id: `msg_${Date.now()}` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de Webhooks e Integrações UPixel ativo na porta ${PORT}`);
  console.log(`Rotas cadastradas:`);
  console.log(` - GET/POST /api/webhooks/whatsapp  (Webhook Recebimento)`);
  console.log(` - POST     /api/whatsapp/send      (Endpoint Serviço Envio)`);
});
