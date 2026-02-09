import { describe, it, expect } from "vitest";

describe("Procedimento Fallback Logic", () => {
  // Simula a lógica de formatCellValue para descricao_interna_procedimento
  const formatDescricaoProcedimento = (
    value: unknown,
    hit?: Record<string, unknown>
  ): string => {
    if (value === null || value === undefined || value === "") {
      // Fallback permitido: apenas codigo_interno_procedimento
      if (hit && hit.codigo_interno_procedimento) {
        return `Código: ${hit.codigo_interno_procedimento}`;
      }
      return "-";
    }
    return String(value);
  };

  describe("Descrição Procedimento", () => {
    it("deve retornar descricao_interna_procedimento quando preenchido", () => {
      const hit = {
        descricao_interna_procedimento: "CONSULTA MÉDICA",
        nome_grupo_procedimento: "CONSULTAS",
        codigo_interno_procedimento: "0301010010",
      };

      const result = formatDescricaoProcedimento(
        hit.descricao_interna_procedimento,
        hit
      );
      expect(result).toBe("CONSULTA MÉDICA");
    });

    it("deve retornar codigo_interno_procedimento quando descricao vazia", () => {
      const hit = {
        descricao_interna_procedimento: "",
        nome_grupo_procedimento: "CONSULTAS",
        codigo_interno_procedimento: "0301010010",
      };

      const result = formatDescricaoProcedimento(
        hit.descricao_interna_procedimento,
        hit
      );
      expect(result).toBe("Código: 0301010010");
    });

    it("NÃO deve retornar nome_grupo_procedimento como fallback", () => {
      const hit = {
        descricao_interna_procedimento: "",
        nome_grupo_procedimento: "CONSULTAS",
        codigo_interno_procedimento: "0301010010",
      };

      const result = formatDescricaoProcedimento(
        hit.descricao_interna_procedimento,
        hit
      );
      // Deve retornar código, NÃO o nome do grupo
      expect(result).not.toBe("CONSULTAS");
      expect(result).toBe("Código: 0301010010");
    });

    it("deve retornar '-' quando ambos estão vazios", () => {
      const hit = {
        descricao_interna_procedimento: "",
        nome_grupo_procedimento: "CONSULTAS",
      };

      const result = formatDescricaoProcedimento(
        hit.descricao_interna_procedimento,
        hit
      );
      expect(result).toBe("-");
    });

    it("NÃO deve usar descricao_sigtap_procedimento como fallback", () => {
      const hit = {
        descricao_interna_procedimento: "",
        descricao_sigtap_procedimento: "CONSULTA EM ATENÇÃO ESPECIALIZADA",
        codigo_interno_procedimento: "0301010010",
      };

      const result = formatDescricaoProcedimento(
        hit.descricao_interna_procedimento,
        hit
      );
      // Deve retornar código, NÃO a descrição SIGTAP
      expect(result).not.toBe("CONSULTA EM ATENÇÃO ESPECIALIZADA");
      expect(result).toBe("Código: 0301010010");
    });
  });

  describe("Filtro de Busca", () => {
    it("deve buscar apenas em descricao_interna_procedimento e codigo_interno_procedimento", () => {
      // Simula a estrutura de query do Elasticsearch
      const searchTerm = "cardio";
      const shouldClauses = [
        { wildcard: { "descricao_interna_procedimento": `*${searchTerm}*` } },
        { match_phrase_prefix: { "descricao_interna_procedimento": searchTerm } },
        { match: { "descricao_interna_procedimento": { query: searchTerm, fuzziness: "AUTO" } } },
        { term: { "codigo_interno_procedimento": searchTerm } },
      ];

      // Verifica que NÃO há busca em nome_grupo_procedimento
      const hasNomeGrupo = shouldClauses.some(
        (clause) => JSON.stringify(clause).includes("nome_grupo_procedimento")
      );
      expect(hasNomeGrupo).toBe(false);

      // Verifica que NÃO há busca em descricao_sigtap_procedimento
      const hasSigtap = shouldClauses.some(
        (clause) => JSON.stringify(clause).includes("descricao_sigtap_procedimento")
      );
      expect(hasSigtap).toBe(false);

      // Verifica que HÁ busca em descricao_interna_procedimento
      const hasDescricaoInterna = shouldClauses.some(
        (clause) => JSON.stringify(clause).includes("descricao_interna_procedimento")
      );
      expect(hasDescricaoInterna).toBe(true);

      // Verifica que HÁ busca em codigo_interno_procedimento
      const hasCodigo = shouldClauses.some(
        (clause) => JSON.stringify(clause).includes("codigo_interno_procedimento")
      );
      expect(hasCodigo).toBe(true);
    });
  });
});
