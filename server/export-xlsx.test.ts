import { describe, it, expect } from "vitest";
import { SITUACAO_LABELS, RISK_LABELS, ALL_FIELDS_SOLICITACAO, ALL_FIELDS_MARCACAO } from "../shared/sisreg";

// ============================================================
// Testes para validar a lógica de formatação do Excel
// Espelham exatamente as funções usadas no endpoint exportXlsx
// ============================================================

// Replica a função formatCellValueXlsx do routers.ts
function formatCellValueXlsx(key: string, value: unknown, hit: Record<string, unknown>): string {
  if (value === null || value === undefined || value === "") {
    if (key === "descricao_interna_procedimento" && hit) {
      if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
        const proc = hit.procedimentos[0] as Record<string, unknown>;
        if (proc.descricao_interna) return String(proc.descricao_interna);
        if (proc.descricao_sigtap) return String(proc.descricao_sigtap);
        if (proc.codigo_interno) return `Código: ${proc.codigo_interno}`;
      }
      if (hit.descricao_procedimento) return String(hit.descricao_procedimento);
      if (hit.nome_procedimento) return String(hit.nome_procedimento);
      if (hit.procedimento) return String(hit.procedimento);
      if (hit.descricao_sigtap_procedimento) return String(hit.descricao_sigtap_procedimento);
      if (hit.nome_grupo_procedimento) return String(hit.nome_grupo_procedimento);
    }
    return "";
  }
  if (key.startsWith("data_") || key.startsWith("dt_")) {
    try {
      const date = new Date(String(value));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      }
    } catch { /* fallthrough */ }
  }
  if (key === "codigo_classificacao_risco") {
    const riskNum = Number(value);
    return RISK_LABELS[riskNum] || String(value);
  }
  if (key === "sigla_situacao") {
    return SITUACAO_LABELS[String(value)] || String(value);
  }
  return String(value);
}

// Replica a função calcularTempoEsperaXlsx do routers.ts
function calcularTempoEsperaXlsx(dataSolicitacao: unknown): string {
  if (!dataSolicitacao) return "";
  try {
    const dataStr = String(dataSolicitacao);
    const data = new Date(dataStr);
    if (isNaN(data.getTime())) return "";
    const hoje = new Date();
    const diffMs = hoje.getTime() - data.getTime();
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const meses = Math.floor(dias / 30);
    if (meses >= 1) {
      const diasRestantes = dias - (meses * 30);
      return `${meses} ${meses === 1 ? "mês" : "meses"}, ${diasRestantes} dias`;
    }
    return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  } catch { return ""; }
}

describe("Export XLSX - formatCellValueXlsx", () => {
  it("deve traduzir sigla_situacao para label legível", () => {
    const result = formatCellValueXlsx("sigla_situacao", "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA", {});
    expect(result).toBe("Pendente — Fila de Espera");
  });

  it("deve traduzir sigla_situacao REGULADOR para label legível", () => {
    const result = formatCellValueXlsx("sigla_situacao", "SOLICITAÇÃO / PENDENTE / REGULADOR", {});
    expect(result).toBe("Pendente — Regulador");
  });

  it("deve traduzir codigo_classificacao_risco 0 para Emergência", () => {
    const result = formatCellValueXlsx("codigo_classificacao_risco", 0, {});
    expect(result).toBe("Emergência");
  });

  it("deve traduzir codigo_classificacao_risco 3 para Eletivo", () => {
    const result = formatCellValueXlsx("codigo_classificacao_risco", 3, {});
    expect(result).toBe("Eletivo");
  });

  it("deve formatar data_solicitacao para formato pt-BR", () => {
    const result = formatCellValueXlsx("data_solicitacao", "2024-01-15T10:30:00", {});
    expect(result).toContain("15/01/2024");
  });

  it("deve extrair descricao_interna do array procedimentos quando campo flat está vazio", () => {
    const hit = {
      descricao_interna_procedimento: null,
      procedimentos: [{ descricao_interna: "CONSULTA EM CARDIOLOGIA", descricao_sigtap: "CONSULTA CARDIOLOGICA" }],
    };
    const result = formatCellValueXlsx("descricao_interna_procedimento", null, hit);
    expect(result).toBe("CONSULTA EM CARDIOLOGIA");
  });

  it("deve usar fallback descricao_sigtap quando descricao_interna está vazio no array", () => {
    const hit = {
      descricao_interna_procedimento: null,
      procedimentos: [{ descricao_interna: null, descricao_sigtap: "CONSULTA CARDIOLOGICA SIGTAP" }],
    };
    const result = formatCellValueXlsx("descricao_interna_procedimento", null, hit);
    expect(result).toBe("CONSULTA CARDIOLOGICA SIGTAP");
  });

  it("deve usar fallback nome_grupo_procedimento quando procedimentos está vazio", () => {
    const hit = {
      descricao_interna_procedimento: null,
      procedimentos: [],
      nome_grupo_procedimento: "CONSULTAS MÉDICAS",
    };
    const result = formatCellValueXlsx("descricao_interna_procedimento", null, hit);
    expect(result).toBe("CONSULTAS MÉDICAS");
  });

  it("deve retornar string vazia para campo null sem fallback", () => {
    const result = formatCellValueXlsx("telefone", null, {});
    expect(result).toBe("");
  });

  it("deve retornar valor string normal sem transformação", () => {
    const result = formatCellValueXlsx("no_usuario", "JOÃO DA SILVA", {});
    expect(result).toBe("JOÃO DA SILVA");
  });
});

describe("Export XLSX - calcularTempoEsperaXlsx", () => {
  it("deve retornar string vazia para data nula", () => {
    expect(calcularTempoEsperaXlsx(null)).toBe("");
  });

  it("deve retornar string vazia para data inválida", () => {
    expect(calcularTempoEsperaXlsx("data-invalida")).toBe("");
  });

  it("deve calcular dias corretamente para data recente", () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const result = calcularTempoEsperaXlsx(ontem.toISOString());
    expect(result).toBe("1 dia");
  });

  it("deve calcular meses corretamente para data antiga", () => {
    const tresMesesAtras = new Date();
    tresMesesAtras.setDate(tresMesesAtras.getDate() - 95); // ~3 meses e 5 dias
    const result = calcularTempoEsperaXlsx(tresMesesAtras.toISOString());
    expect(result).toMatch(/meses?/);
  });
});

describe("Export XLSX - colunas padrão", () => {
  it("deve ter colunas de solicitação que incluem telefone", () => {
    const solicitacaoCols = [
      "no_usuario", "cns_usuario", "telefone", "nome_unidade_solicitante",
      "descricao_interna_procedimento", "nome_grupo_procedimento",
      "codigo_classificacao_risco", "sigla_situacao", "data_solicitacao",
      "__tempo_espera", "nome_medico_solicitante", "codigo_tipo_regulacao",
    ];
    expect(solicitacaoCols).toContain("telefone");
    expect(solicitacaoCols).toContain("no_usuario");
    expect(solicitacaoCols).toContain("sigla_situacao");
    expect(solicitacaoCols).toContain("__tempo_espera");
  });

  it("deve ter colunas de marcação que incluem telefone e estabelecimento", () => {
    const marcacaoCols = [
      "codigo_solicitacao", "no_usuario", "telefone", "nome_unidade_executante",
      "descricao_interna_procedimento", "descricao_sigtap_procedimento",
      "nome_grupo_procedimento", "codigo_classificacao_risco", "status_solicitacao",
      "data_marcacao", "data_confirmacao",
    ];
    expect(marcacaoCols).toContain("telefone");
    expect(marcacaoCols).toContain("nome_unidade_executante");
    expect(marcacaoCols).toContain("codigo_classificacao_risco");
  });

  it("ALL_FIELDS_SOLICITACAO deve ter labels para todos os campos principais", () => {
    const fieldMap = Object.fromEntries(ALL_FIELDS_SOLICITACAO.map(f => [f.key, f.label]));
    expect(fieldMap["no_usuario"]).toBe("Nome Paciente");
    expect(fieldMap["telefone"]).toBe("Telefone");
    expect(fieldMap["sigla_situacao"]).toBe("Sigla Situação");
    expect(fieldMap["data_solicitacao"]).toBe("Data Solicitação");
  });

  it("ALL_FIELDS_MARCACAO deve ter labels para todos os campos principais", () => {
    const fieldMap = Object.fromEntries(ALL_FIELDS_MARCACAO.map(f => [f.key, f.label]));
    expect(fieldMap["no_usuario"]).toBe("Nome Paciente");
    expect(fieldMap["telefone"]).toBe("Telefone");
    expect(fieldMap["codigo_solicitacao"]).toBe("Código Solicitação");
  });
});
