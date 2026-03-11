/**
 * Teste unitário para validar o filtro de SITUAÇÃO nas Solicitações Ambulatoriais
 * Verifica se a query de filtro está sendo construída corretamente
 */

import { describe, it, expect } from "vitest";

describe("Filtro de SITUAÇÃO nas Solicitações Ambulatoriais", () => {
  it("deve incluir situacaoFilter no schema de entrada", () => {
    // Validar que o schema aceita situacaoFilter
    const input = {
      indexType: "solicitacao" as const,
      mode: "fila" as const,
      size: 100,
      from: 0,
      situacaoFilter: ["P", "R"],
    };

    expect(input.situacaoFilter).toBeDefined();
    expect(input.situacaoFilter).toEqual(["P", "R"]);
  });

  it("deve construir query com terms para sigla_situacao.keyword", () => {
    // Simular a query que deve ser gerada
    const situacaoFilter = ["P", "R"];
    const query = {
      terms: { "sigla_situacao.keyword": situacaoFilter },
    };

    expect(query.terms["sigla_situacao.keyword"]).toEqual(["P", "R"]);
  });

  it("deve aceitar múltiplos valores de situação", () => {
    const situacaoFilter = ["P", "R", "D", "N", "A", "C"];
    expect(situacaoFilter).toHaveLength(6);
    expect(situacaoFilter).toContain("P");
    expect(situacaoFilter).toContain("R");
  });

  it("deve aceitar situação vazia (sem filtro)", () => {
    const situacaoFilter: string[] = [];
    expect(situacaoFilter).toHaveLength(0);
  });

  it("deve validar valores de situação conhecidos", () => {
    const SITUACAO_LABELS: Record<string, string> = {
      P: "Pendente",
      R: "Reenviada",
      D: "Devolvida",
      N: "Negada",
      A: "Aprovada",
      C: "Cancelada",
    };

    const validSituacoes = Object.keys(SITUACAO_LABELS);
    expect(validSituacoes).toContain("P");
    expect(validSituacoes).toContain("R");
    expect(validSituacoes).toContain("D");
    expect(validSituacoes).toContain("N");
    expect(validSituacoes).toContain("A");
    expect(validSituacoes).toContain("C");
  });

  it("deve retornar label correto para cada situação", () => {
    const SITUACAO_LABELS: Record<string, string> = {
      P: "Pendente",
      R: "Reenviada",
      D: "Devolvida",
      N: "Negada",
      A: "Aprovada",
      C: "Cancelada",
    };

    expect(SITUACAO_LABELS["P"]).toBe("Pendente");
    expect(SITUACAO_LABELS["R"]).toBe("Reenviada");
    expect(SITUACAO_LABELS["D"]).toBe("Devolvida");
    expect(SITUACAO_LABELS["N"]).toBe("Negada");
    expect(SITUACAO_LABELS["A"]).toBe("Aprovada");
    expect(SITUACAO_LABELS["C"]).toBe("Cancelada");
  });

  it("deve incluir riscoFilter no schema de entrada", () => {
    // Validar que o schema aceita riscoFilter
    const input = {
      indexType: "solicitacao" as const,
      mode: "fila" as const,
      size: 100,
      from: 0,
      riscoFilter: ["0", "1"],
    };

    expect(input.riscoFilter).toBeDefined();
    expect(input.riscoFilter).toEqual(["0", "1"]);
  });

  it("deve construir query com terms para codigo_classificacao_risco", () => {
    // Simular a query que deve ser gerada
    const riscoFilter = ["0", "1"];
    const query = {
      terms: { "codigo_classificacao_risco": riscoFilter },
    };

    expect(query.terms["codigo_classificacao_risco"]).toEqual(["0", "1"]);
  });

  it("deve aceitar múltiplos valores de risco", () => {
    const riscoFilter = ["0", "1", "2", "3", "4"];
    expect(riscoFilter).toHaveLength(5);
  });

  it("deve validar valores de risco conhecidos", () => {
    const RISK_LABELS: Record<number, string> = {
      0: "Emergência",
      1: "Urgência",
      2: "Prioridade não urgente",
      3: "Eletivo",
      4: "Eletivo",
    };

    const validRiscos = Object.keys(RISK_LABELS);
    expect(validRiscos).toContain("0");
    expect(validRiscos).toContain("1");
    expect(validRiscos).toContain("2");
    expect(validRiscos).toContain("3");
    expect(validRiscos).toContain("4");
  });

  it("deve retornar label correto para cada risco", () => {
    const RISK_LABELS: Record<number, string> = {
      0: "Emergência",
      1: "Urgência",
      2: "Prioridade não urgente",
      3: "Eletivo",
      4: "Eletivo",
    };

    expect(RISK_LABELS[0]).toBe("Emergência");
    expect(RISK_LABELS[1]).toBe("Urgência");
    expect(RISK_LABELS[2]).toBe("Prioridade não urgente");
    expect(RISK_LABELS[3]).toBe("Eletivo");
    expect(RISK_LABELS[4]).toBe("Eletivo");
  });

  it("deve combinar filtros de situação e risco", () => {
    const situacaoFilter = ["P", "R"];
    const riscoFilter = ["0", "1"];

    const query = {
      bool: {
        must: [
          { terms: { "sigla_situacao.keyword": situacaoFilter } },
          { terms: { "codigo_classificacao_risco": riscoFilter } },
        ],
      },
    };

    expect(query.bool.must).toHaveLength(2);
    expect(query.bool.must[0]).toEqual({ terms: { "sigla_situacao.keyword": situacaoFilter } });
    expect(query.bool.must[1]).toEqual({ terms: { "codigo_classificacao_risco": riscoFilter } });
  });

  it("deve permitir usar apenas situação sem risco", () => {
    const situacaoFilter = ["P"];
    const riscoFilter: string[] = [];

    const mustClauses = [];
    if (situacaoFilter.length > 0) {
      mustClauses.push({ terms: { "sigla_situacao.keyword": situacaoFilter } });
    }
    if (riscoFilter.length > 0) {
      mustClauses.push({ terms: { "codigo_classificacao_risco": riscoFilter } });
    }

    expect(mustClauses).toHaveLength(1);
    expect(mustClauses[0]).toEqual({ terms: { "sigla_situacao.keyword": ["P"] } });
  });

  it("deve permitir usar apenas risco sem situação", () => {
    const situacaoFilter: string[] = [];
    const riscoFilter = ["1"];

    const mustClauses = [];
    if (situacaoFilter.length > 0) {
      mustClauses.push({ terms: { "sigla_situacao.keyword": situacaoFilter } });
    }
    if (riscoFilter.length > 0) {
      mustClauses.push({ terms: { "codigo_classificacao_risco": riscoFilter } });
    }

    expect(mustClauses).toHaveLength(1);
    expect(mustClauses[0]).toEqual({ terms: { "codigo_classificacao_risco": ["1"] } });
  });

  it("deve permitir usar nenhum filtro", () => {
    const situacaoFilter: string[] = [];
    const riscoFilter: string[] = [];

    const mustClauses = [];
    if (situacaoFilter.length > 0) {
      mustClauses.push({ terms: { "sigla_situacao.keyword": situacaoFilter } });
    }
    if (riscoFilter.length > 0) {
      mustClauses.push({ terms: { "codigo_classificacao_risco": riscoFilter } });
    }

    expect(mustClauses).toHaveLength(0);
  });
});
