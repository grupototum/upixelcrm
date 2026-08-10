import type {
  ShadowSdrAdapter,
  ShadowSdrAnalysis,
  ShadowSdrConversationInput,
} from "@/types/shadow-sdr";

export class AlexandriaShadowSdrAdapter implements ShadowSdrAdapter {
  constructor(private readonly endpoint?: string) {}

  async analyze(input: ShadowSdrConversationInput): Promise<ShadowSdrAnalysis> {
    if (!this.endpoint) {
      throw new Error("Endpoint Alexandria nao configurado para modo sombra.");
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "sdr_shadow",
        agent: "davi",
        input,
      }),
    });

    if (!response.ok) {
      throw new Error(`Alexandria retornou HTTP ${response.status}`);
    }

    const data = (await response.json()) as ShadowSdrAnalysis;
    return {
      ...data,
      source: "alexandria",
      generatedAt: data.generatedAt || new Date().toISOString(),
    };
  }
}
