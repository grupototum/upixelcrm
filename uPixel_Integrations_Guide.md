# Guia Oficial de Integrações uPixel CRM

Este manual instrui passo a passo como realizar a **Conexão Real (Ambiente de Produção)** das plataformas de WhatsApp e Google Services ao uPixel CRM, abandonando o modo de simulação (Mock).

---

## 1. Integração com WhatsApp (Evolution API / Baileys)

Para que o CRM seja capaz de realizar atendimentos via código, ler QRCodes reais e disparar Automações de mensagens do funil, é recomendado o uso da **Evolution API v2**. Ela atua como um tradutor entre o WhatsApp e nosso sistema REST.

### Pré-requisitos
* Um servidor em Nuvem rodando NodeJS (Digital Ocean, AWS, Hetzner, etc) ou plataforma gerenciada tipo Render/Koyeb.
* Acesso DNS para mapear um subdomínio (ex: `api-wp.suaempresa.com.br`).
* Uma Instância do **Evolution API**.

### Passo a Passo da Infraestrutura
1. **Instalando a Evolution API:**
   Utilize o Docker para levantar a API no seu servidor VPS. Você pode usar uma imagem do Ubuntu e rodar usando os pacotes oficiais. *(Ref: [Documentação V2](https://doc.evolution-api.com/v2))*
   
2. **Definindo a `Global API Key` e CORS:**
   Configure a Evolution API para aceitar requisições externas do seu site do CRM. 
   Configure o `.env` da Evolution contendo o domínio do CRM de front-end `CORS_ORIGIN="https://crm.suaempresa.com.br"` (ou `*` temporariamente para Dev). E defina a sua `AUTHENTICATION_API_KEY`.

3. **Injetando Credenciais no uPixel:**
   * Acesse no uPixel a página `/whatsapp`.
   * Clique em "Configurações de Credenciais" ou Ícone de Configuração.
   * Insira a URL do seu subdomínio Evo API e cole a Chave de Autenticação configurada no `.env` do servidor.
   * O frontend gerará os QR Codes consultando `https://[SUA_URL]/instance/connectionState/upixel-instance` e te entregará o *pairing* legítimo com base64.

---

## 2. Integração com Google Services (Gmail, Calendar e Drive)

Para manipular os eventos de contato e ler os e-mails, o CRM necessita aprovação do cliente. Devido a rígidos preceitos de segurança web, isso não pode e as chaves não devem ficar armazenadas puramente em código Javascript em texto livre sem intermédio (*CORS policy*). O método formal é o "Google OAuth 2.0 Web Client".

### Passo a Passo no Google Cloud
1. **Ativando as APIs da Google Workspace:**
   Vá ao [Google Cloud Console](https://console.cloud.google.com).
   Crie um projeto `"uPixel CRM"`.
   Acesse *APIs e Serviços -> Biblioteca* e habilite as seguintes 3 APIs:
   * **Gmail API**
   * **Google Calendar API**
   * **Google Drive API**

2. **Tela de Consentimento OAuth (OAuth Consent Screen):**
   * Preencha como uso externo ou interno (se o app for só seu).
   * Adicione os domínios do sistema nos *domínios autorizados*.
   * Adicione aos Escopos (Scopes) solicitados ao menos: `.../auth/gmail.readonly` e `.../auth/calendar`.

3. **Gerando as Credenciais OAuth Client ID:**
   Acesse a seção de *Credenciais* -> "Criar Credencial" -> **ID do cliente OAuth**.
   * Escolha "Aplicativo da Web".
   * Origens JavaScript Autorizadas: Coloque a URL principal do seu site do uPixel (ex: `https://app.upixel.com.br`).
   * URIs de redirecionamento Autorizados (Caso use backend/Supabase): `https://SUPABASEREFID.supabase.co/auth/v1/callback`.

4. **Injetando Credenciais no uPixel:**
   * Após a configuração acima, o Google criará um **Client ID** alfanumérico.
   * Cole esse código nas Preferências da Conta do *Config de Integrações* (Ou configure como provedor de Auth direto no painel do Supabase da rede).
   * A tela de "Google" do CRM abrirá a janela *Pop-up Oficial do Google Login* listando essas permissões que você marcou em Nuvem. O *Access Token* recebido deve ser gravado para uso seguro das caixas locais.
