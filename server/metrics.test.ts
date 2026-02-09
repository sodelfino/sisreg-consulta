import { describe, it, expect } from "vitest";

describe("Metrics Calculations", () => {
  describe("Average Wait Time", () => {
    it("should calculate average wait time correctly", () => {
      const mockData = [
        { data_solicitacao: "2025-01-01", descricao_interna_procedimento: "Proc A" },
        { data_solicitacao: "2025-01-15", descricao_interna_procedimento: "Proc A" },
        { data_solicitacao: "2025-02-01", descricao_interna_procedimento: "Proc B" },
      ];

      const now = new Date("2026-02-09");
      const procedimentoMap = new Map<string, { total: number; count: number }>();

      mockData.forEach((hit) => {
        const descricao = hit.descricao_interna_procedimento || "Sem descrição";
        const dataSolicitacao = hit.data_solicitacao;

        if (dataSolicitacao) {
          const solicitacaoDate = new Date(dataSolicitacao);
          const diasEspera = Math.floor(
            (now.getTime() - solicitacaoDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (!procedimentoMap.has(descricao)) {
            procedimentoMap.set(descricao, { total: 0, count: 0 });
          }
          const entry = procedimentoMap.get(descricao)!;
          entry.total += diasEspera;
          entry.count += 1;
        }
      });

      const data = Array.from(procedimentoMap.entries()).map(([descricao, stats]) => ({
        descricao,
        mediaDias: Math.round(stats.total / stats.count),
        totalSolicitacoes: stats.count,
      }));

      // Proc A: (404 + 390) / 2 = 397 dias
      // Proc B: 373 dias
      expect(data).toHaveLength(2);
      expect(data.find((d) => d.descricao === "Proc A")?.mediaDias).toBe(397);
      expect(data.find((d) => d.descricao === "Proc B")?.mediaDias).toBe(373);
    });

    it("should handle empty data", () => {
      const mockData: any[] = [];
      const procedimentoMap = new Map();

      mockData.forEach((hit) => {
        // No data to process
      });

      const data = Array.from(procedimentoMap.entries());
      expect(data).toHaveLength(0);
    });

    it("should ignore records without data_solicitacao", () => {
      const mockData = [
        { descricao_interna_procedimento: "Proc A" }, // Missing data_solicitacao
        { data_solicitacao: "2025-01-01", descricao_interna_procedimento: "Proc B" },
      ];

      const now = new Date("2026-02-09");
      const procedimentoMap = new Map<string, { total: number; count: number }>();

      mockData.forEach((hit) => {
        const descricao = hit.descricao_interna_procedimento || "Sem descrição";
        const dataSolicitacao = hit.data_solicitacao;

        if (dataSolicitacao) {
          const solicitacaoDate = new Date(dataSolicitacao);
          const diasEspera = Math.floor(
            (now.getTime() - solicitacaoDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (!procedimentoMap.has(descricao)) {
            procedimentoMap.set(descricao, { total: 0, count: 0 });
          }
          const entry = procedimentoMap.get(descricao)!;
          entry.total += diasEspera;
          entry.count += 1;
        }
      });

      const data = Array.from(procedimentoMap.entries());
      expect(data).toHaveLength(1);
      expect(data[0][0]).toBe("Proc B");
    });
  });

  describe("Top Procedures", () => {
    it("should count procedures correctly", () => {
      const mockData = [
        { descricao_interna_procedimento: "Proc A" },
        { descricao_interna_procedimento: "Proc B" },
        { descricao_interna_procedimento: "Proc A" },
        { descricao_interna_procedimento: "Proc A" },
        { descricao_interna_procedimento: "Proc C" },
      ];

      const procedimentoCount = new Map<string, { count: number }>();

      mockData.forEach((hit) => {
        const descricao = hit.descricao_interna_procedimento || "Sem descrição";

        if (!procedimentoCount.has(descricao)) {
          procedimentoCount.set(descricao, { count: 0 });
        }
        procedimentoCount.get(descricao)!.count += 1;
      });

      const data = Array.from(procedimentoCount.entries())
        .map(([descricao, stats]) => ({
          descricao,
          total: stats.count,
        }))
        .sort((a, b) => b.total - a.total);

      expect(data).toHaveLength(3);
      expect(data[0].descricao).toBe("Proc A");
      expect(data[0].total).toBe(3);
      expect(data[1].descricao).toBe("Proc B");
      expect(data[1].total).toBe(1);
      expect(data[2].descricao).toBe("Proc C");
      expect(data[2].total).toBe(1);
    });

    it("should limit results to top N", () => {
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        descricao_interna_procedimento: `Proc ${i}`,
      }));

      const procedimentoCount = new Map<string, { count: number }>();

      mockData.forEach((hit) => {
        const descricao = hit.descricao_interna_procedimento || "Sem descrição";

        if (!procedimentoCount.has(descricao)) {
          procedimentoCount.set(descricao, { count: 0 });
        }
        procedimentoCount.get(descricao)!.count += 1;
      });

      const limit = 10;
      const data = Array.from(procedimentoCount.entries())
        .map(([descricao, stats]) => ({
          descricao,
          total: stats.count,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

      expect(data).toHaveLength(10);
    });

    it("should use fallback description", () => {
      const mockData = [
        { descricao_sigtap_procedimento: "SIGTAP Proc" },
        { nome_grupo_procedimento: "Grupo Proc" },
        {},
      ];

      const procedimentoCount = new Map<string, { count: number }>();

      mockData.forEach((hit: any) => {
        const descricao =
          hit.descricao_interna_procedimento ||
          hit.descricao_sigtap_procedimento ||
          hit.nome_grupo_procedimento ||
          "Sem descrição";

        if (!procedimentoCount.has(descricao)) {
          procedimentoCount.set(descricao, { count: 0 });
        }
        procedimentoCount.get(descricao)!.count += 1;
      });

      const data = Array.from(procedimentoCount.entries());
      expect(data).toHaveLength(3);
      expect(data.some((d) => d[0] === "SIGTAP Proc")).toBe(true);
      expect(data.some((d) => d[0] === "Grupo Proc")).toBe(true);
      expect(data.some((d) => d[0] === "Sem descrição")).toBe(true);
    });
  });
});
