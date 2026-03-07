import { describe, it, expect } from "vitest";

describe("Filtro Multi-Select de Procedimentos", () => {
  it("deve extrair procedimentos únicos de um array de solicitações", () => {
    const mockHits = [
      {
        procedimentos: [
          {
            descricao_interna: "USG TRANSVAGINAL",
            descricao_sigtap: "ULTRASSONOGRAFIA TRANSVAGINAL",
            codigo_interno: "0231021",
          },
        ],
      },
      {
        procedimentos: [
          {
            descricao_interna: "CONSULTA CARDIOLOGIA",
            descricao_sigtap: "CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA",
            codigo_interno: "0101010",
          },
        ],
      },
      {
        procedimentos: [
          {
            descricao_interna: "USG TRANSVAGINAL",
            descricao_sigtap: "ULTRASSONOGRAFIA TRANSVAGINAL",
            codigo_interno: "0231021",
          },
        ],
      },
    ];

    const procedimentosSet = new Set<string>();
    mockHits.forEach((hit) => {
      if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
        const proc = hit.procedimentos[0];
        if (proc.descricao_interna) {
          procedimentosSet.add(proc.descricao_interna);
        } else if (proc.descricao_sigtap) {
          procedimentosSet.add(proc.descricao_sigtap);
        }
      }
    });

    const data = Array.from(procedimentosSet)
      .sort((a, b) => a.localeCompare(b))
      .map((descricao) => ({ value: descricao, label: descricao }));

    expect(data).toHaveLength(2);
    expect(data[0].label).toBe("CONSULTA CARDIOLOGIA");
    expect(data[1].label).toBe("USG TRANSVAGINAL");
  });

  it("deve usar fallback para descricao_sigtap quando descricao_interna estiver vazia", () => {
    const mockHits = [
      {
        procedimentos: [
          {
            descricao_interna: "",
            descricao_sigtap: "CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA",
            codigo_interno: "0101010",
          },
        ],
      },
    ];

    const procedimentosSet = new Set<string>();
    mockHits.forEach((hit) => {
      if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
        const proc = hit.procedimentos[0];
        if (proc.descricao_interna) {
          procedimentosSet.add(proc.descricao_interna);
        } else if (proc.descricao_sigtap) {
          procedimentosSet.add(proc.descricao_sigtap);
        }
      }
    });

    const data = Array.from(procedimentosSet).map((descricao) => ({ value: descricao, label: descricao }));

    expect(data).toHaveLength(1);
    expect(data[0].label).toBe("CONSULTA MÉDICA EM ATENÇÃO ESPECIALIZADA");
  });

  it("deve retornar array vazio quando não houver procedimentos", () => {
    const mockHits = [
      {
        procedimentos: [],
      },
      {
        procedimentos: null,
      },
    ];

    const procedimentosSet = new Set<string>();
    mockHits.forEach((hit) => {
      if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
        const proc = hit.procedimentos[0];
        if (proc.descricao_interna) {
          procedimentosSet.add(proc.descricao_interna);
        } else if (proc.descricao_sigtap) {
          procedimentosSet.add(proc.descricao_sigtap);
        }
      }
    });

    const data = Array.from(procedimentosSet);
    expect(data).toHaveLength(0);
  });

  it("deve ordenar procedimentos alfabeticamente", () => {
    const mockHits = [
      {
        procedimentos: [{ descricao_interna: "ZEBRA PROCEDURE", descricao_sigtap: "", codigo_interno: "" }],
      },
      {
        procedimentos: [{ descricao_interna: "APPLE PROCEDURE", descricao_sigtap: "", codigo_interno: "" }],
      },
      {
        procedimentos: [{ descricao_interna: "MIDDLE PROCEDURE", descricao_sigtap: "", codigo_interno: "" }],
      },
    ];

    const procedimentosSet = new Set<string>();
    mockHits.forEach((hit) => {
      if (hit.procedimentos && Array.isArray(hit.procedimentos) && hit.procedimentos.length > 0) {
        const proc = hit.procedimentos[0];
        if (proc.descricao_interna) {
          procedimentosSet.add(proc.descricao_interna);
        }
      }
    });

    const data = Array.from(procedimentosSet)
      .sort((a, b) => a.localeCompare(b))
      .map((descricao) => ({ value: descricao, label: descricao }));

    expect(data[0].label).toBe("APPLE PROCEDURE");
    expect(data[1].label).toBe("MIDDLE PROCEDURE");
    expect(data[2].label).toBe("ZEBRA PROCEDURE");
  });
});
