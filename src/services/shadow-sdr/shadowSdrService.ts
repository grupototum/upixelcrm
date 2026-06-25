import { AlexandriaShadowSdrAdapter } from "./alexandriaAdapter";
import { mockShadowSdrAdapter } from "./mockShadowSdrAdapter";
import type {
  ShadowSdrAdapter,
  ShadowSdrAnalysis,
  ShadowSdrConversationInput,
} from "@/types/shadow-sdr";

function getAdapter(): ShadowSdrAdapter {
  const endpoint = import.meta.env.VITE_ALEXANDRIA_SHADOW_SDR_ENDPOINT as string | undefined;

  if (endpoint) {
    return new AlexandriaShadowSdrAdapter(endpoint);
  }

  return mockShadowSdrAdapter;
}

export async function analyzeShadowSdr(input: ShadowSdrConversationInput): Promise<ShadowSdrAnalysis> {
  const adapter = getAdapter();
  return adapter.analyze(input);
}
