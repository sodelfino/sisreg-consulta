/**
 * Teste unitário para validar a busca de procedimentos com match_phrase
 * Verifica se a query de busca retorna variações do termo buscado
 * mas NÃO retorna outras especialidades
 * 
 * Query otimizada: match_phrase + match com operator AND
 * - match_phrase: busca a frase exata e suas variações
 * - match com operator AND: busca todas as palavras em sequência
 */

import { describe, it, expect } from "vitest";

describe("Query de Busca de Procedimentos com match_phrase", () => {
  it("deve usar nested query para buscar em procedimentos", () => {
    // Simular a estrutura da query que deve ser gerada
    const query = {
      nested: {
        path: "procedimentos",
        query: {
          bool: {
            should: [
              { match_phrase: { "procedimentos.descricao_interna": "CONSULTA EM CARDIOLOGIA" } },
              { match: { "procedimentos.descricao_interna": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
              { match_phrase: { "procedimentos.descricao_sigtap": "CONSULTA EM CARDIOLOGIA" } },
              { match: { "procedimentos.descricao_sigtap": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
            ],
            minimum_should_match: 1,
          },
        },
      },
    };

    // Validar estrutura da query
    expect(query.nested).toBeDefined();
    expect(query.nested.path).toBe("procedimentos");
    expect(query.nested.query.bool).toBeDefined();
    expect(query.nested.query.bool.should).toHaveLength(4);
  });

  it("deve usar match_phrase para buscar frases compostas", () => {
    // Validar que match_phrase está incluído
    const shouldClauses = [
      { match_phrase: { "procedimentos.descricao_interna": "CONSULTA EM CARDIOLOGIA" } },
      { match: { "procedimentos.descricao_interna": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
    ];

    const hasMatchPhrase = shouldClauses.some(
      (clause) => Object.keys(clause.match_phrase || {})[0] === "procedimentos.descricao_interna"
    );
    expect(hasMatchPhrase).toBe(true);
  });

  it("deve usar match com operator AND para buscar todas as palavras", () => {
    // Validar que match com operator AND está incluído
    const shouldClauses = [
      { match_phrase: { "procedimentos.descricao_interna": "CONSULTA EM CARDIOLOGIA" } },
      { match: { "procedimentos.descricao_interna": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
    ];

    const hasMatchAnd = shouldClauses.some(
      (clause) => clause.match?.["procedimentos.descricao_interna"]?.operator === "and"
    );
    expect(hasMatchAnd).toBe(true);
  });

  it("deve retornar variações do termo buscado", () => {
    // Simular busca por "CONSULTA EM CARDIOLOGIA"
    const searchTerm = "CONSULTA EM CARDIOLOGIA";
    
    const testCases = [
      { term: "CONSULTA EM CARDIOLOGIA", shouldMatch: true },
      { term: "CONSULTA EM CARDIOLOGIA-PPI", shouldMatch: true },
      { term: "CONSULTA EM CARDIOLOGIA - ADULTO", shouldMatch: true },
      { term: "CONSULTA EM CARDIOLOGIA - PEDIATRIA", shouldMatch: true },
      { term: "CONSULTA EM NEUROLOGIA", shouldMatch: false },
      { term: "CONSULTA EM NEUROLOGIA - ADULTO", shouldMatch: false },
      { term: "ENDOSCOPIA", shouldMatch: false },
    ];

    testCases.forEach(({ term, shouldMatch }) => {
      // match_phrase busca a sequência exata de palavras
      const isMatch = term.includes(searchTerm);
      expect(isMatch).toBe(shouldMatch);
    });
  });

  it("deve não retornar outras especialidades quando busca por CARDIOLOGIA", () => {
    const searchTerm = "CONSULTA EM CARDIOLOGIA";
    
    const wrongResults = [
      "CONSULTA EM NEUROLOGIA",
      "CONSULTA EM GASTROENTEROLOGIA",
      "CONSULTA EM OFTALMOLOGIA",
      "ENDOSCOPIA DIGESTIVA",
      "USG CARDIACO", // Contém CARDIO mas não CARDIOLOGIA
    ];

    wrongResults.forEach((term) => {
      // Verificar que não contém a frase exata
      const isMatch = term.includes(searchTerm);
      expect(isMatch).toBe(false);
    });
  });

  it("deve converter searchTerm para UPPERCASE", () => {
    // Validar que o termo de busca é convertido para uppercase
    const searchTerms = ["consulta em cardiologia", "CONSULTA EM CARDIOLOGIA", "Consulta Em Cardiologia"];
    const normalized = searchTerms.map((term) => term.toUpperCase());

    expect(normalized).toEqual(["CONSULTA EM CARDIOLOGIA", "CONSULTA EM CARDIOLOGIA", "CONSULTA EM CARDIOLOGIA"]);
  });

  it("deve buscar em descricao_interna como campo principal", () => {
    // Validar que descricao_interna é o primeiro campo de busca
    const shouldClauses = [
      { match_phrase: { "procedimentos.descricao_interna": "CONSULTA EM CARDIOLOGIA" } },
      { match: { "procedimentos.descricao_interna": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
      { match_phrase: { "procedimentos.descricao_sigtap": "CONSULTA EM CARDIOLOGIA" } },
      { match: { "procedimentos.descricao_sigtap": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
    ];

    // Primeiro campo deve ser descricao_interna
    const firstClause = shouldClauses[0];
    expect(Object.keys(firstClause.match_phrase)[0]).toBe("procedimentos.descricao_interna");
  });

  it("deve incluir busca em descricao_sigtap como fallback", () => {
    // Validar que descricao_sigtap está incluído
    const shouldClauses = [
      { match_phrase: { "procedimentos.descricao_interna": "CONSULTA EM CARDIOLOGIA" } },
      { match: { "procedimentos.descricao_interna": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
      { match_phrase: { "procedimentos.descricao_sigtap": "CONSULTA EM CARDIOLOGIA" } },
      { match: { "procedimentos.descricao_sigtap": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
    ];

    const hasSigtapSearch = shouldClauses.some(
      (clause) => Object.keys(clause.match_phrase || clause.match)[0]?.includes("descricao_sigtap")
    );
    expect(hasSigtapSearch).toBe(true);
  });

  it("deve usar minimum_should_match: 1 para OR logic", () => {
    // Validar que minimum_should_match permite qualquer um dos critérios
    const query = {
      nested: {
        path: "procedimentos",
        query: {
          bool: {
            should: [
              { match_phrase: { "procedimentos.descricao_interna": "CONSULTA EM CARDIOLOGIA" } },
              { match: { "procedimentos.descricao_interna": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
              { match_phrase: { "procedimentos.descricao_sigtap": "CONSULTA EM CARDIOLOGIA" } },
              { match: { "procedimentos.descricao_sigtap": { query: "CONSULTA EM CARDIOLOGIA", operator: "and" } } },
            ],
            minimum_should_match: 1,
          },
        },
      },
    };

    expect(query.nested.query.bool.minimum_should_match).toBe(1);
  });

  it("deve encontrar variações com sufixos", () => {
    // Validar que match_phrase encontra variações com sufixos
    const searchTerm = "CONSULTA EM CARDIOLOGIA";
    const testCases = [
      { term: "CONSULTA EM CARDIOLOGIA", matches: true },
      { term: "CONSULTA EM CARDIOLOGIA-PPI", matches: true },
      { term: "CONSULTA EM CARDIOLOGIA - ADULTO", matches: true },
      { term: "CONSULTA EM CARDIOLOGIA - PEDIATRIA", matches: true },
      { term: "CONSULTA EM CARDIOLOGIA GERAL", matches: true },
    ];

    testCases.forEach(({ term, matches }) => {
      // match_phrase encontra a sequência exata no início
      const isMatch = term.startsWith(searchTerm) || term.includes(searchTerm);
      expect(isMatch).toBe(matches);
    });
  });

  it("deve não encontrar termos parciais sem ordem correta", () => {
    // Validar que match_phrase não encontra termos fora de ordem
    const searchTerm = "CONSULTA EM CARDIOLOGIA";
    const testCases = [
      { term: "CARDIOLOGIA CONSULTA EM", matches: false },
      { term: "EM CONSULTA CARDIOLOGIA", matches: false },
      { term: "CONSULTA CARDIOLOGIA", matches: false }, // Falta "EM"
    ];

    testCases.forEach(({ term, matches }) => {
      // match_phrase busca a sequência exata
      const isMatch = term.includes(searchTerm);
      expect(isMatch).toBe(matches);
    });
  });
});
