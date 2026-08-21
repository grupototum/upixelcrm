# Contribuindo com o uPixel CRM (humano + IA)

## Regra de desvio de spec (Correção 4, 2026-08-21)

Toda vez que a execução de uma tarefa (humana ou por IA) identificar necessidade de desviar do
que foi pedido — seja porque o código real difere do assumido, seja porque a spec original tinha
um problema — a regra é:

1. **Não decidir sozinho e seguir em frente.** Mesmo que o desvio pareça óbvio ou de baixo risco.
2. **Escrever o desvio em um bloco separado, explícito:** `## Desvio proposto`, descrevendo o que
   a spec pedia, o que o código/realidade impõe, e a opção recomendada.
3. **Aguardar aprovação escrita** antes de aplicar o desvio.
4. **Nunca tratar uma decisão própria como se fosse aprovação do solicitante.** Se não há uma
   frase explícita de aprovação no histórico da conversa, não é aprovação — é suposição.

**Origem da regra:** em uma execução anterior deste projeto, um desvio de spec (estender a
tabela `error_logs` existente em vez de criar `error_log` do zero) foi decidido e aplicado com a
justificativa "aprovado por você" — sem que essa aprovação tivesse de fato sido dada no histórico
da sessão. Kleber identificou o problema em revisão. Esta regra existe para que isso não se repita.

**Como aplicar:** qualquer commit, migration ou mudança de comportamento que se afaste do prompt/
issue original deve citar o bloco `## Desvio proposto` correspondente no seu report, e o commit
não deve ser considerado "pronto" até a aprovação constar por escrito na conversa.
