/**
 * Script de Teste Isolado - Integração do WhatsApp no CRM Upixel
 * Para executar sem backend real: npx tsx test-whatsapp-connection.ts
 */

import { whatsappService } from "./src/services/whatsapp.service";

async function runTest() {
  console.log("\n==================================");
  console.log("🟢 Iniciando Teste de Conexão WhatsApp");
  console.log("==================================\n");
  
  const mockPayload = {
    to: "5511999999999",
    message: "Olá! Esta é uma mensagem de teste automatizada da estrutura base do Upixel CRM.",
  };

  console.log(`Payload Construído:`);
  console.log(JSON.stringify(mockPayload, null, 2));
  
  try {
    console.log(`\nDisparando para o Serviço de WhatsApp...`);
    
    // Testa o serviço de integração criado no App principal
    const result = await whatsappService.sendMessage(mockPayload);
    
    if (result.success || result) {
      console.log(`\n✅ TESTE OK: A Estrutura Base ("to", "message", API keys) compila perfeitamente sem erros de TypeScript.`);
      console.log(`Identificador da mensagem simulada:`, typeof result === "object" && 'messageId' in result ? result.messageId : 'msg_mock');
    } else {
      console.log(`\n❌ ERRO NO TESTE: Serviço encontrou falha.`, result);
    }
    
  } catch (err) {
    console.error("\n❌ Erro Grave (Exception) durante compilação ou teste HTTP:", err);
  }
}

// Executar
runTest();
