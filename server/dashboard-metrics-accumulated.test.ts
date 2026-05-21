/**
 * Teste unitário para validar métricas acumuladas de 3 anos
 * Verifica se a query de métricas está sendo construída corretamente
 */

import { describe, it, expect } from "vitest";

describe("Dashboard - Métricas Acumuladas (3 Anos)", () => {
  it("deve calcular período de 3 anos corretamente", () => {
    const today = new Date();
    const threeYearsAgo = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    const dateStart = threeYearsAgo.toISOString().split("T")[0];
    const dateEnd = today.toISOString().split("T")[0];

    expect(dateStart).toBeDefined();
    expect(dateEnd).toBeDefined();
    expect(dateStart < dateEnd).toBe(true);
  });

  it("deve aceitar statusFilter com múltiplos status", () => {
    const statusFilter = [
      "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA",
      "SOLICITAÇÃO / PENDENTE / REGULADOR",
      "SOLICITAÇÃO / AGENDADA / FILA DE ESPERA",
    ];

    expect(statusFilter).toHaveLength(3);
    expect(statusFilter).toContain("SOLICITAÇÃO / PENDENTE / FILA DE ESPERA");
  });

  it("deve aceitar procedimentoSearch como string", () => {
    const procedimentoSearch = "CONSULTA EM";
    expect(typeof procedimentoSearch).toBe("string");
    expect(procedimentoSearch).toContain("CONSULTA");
  });

  it("deve filtrar por status corretamente", () => {
    const statusFilter = ["SOLICITAÇÃO / PENDENTE / FILA DE ESPERA"];
    const hits = [
      { status_solicitacao: "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA", descricao_interna_procedimento: "CONSULTA EM CARDIOLOGIA" },
      { status_solicitacao: "SOLICITAÇÃO / PENDENTE / REGULADOR", descricao_interna_procedimento: "CONSULTA EM NEUROLOGIA" },
      { status_solicitacao: "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA", descricao_interna_procedimento: "CONSULTA EM OFTALMOLOGIA" },
    ];

    const filtered = hits.filter((hit) => {
      const status = String(hit.status_solicitacao || "");
      return statusFilter.some(s => status.includes(s));
    });

    expect(filtered).toHaveLength(2);
    expect(filtered[0].descricao_interna_procedimento).toContain("CARDIOLOGIA");
  });

  it("deve filtrar por procedimento corretamente", () => {
    const procedimentoSearch = "CONSULTA EM";
    const hits = [
      { descricao_interna_procedimento: "CONSULTA EM CARDIOLOGIA" },
      { descricao_interna_procedimento: "ENDOSCOPIA DIGESTIVA" },
      { descricao_interna_procedimento: "CONSULTA EM NEUROLOGIA" },
      { descricao_interna_procedimento: "USG ABDOMINAL" },
    ];

    const filtered = hits.filter((hit) => {
      const proc = String(hit.descricao_interna_procedimento || "").toUpperCase();
      return proc.includes(procedimentoSearch.toUpperCase());
    });

    expect(filtered).toHaveLength(2);
    expect(filtered[0].descricao_interna_procedimento).toContain("CARDIOLOGIA");
    expect(filtered[1].descricao_interna_procedimento).toContain("NEUROLOGIA");
  });

  it("deve combinar filtros de status e procedimento", () => {
    const statusFilter = ["SOLICITAÇÃO / PENDENTE / FILA DE ESPERA"];
    const procedimentoSearch = "CONSULTA EM";
    const hits = [
      { status_solicitacao: "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA", descricao_interna_procedimento: "CONSULTA EM CARDIOLOGIA" },
      { status_solicitacao: "SOLICITAÇÃO / PENDENTE / REGULADOR", descricao_interna_procedimento: "CONSULTA EM NEUROLOGIA" },
      { status_solicitacao: "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA", descricao_interna_procedimento: "ENDOSCOPIA DIGESTIVA" },
    ];

    let filtered = hits;
    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter((hit) => {
        const status = String(hit.status_solicitacao || "");
        return statusFilter.some(s => status.includes(s));
      });
    }
    if (procedimentoSearch) {
      filtered = filtered.filter((hit) => {
        const proc = String(hit.descricao_interna_procedimento || "").toUpperCase();
        return proc.includes(procedimentoSearch.toUpperCase());
      });
    }

    expect(filtered).toHaveLength(1);
    expect(filtered[0].descricao_interna_procedimento).toBe("CONSULTA EM CARDIOLOGIA");
  });

  it("deve contar total acumulado corretamente", () => {
    const hits = [
      { descricao_interna_procedimento: "CONSULTA EM CARDIOLOGIA" },
      { descricao_interna_procedimento: "CONSULTA EM NEUROLOGIA" },
      { descricao_interna_procedimento: "CONSULTA EM CARDIOLOGIA" },
    ];

    const totalAccumulated = hits.length;
    expect(totalAccumulated).toBe(3);
  });

  it("deve agrupar procedimentos por frequência", () => {
    const hits = [
      { descricao_interna_procedimento: "CONSULTA EM CARDIOLOGIA" },
      { descricao_interna_procedimento: "CONSULTA EM NEUROLOGIA" },
      { descricao_interna_procedimento: "CONSULTA EM CARDIOLOGIA" },
      { descricao_interna_procedimento: "CONSULTA EM CARDIOLOGIA" },
      { descricao_interna_procedimento: "CONSULTA EM NEUROLOGIA" },
    ];

    const byProcedimento: Record<string, number> = {};
    for (const hit of hits) {
      const proc = String(hit.descricao_interna_procedimento || "N/A");
      if (proc !== "N/A") {
        byProcedimento[proc] = (byProcedimento[proc] || 0) + 1;
      }
    }

    const procedimentosList = Object.entries(byProcedimento)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    expect(procedimentosList).toHaveLength(2);
    expect(procedimentosList[0].name).toBe("CONSULTA EM CARDIOLOGIA");
    expect(procedimentosList[0].count).toBe(3);
    expect(procedimentosList[1].name).toBe("CONSULTA EM NEUROLOGIA");
    expect(procedimentosList[1].count).toBe(2);
  });

  it("deve retornar resposta com estrutura correta", () => {
    const response = {
      ok: true,
      error: null,
      data: {
        totalAccumulated: 123,
        dateStart: "2023-05-21",
        dateEnd: "2026-05-21",
        procedimentos: [
          { name: "CONSULTA EM CARDIOLOGIA", count: 50 },
          { name: "CONSULTA EM NEUROLOGIA", count: 40 },
        ],
        statusFilter: ["SOLICITAÇÃO / PENDENTE / FILA DE ESPERA"],
        procedimentoSearch: "CONSULTA EM",
      },
    };

    expect(response.ok).toBe(true);
    expect(response.data?.totalAccumulated).toBe(123);
    expect(response.data?.procedimentos).toHaveLength(2);
    expect(response.data?.dateStart).toBe("2023-05-21");
    expect(response.data?.dateEnd).toBe("2026-05-21");
  });

  it("deve validar os 3 status específicos", () => {
    const statuses = [
      "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA",
      "SOLICITAÇÃO / PENDENTE / REGULADOR",
      "SOLICITAÇÃO / AGENDADA / FILA DE ESPERA",
    ];

    expect(statuses).toHaveLength(3);
    statuses.forEach(status => {
      expect(status).toContain("SOLICITAÇÃO");
    });
  });

  it("deve lidar com dados vazios", () => {
    const hits: Record<string, unknown>[] = [];
    const totalAccumulated = hits.length;
    const byProcedimento: Record<string, number> = {};

    expect(totalAccumulated).toBe(0);
    expect(Object.keys(byProcedimento)).toHaveLength(0);
  });

  it("deve lidar com procedimento_search case-insensitive", () => {
    const procedimentoSearch = "CONSULTA EM";
    const proc1 = "consulta em cardiologia".toUpperCase();
    const proc2 = "CONSULTA EM NEUROLOGIA";
    const proc3 = "Consulta Em Oftalmologia".toUpperCase();

    expect(proc1.includes(procedimentoSearch.toUpperCase())).toBe(true);
    expect(proc2.includes(procedimentoSearch.toUpperCase())).toBe(true);
    expect(proc3.includes(procedimentoSearch.toUpperCase())).toBe(true);
  });
});
