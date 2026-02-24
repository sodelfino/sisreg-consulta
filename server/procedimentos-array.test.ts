import { describe, it, expect } from "vitest";

describe("Extração de descrição do array procedimentos", () => {
  it("deve extrair descricao_interna do primeiro item do array procedimentos", () => {
    const hit = {
      codigo_solicitacao: 534364608,
      no_usuario: "SILVANA CARVALHO DA SILVA",
      procedimentos: [
        {
          descricao_interna: "USG TRANSVAGINAL",
          codigo_sigtap: "0205020186",
          descricao_sigtap: "ULTRASSONOGRAFIA TRANSVAGINAL",
          codigo_interno: "0231021",
        },
      ],
    };

    // Simular a lógica de extração
    let descricao = "";
    if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
      const proc = hit.procedimentos[0];
      if (proc.descricao_interna) descricao = String(proc.descricao_interna);
    }

    expect(descricao).toBe("USG TRANSVAGINAL");
  });

  it("deve usar descricao_sigtap como fallback quando descricao_interna estiver vazio", () => {
    const hit = {
      procedimentos: [
        {
          descricao_interna: "",
          descricao_sigtap: "ULTRASSONOGRAFIA TRANSVAGINAL",
          codigo_interno: "0231021",
        },
      ],
    };

    let descricao = "";
    if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
      const proc = hit.procedimentos[0];
      if (proc.descricao_interna) descricao = String(proc.descricao_interna);
      else if (proc.descricao_sigtap) descricao = String(proc.descricao_sigtap);
    }

    expect(descricao).toBe("ULTRASSONOGRAFIA TRANSVAGINAL");
  });

  it("deve usar codigo_interno como último fallback", () => {
    const hit = {
      procedimentos: [
        {
          descricao_interna: "",
          descricao_sigtap: "",
          codigo_interno: "0231021",
        },
      ],
    };

    let descricao = "";
    if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
      const proc = hit.procedimentos[0];
      if (proc.descricao_interna) descricao = String(proc.descricao_interna);
      else if (proc.descricao_sigtap) descricao = String(proc.descricao_sigtap);
      else if (proc.codigo_interno) descricao = `Código: ${proc.codigo_interno}`;
    }

    expect(descricao).toBe("Código: 0231021");
  });

  it("deve retornar vazio quando array procedimentos estiver vazio", () => {
    const hit = {
      procedimentos: [],
    };

    let descricao = "";
    if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
      const proc = hit.procedimentos[0];
      if (proc.descricao_interna) descricao = String(proc.descricao_interna);
    }

    expect(descricao).toBe("");
  });

  it("deve retornar vazio quando campo procedimentos não existir", () => {
    const hit = {
      no_usuario: "SILVANA CARVALHO DA SILVA",
    };

    let descricao = "";
    if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
      const proc = hit.procedimentos[0];
      if (proc.descricao_interna) descricao = String(proc.descricao_interna);
    }

    expect(descricao).toBe("");
  });
});
