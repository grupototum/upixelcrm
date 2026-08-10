/**
 * Declaração mínima para "canvas-confetti" (o pacote não traz types e
 * @types/canvas-confetti não está instalado). Cobre as opções usadas no app.
 */
declare module "canvas-confetti" {
  export interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  export interface ConfettiFunction {
    (options?: ConfettiOptions): Promise<null> | null;
    reset(): void;
  }

  const confetti: ConfettiFunction;
  export default confetti;
}
