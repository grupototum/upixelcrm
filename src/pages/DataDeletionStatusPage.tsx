// Página de confirmação de status de exclusão de dados.
// O Meta Data Deletion Callback responde com uma URL pra cá + confirmation_code,
// pra o usuário verificar o andamento da remoção dos seus dados.

import { useState, useEffect } from "react";
import upixelDark from "@/assets/upixel_dark.png";

export default function DataDeletionStatusPage() {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) {
      setCode(c);
      setSubmitted(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fffefb] text-[#201515] py-10 px-4">
      <div className="max-w-xl mx-auto">
        <a href="/" className="inline-block mb-8">
          <img src={upixelDark} alt="uPixel" className="h-8" />
        </a>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Status da Exclusão de Dados</h1>
        <p className="text-sm text-gray-500 mb-8">
          Acompanhe o status de uma solicitação de exclusão de dados Meta no uPixel.
        </p>

        {!submitted ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) setSubmitted(true);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-semibold mb-1">Código de confirmação</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: del_abc123..."
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                O código aparece no Meta Business Manager quando você solicita exclusão dos seus dados.
              </p>
            </div>
            <button
              type="submit"
              className="bg-[#201515] text-white px-5 py-2 rounded-md font-semibold hover:opacity-90"
            >
              Verificar status
            </button>
          </form>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <div>
                <p className="text-base font-bold">Solicitação recebida</p>
                <p className="text-xs text-gray-500">Código: <code className="bg-gray-100 px-1 rounded">{code}</code></p>
              </div>
            </div>

            <div className="text-sm space-y-2 text-gray-700">
              <p>
                Sua solicitação de exclusão de dados Meta foi recebida pelo uPixel e está sendo processada.
              </p>
              <p>
                <strong>O que será removido:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Tokens de acesso Meta (Facebook, WhatsApp, Instagram, Ads)</li>
                <li>Integrações conectadas com o ID do usuário Meta solicitante</li>
                <li>Mensagens, conversas e mídia associadas a integrações Meta deste usuário</li>
                <li>Logs de webhooks relacionados</li>
              </ul>
              <p className="mt-3">
                <strong>Prazo:</strong> até 24 horas após confirmação.
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Em caso de dúvida, entre em contato em{" "}
                <a href="mailto:grupototumadm@gmail.com" className="text-[#ff4f00] underline">
                  grupototumadm@gmail.com
                </a>{" "}
                informando este código.
              </p>
            </div>
          </div>
        )}

        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500">
          © 2026 uPixel CRM — <a href="/" className="text-[#ff4f00] underline">Voltar para o site</a>
          {" · "}
          <a href="/privacy-policy" className="text-[#ff4f00] underline">Política de Privacidade</a>
        </footer>
      </div>
    </div>
  );
}
