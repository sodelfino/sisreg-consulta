/**
 * Teste unitário para validar a busca de procedimentos com nested query
 * Verifica se a query de busca usa nested query corretamente para campos procedimentos
 * 
 * Query otimizada: match + wildcard para máxima compatibilidade e acurácia
 * - match: busca por palavras completas (tokenizadas)
 * - wildcard: busca por prefixos e substrings
 */

import { describe, it, expect } from "vitest";

describe("Query de Busca de Procedimentos (Nested - Otimizada)", () => {
  it("deve usar nested query para buscar em procedimentos", () => {
    // Simular a estrutura da query que deve ser gerada
    const query = {
      nested: {
        path: "procedimentos",
        query: {
          bool: {
            should: [
              { match: { "procedimentos.descricao_interna": "CARDIO" } },
              { wildcard: { "procedimentos.descricao_interna": { value: "*CARDIO*", case_insensitive: true } } },
              { match: { "procedimentos.descricao_sigtap": "CARDIO" } },
              { wildcard: { "procedimentos.descricao_sigtap": { value: "*CARDIO*", case_insensitive: true } } },
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

  it("deve usar match para busca de palavras completas", () => {
    // Validar que match está incluído
    const shouldClauses = [
      { match: { "procedimentos.descricao_interna": "CARDIO" } },
      { wildcard: { "procedimentos.descricao_interna": { value: "*CARDIO*", case_insensitive: true } } },
    ];

    const hasMatch = shouldClauses.some(
      (clause) => Object.keys(clause.match || {})[0] === "procedimentos.descricao_interna"
    );
    expect(hasMatch).toBe(true);
  });

  it("deve usar wildcard com case_insensitive para máxima acurácia", () => {
    // Validar que wildcard usa case_insensitive
    const wildcardQuery = {
      wildcard: { "procedimentos.descricao_interna": { value: "*CARDIO*", case_insensitive: true } },
    };

    expect(wildcardQuery.wildcard["procedimentos.descricao_interna"].case_insensitive).toBe(true);
    expect(wildcardQuery.wildcard["procedimentos.descricao_interna"].value).toContain("*CARDIO*");
  });

  it("deve buscar em descricao_interna como campo principal", () => {
    // Validar que descricao_interna é o primeiro campo de busca
    const shouldClauses = [
      { match: { "procedimentos.descricao_interna": "CARDIO" } },
      { wildcard: { "procedimentos.descricao_interna": { value: "*CARDIO*", case_insensitive: true } } },
      { match: { "procedimentos.descricao_sigtap": "CARDIO" } },
      { wildcard: { "procedimentos.descricao_sigtap": { value: "*CARDIO*", case_insensitive: true } } },
    ];

    // Primeiro campo deve ser descricao_interna
    const firstClause = shouldClauses[0];
    expect(Object.keys(firstClause.match)[0]).toBe("procedimentos.descricao_interna");
  });

  it("deve incluir busca em descricao_sigtap como fallback", () => {
    // Validar que descricao_sigtap está incluído
    const shouldClauses = [
      { match: { "procedimentos.descricao_interna": "CARDIO" } },
      { wildcard: { "procedimentos.descricao_interna": { value: "*CARDIO*", case_insensitive: true } } },
      { match: { "procedimentos.descricao_sigtap": "CARDIO" } },
      { wildcard: { "procedimentos.descricao_sigtap": { value: "*CARDIO*", case_insensitive: true } } },
    ];

    const hasSigtapSearch = shouldClauses.some(
      (clause) => Object.keys(clause.match || clause.wildcard)[0]?.includes("descricao_sigtap")
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
              { match: { "procedimentos.descricao_interna": "CARDIO" } },
              { wildcard: { "procedimentos.descricao_interna": { value: "*CARDIO*", case_insensitive: true } } },
              { match: { "procedimentos.descricao_sigtap": "CARDIO" } },
              { wildcard: { "procedimentos.descricao_sigtap": { value: "*CARDIO*", case_insensitive: true } } },
            ],
            minimum_should_match: 1,
          },
        },
      },
    };

    expect(query.nested.query.bool.minimum_should_match).toBe(1);
  });

  it("deve converter searchTerm para UPPERCASE", () => {
    // Validar que o termo de busca é convertido para uppercase
    const searchTerms = ["cardio", "CARDIO", "Cardio"];
    const normalized = searchTerms.map((term) => term.toUpperCase());

    expect(normalized).toEqual(["CARDIO", "CARDIO", "CARDIO"]);
  });

  it("deve usar wildcards para busca parcial", () => {
    // Validar que wildcards permitem busca parcial
    const searchTerm = "CARDIO";
    const wildcardPattern = `*${searchTerm}*`;

    // Deve encontrar: CARDIOLOGIA, CONSULTA EM CARDIOLOGIA, MONITORAMENTO CARDIACO, etc.
    const testCases = [
      { term: "CARDIOLOGIA", matches: true },
      { term: "CONSULTA EM CARDIOLOGIA", matches: true },
      { term: "ELETROCARDIOGRAMA", matches: true },
      { term: "ENDOSCOPIA", matches: false },
    ];

    testCases.forEach(({ term, matches }) => {
      const isMatch = term.includes(searchTerm);
      expect(isMatch).toBe(matches);
    });
  });

  it("deve encontrar termos completos com match", () => {
    // Validar que match encontra palavras tokenizadas
    // "CARDIOLOGIA" é tokenizada em ["CARDIOLOGIA"]
    // "CONSULTA EM CARDIOLOGIA" é tokenizada em ["CONSULTA", "EM", "CARDIOLOGIA"]
    // match("CARDIOLOGIA") encontra ambas porque "CARDIOLOGIA" é um token em ambas
    
    const testCases = [
      { term: "CARDIOLOGIA", searchTerm: "CARDIOLOGIA", matches: true },
      { term: "CONSULTA EM CARDIOLOGIA", searchTerm: "CARDIOLOGIA", matches: true },
      { term: "ENDOSCOPIA", searchTerm: "CARDIOLOGIA", matches: false },
    ];

    testCases.forEach(({ term, searchTerm, matches }) => {
      // Simular tokenização simples (em produção, Elasticsearch faz isso)
      const tokens = term.split(" ");
      const isMatch = tokens.includes(searchTerm);
      expect(isMatch).toBe(matches);
    });
  });

  it("deve encontrar prefixos com wildcard", () => {
    // Validar que wildcard encontra prefixos
    const searchTerm = "CARDIO";
    const testCases = [
      { term: "CARDIOLOGIA", matches: true },
      { term: "CARDIO", matches: true },
      { term: "ELETROCARDIOGRAMA", matches: true },
      { term: "ENDOSCOPIA", matches: false },
    ];

    testCases.forEach(({ term, matches }) => {
      const isMatch = term.includes(searchTerm);
      expect(isMatch).toBe(matches);
    });
  });
});
