import { describe, it, expect } from "vitest";
import { isConsultaProfissionalSaude, TERMOS_EXCLUIR_NAO_CONSULTA, PREFIXOS_CONSULTA_VALIDOS } from "../shared/sisreg";

describe("isConsultaProfissionalSaude", () => {
  describe("deve retornar TRUE para consultas válidas", () => {
    const consultasValidas = [
      "CONSULTA EM CARDIOLOGIA",
      "CONSULTA EM NEUROLOGIA",
      "CONSULTA EM DERMATOLOGIA",
      "CONSULTA EM ORTOPEDIA",
      "CONSULTA EM PEDIATRIA",
      "CONSULTA EM GINECOLOGIA",
      "CONSULTA EM UROLOGIA",
      "CONSULTA EM OFTALMOLOGIA",
      "CONSULTA EM OTORRINOLARINGOLOGIA",
      "CONSULTA EM PSIQUIATRIA",
      "CONSULTA DE ENFERMAGEM",
      "CONSULTA DE NUTRIÇÃO",
      "CONSULTA COM FONOAUDIÓLOGO",
      "CONSULTA MÉDICA EM CLÍNICA GERAL",
      "CONSULTA MEDICA EM GERIATRIA",
    ];

    consultasValidas.forEach((consulta) => {
      it(`"${consulta}" → true`, () => {
        expect(isConsultaProfissionalSaude(consulta)).toBe(true);
      });
    });
  });

  describe("deve retornar FALSE para exames e procedimentos", () => {
    const naoConsultas = [
      "ULTRASSONOGRAFIA DE ABDOME",
      "TOMOGRAFIA COMPUTADORIZADA",
      "RESSONÂNCIA MAGNÉTICA",
      "ELETROCARDIOGRAMA",
      "ENDOSCOPIA DIGESTIVA ALTA",
      "COLONOSCOPIA",
      "MAMOGRAFIA",
      "RADIOGRAFIA DE TÓRAX",
      "HEMOGRAMA COMPLETO",
      "DOSAGEM DE GLICEMIA",
      "CIRURGIA DE CATARATA",
      "FISIOTERAPIA MOTORA",
      "SESSÃO DE QUIMIOTERAPIA",
      "BIÓPSIA DE PELE",
      "HOLTER 24H",
      "ECOCARDIOGRAMA TRANSTORÁCICO",
    ];

    naoConsultas.forEach((proc) => {
      it(`"${proc}" → false (não começa com prefixo válido)`, () => {
        expect(isConsultaProfissionalSaude(proc)).toBe(false);
      });
    });
  });

  describe("deve retornar FALSE para consultas que contêm termos de exclusão", () => {
    const consultasComExclusao = [
      "CONSULTA EM FISIOTERAPIA",
      "CONSULTA EM RADIOTERAPIA",
      "CONSULTA EM QUIMIOTERAPIA",
      "CONSULTA DE ACUPUNTURA",
    ];

    consultasComExclusao.forEach((proc) => {
      it(`"${proc}" → false (contém termo de exclusão)`, () => {
        expect(isConsultaProfissionalSaude(proc)).toBe(false);
      });
    });
  });

  describe("edge cases", () => {
    it("string vazia → false", () => {
      expect(isConsultaProfissionalSaude("")).toBe(false);
    });

    it("null/undefined → false", () => {
      expect(isConsultaProfissionalSaude(null as any)).toBe(false);
      expect(isConsultaProfissionalSaude(undefined as any)).toBe(false);
    });

    it("case insensitive", () => {
      expect(isConsultaProfissionalSaude("consulta em cardiologia")).toBe(true);
      expect(isConsultaProfissionalSaude("Consulta Em Neurologia")).toBe(true);
    });

    it("com espaços extras", () => {
      expect(isConsultaProfissionalSaude("  CONSULTA EM CARDIOLOGIA  ")).toBe(true);
    });
  });
});

describe("TERMOS_EXCLUIR_NAO_CONSULTA", () => {
  it("deve ter pelo menos 50 termos", () => {
    expect(TERMOS_EXCLUIR_NAO_CONSULTA.length).toBeGreaterThan(50);
  });

  it("todos os termos devem ser strings não vazias", () => {
    TERMOS_EXCLUIR_NAO_CONSULTA.forEach((termo) => {
      expect(typeof termo).toBe("string");
      expect(termo.length).toBeGreaterThan(0);
    });
  });
});

describe("PREFIXOS_CONSULTA_VALIDOS", () => {
  it("deve ter 5 prefixos", () => {
    expect(PREFIXOS_CONSULTA_VALIDOS.length).toBe(5);
  });

  it("todos devem começar com CONSULTA", () => {
    PREFIXOS_CONSULTA_VALIDOS.forEach((prefixo) => {
      expect(prefixo.startsWith("CONSULTA")).toBe(true);
    });
  });
});

describe("Busca múltipla com pipe separator", () => {
  it("deve separar termos por pipe corretamente", () => {
    const rawSearch = "CONSULTA EM CARDIOLOGIA|CONSULTA EM NEUROLOGIA|CONSULTA EM ORTOPEDIA";
    const searchTerms = rawSearch.split("|").map(t => t.trim()).filter(t => t.length > 0);
    expect(searchTerms).toHaveLength(3);
    expect(searchTerms[0]).toBe("CONSULTA EM CARDIOLOGIA");
    expect(searchTerms[1]).toBe("CONSULTA EM NEUROLOGIA");
    expect(searchTerms[2]).toBe("CONSULTA EM ORTOPEDIA");
  });

  it("deve tratar busca sem pipe como termo único", () => {
    const rawSearch = "CONSULTA EM CARDIOLOGIA";
    const hasPipe = rawSearch.includes("|");
    expect(hasPipe).toBe(false);
    const searchTerms = hasPipe 
      ? rawSearch.split("|").map(t => t.trim()).filter(t => t.length > 0)
      : [rawSearch];
    expect(searchTerms).toHaveLength(1);
  });

  it("deve ignorar pipes vazios", () => {
    const rawSearch = "CONSULTA EM CARDIOLOGIA||CONSULTA EM NEUROLOGIA|";
    const searchTerms = rawSearch.split("|").map(t => t.trim()).filter(t => t.length > 0);
    expect(searchTerms).toHaveLength(2);
  });
});
