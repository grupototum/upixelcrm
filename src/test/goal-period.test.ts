import { describe, it, expect } from "vitest";
import { addDays, differenceInDays } from "date-fns";
import { trendFor, calculatePace, getPeriodRange } from "@/lib/goal-period";

describe("trendFor", () => {
  it("classifica por faixa de percentual (PRD §3.4)", () => {
    expect(trendFor(150)).toBe("achieved");
    expect(trendFor(100)).toBe("achieved");
    expect(trendFor(99)).toBe("on_track");
    expect(trendFor(80)).toBe("on_track");
    expect(trendFor(79)).toBe("at_risk");
    expect(trendFor(50)).toBe("at_risk");
    expect(trendFor(49)).toBe("behind");
    expect(trendFor(0)).toBe("behind");
  });
});

describe("calculatePace", () => {
  const today = new Date();

  it("meta atingida quando current >= target", () => {
    const msg = calculatePace(
      { current_value: 10, period_start: addDays(today, -10).toISOString(), period_end: addDays(today, 10).toISOString() },
      10
    );
    expect(msg).toBe("Meta atingida! 🎉");
  });

  it("no ritmo quando a taxa atual já cobre o necessário", () => {
    // Já fez 15 de 20 aos 10 dias (taxa 1.5/dia); faltam só 5 em ~10 dias
    // (0.5/dia) — folga grande o bastante pra não depender de arredondamento
    // de dia entre period_start/period_end (fixos) e "agora" (variável).
    const msg = calculatePace(
      { current_value: 15, period_start: addDays(today, -10).toISOString(), period_end: addDays(today, 10).toISOString() },
      20
    );
    expect(msg).toBe("No ritmo — continue assim!");
  });

  it("atrasado com mais de 7 dias restantes sugere ritmo semanal", () => {
    // 1 decorrido, 0 no valor -> precisa de muito mais que a taxa atual, 20 dias restantes
    const msg = calculatePace(
      { current_value: 0, period_start: addDays(today, -1).toISOString(), period_end: addDays(today, 20).toISOString() },
      21
    );
    expect(msg).toMatch(/por semana/);
  });

  it("atrasado com menos de 7 dias restantes sugere prazo em dias", () => {
    const periodEnd = addDays(today, 3);
    const daysLeft = differenceInDays(periodEnd, new Date());
    const msg = calculatePace(
      { current_value: 0, period_start: addDays(today, -25).toISOString(), period_end: periodEnd.toISOString() },
      10
    );
    expect(msg).toBe(`Precisa de +10 nos próximos ${daysLeft} dias`);
  });
});

describe("getPeriodRange", () => {
  it("offset 0 cobre a data de hoje", () => {
    const { start, end } = getPeriodRange("daily", 0);
    const now = new Date();
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(end.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it("offset negativo desloca pro passado", () => {
    const current = getPeriodRange("monthly", 0);
    const previous = getPeriodRange("monthly", -1);
    expect(previous.end.getTime()).toBeLessThan(current.start.getTime());
  });
});
