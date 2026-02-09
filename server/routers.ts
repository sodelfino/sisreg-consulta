import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getSisregConfig,
  upsertSisregConfig,
  deleteSisregConfig,
  decryptPassword,
  createQueryLog,
  getQueryLogs,
  getFieldSelections,
  createFieldSelection,
  updateFieldSelection,
  deleteFieldSelection,
} from "./db";
import { executeSisregSearch, testSisregConnection } from "./sisreg";
import { exploreIndex, exploreFieldValues, exploreMapping } from "./explore-index";
import { IndexType, QueryMode } from "../shared/sisreg";
import { invokeLLM } from "./_core/llm";
import * as XLSX from "xlsx";

const indexTypeSchema = z.enum(["marcacao", "solicitacao"]);
const queryModeSchema = z.enum(["quick", "novas", "agendadas", "atendidas", "fila"]);

// Shared search input schema
const searchInputSchema = z.object({
  indexType: indexTypeSchema.default("marcacao"),
  mode: queryModeSchema,
  size: z.number().min(1).max(10000).default(100),
  from: z.number().min(0).default(0),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  codigoCentralReguladora: z.array(z.string()).optional(),
  selectedFields: z.array(z.string()).optional(),
  procedimentoSearch: z.string().optional(),
  riscoFilter: z.array(z.string()).optional(),
  situacaoFilter: z.array(z.string()).optional(),
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // SISREG Configuration
  config: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const config = await getSisregConfig(ctx.user.id);
      if (!config) return null;
      return {
        baseUrl: config.baseUrl,
        username: config.username,
        hasPassword: true,
      };
    }),

    save: protectedProcedure
      .input(z.object({
        baseUrl: z.string().url(),
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertSisregConfig(ctx.user.id, input);
        return { success: true };
      }),

    delete: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteSisregConfig(ctx.user.id);
      return { success: true };
    }),

    test: protectedProcedure
      .input(z.object({
        indexType: indexTypeSchema.default("marcacao"),
      }).optional())
      .mutation(async ({ ctx }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return { ok: false, message: "Configuração não encontrada. Configure suas credenciais primeiro." };
        }
        const password = decryptPassword(config.encryptedPassword);
        return testSisregConnection({
          baseUrl: config.baseUrl,
          username: config.username,
          password,
        });
      }),
  }),

  // SISREG Exploration (para descobrir campos e valores)
  explore: router({
    sampleDoc: protectedProcedure
      .input(z.object({
        indexType: indexTypeSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return { ok: false, doc: null, errorMessage: "Configuração não encontrada." };
        }
        const password = decryptPassword(config.encryptedPassword);
        const indexPath = input.indexType === "marcacao" 
          ? "/marcacao-ambulatorial-rj-macae/_search"
          : "/solicitacao-ambulatorial-rj-macae/_search";
        const result = await exploreIndex(
          { baseUrl: config.baseUrl, username: config.username, password },
          indexPath,
          1
        );
        if (!result.ok || result.samples.length === 0) {
          return { ok: false, doc: null, errorMessage: result.errorMessage || "Nenhum documento encontrado" };
        }
        return { ok: true, doc: result.samples[0], errorMessage: undefined };
      }),

    index: protectedProcedure
      .input(z.object({
        indexType: indexTypeSchema,
        size: z.number().min(1).max(100).default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return { ok: false, total: 0, samples: [], fields: [], errorMessage: "Configuração não encontrada." };
        }
        const password = decryptPassword(config.encryptedPassword);
        const indexPath = input.indexType === "marcacao" 
          ? "/marcacao-ambulatorial-rj-macae/_search"
          : "/solicitacao-ambulatorial-rj-macae/_search";
        return exploreIndex(
          { baseUrl: config.baseUrl, username: config.username, password },
          indexPath,
          input.size
        );
      }),

    fieldValues: protectedProcedure
      .input(z.object({
        indexType: indexTypeSchema,
        fieldName: z.string(),
        size: z.number().min(1).max(1000).default(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return { ok: false, values: [], errorMessage: "Configuração não encontrada." };
        }
        const password = decryptPassword(config.encryptedPassword);
        const indexPath = input.indexType === "marcacao" 
          ? "/marcacao-ambulatorial-rj-macae/_search"
          : "/solicitacao-ambulatorial-rj-macae/_search";
        return exploreFieldValues(
          { baseUrl: config.baseUrl, username: config.username, password },
          indexPath,
          input.fieldName,
          input.size
        );
      }),

    mapping: protectedProcedure
      .input(z.object({
        indexType: indexTypeSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return { ok: false, mapping: {}, errorMessage: "Configuração não encontrada." };
        }
        const password = decryptPassword(config.encryptedPassword);
        const indexName = input.indexType === "marcacao" 
          ? "marcacao-ambulatorial-rj-macae"
          : "solicitacao-ambulatorial-rj-macae";
        return exploreMapping(
          { baseUrl: config.baseUrl, username: config.username, password },
          indexName
        );
      }),
  }),

  // SISREG Search
  search: router({
    execute: protectedProcedure
      .input(searchInputSchema)
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return {
            ok: false,
            status: 0,
            total: 0,
            hits: [],
            errorMessage: "Configuração não encontrada. Configure suas credenciais primeiro.",
          };
        }

        const password = decryptPassword(config.encryptedPassword);
        
        const result = await executeSisregSearch(
          { baseUrl: config.baseUrl, username: config.username, password },
          {
            indexType: input.indexType,
            mode: input.mode,
            size: Math.min(input.size, 1000),
            from: input.from,
            dateStart: input.dateStart,
            dateEnd: input.dateEnd,
            codigoCentralReguladora: input.codigoCentralReguladora,
            selectedFields: input.selectedFields,
            procedimentoSearch: input.procedimentoSearch,
            riscoFilter: input.riscoFilter,
            situacaoFilter: input.situacaoFilter,
          }
        );

        // Log the query (without credentials)
        await createQueryLog({
          userId: ctx.user.id,
          queryMode: input.mode,
          indexType: input.indexType,
          dateStart: input.dateStart || null,
          dateEnd: input.dateEnd || null,
          size: input.size,
          from: input.from,
          totalHits: result.total,
          httpStatus: result.status,
          took: result.took || null,
          errorMessage: result.errorMessage || null,
        });

        return result;
      }),

    // Export XLSX - fetches ALL records from the filter (not just one page)
    exportXlsx: protectedProcedure
      .input(searchInputSchema.extend({
        exportAllPages: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return { ok: false, error: "Configuração não encontrada.", data: null };
        }

        const password = decryptPassword(config.encryptedPassword);
        const credentials = { baseUrl: config.baseUrl, username: config.username, password };

        // Fetch all records via pagination
        const allHits: Record<string, unknown>[] = [];
        let totalRecords = 0;
        const batchSize = 1000;
        let currentFrom = 0;
        const maxRecords = 10000; // Safety limit

        if (input.exportAllPages) {
          // First request to get total
          const firstResult = await executeSisregSearch(credentials, {
            ...input,
            size: batchSize,
            from: 0,
          });

          if (!firstResult.ok) {
            return { ok: false, error: firstResult.errorMessage || "Erro na consulta.", data: null };
          }

          totalRecords = firstResult.total;
          allHits.push(...firstResult.hits);
          currentFrom = batchSize;

          // Fetch remaining pages
          while (currentFrom < Math.min(totalRecords, maxRecords) && allHits.length < maxRecords) {
            const pageResult = await executeSisregSearch(credentials, {
              ...input,
              size: batchSize,
              from: currentFrom,
            });
            if (!pageResult.ok || pageResult.hits.length === 0) break;
            allHits.push(...pageResult.hits);
            currentFrom += batchSize;
          }
        } else {
          const result = await executeSisregSearch(credentials, input);
          if (!result.ok) {
            return { ok: false, error: result.errorMessage || "Erro na consulta.", data: null };
          }
          allHits.push(...result.hits);
          totalRecords = result.total;
        }

        // Build XLSX with multiple sheets
        const wb = XLSX.utils.book_new();

        // Sheet 1: "Dados" - all records
        if (allHits.length > 0) {
          // Get all unique keys from hits
          const allKeys = new Set<string>();
          for (const hit of allHits) {
            Object.keys(hit).forEach(k => allKeys.add(k));
          }
          const headers = Array.from(allKeys).sort();
          
          const wsData = [headers];
          for (const hit of allHits) {
            wsData.push(headers.map(h => {
              const val = hit[h];
              return val === null || val === undefined ? "" : String(val);
            }));
          }
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          XLSX.utils.book_append_sheet(wb, ws, "Dados");
        }

        // Sheet 2: "Filtros" - parameters used
        const filtrosData = [
          ["Parâmetro", "Valor"],
          ["Tipo de Índice", input.indexType === "marcacao" ? "Marcações Ambulatoriais" : "Solicitações Ambulatoriais"],
          ["Modo", input.mode],
          ["Data Início", input.dateStart || "Não informado"],
          ["Data Fim", input.dateEnd || "Não informado"],
          ["Busca Procedimento", input.procedimentoSearch || "Nenhum"],
          ["Filtro Risco", input.riscoFilter?.join(", ") || "Todos"],
          ["Filtro Situação", input.situacaoFilter?.join(", ") || "Todos"],
          ["Central Reguladora", input.codigoCentralReguladora?.join(", ") || "Padrão"],
          ["Total de Registros", String(totalRecords)],
          ["Registros Exportados", String(allHits.length)],
          ["Data da Exportação", new Date().toLocaleString("pt-BR")],
        ];
        const wsFiltros = XLSX.utils.aoa_to_sheet(filtrosData);
        XLSX.utils.book_append_sheet(wb, wsFiltros, "Filtros");

        // Sheet 3: "Resumo" - aggregations
        if (allHits.length > 0) {
          const statusField = input.indexType === "solicitacao" ? "sigla_situacao" : "status_solicitacao";
          const unidadeField = input.indexType === "solicitacao" ? "nome_unidade_solicitante" : "nome_unidade_executante";
          
          const byStatus: Record<string, number> = {};
          const byUnidade: Record<string, number> = {};
          const byProcedimento: Record<string, number> = {};
          const byRisco: Record<string, number> = {};

          for (const hit of allHits) {
            const status = String(hit[statusField] || "N/A");
            byStatus[status] = (byStatus[status] || 0) + 1;

            const unidade = String(hit[unidadeField] || "N/A");
            if (unidade !== "N/A") byUnidade[unidade] = (byUnidade[unidade] || 0) + 1;

            const proc = String(hit.descricao_interna_procedimento || hit.nome_grupo_procedimento || "N/A");
            if (proc !== "N/A") byProcedimento[proc] = (byProcedimento[proc] || 0) + 1;

            const risco = String(hit.codigo_classificacao_risco || "N/A");
            byRisco[risco] = (byRisco[risco] || 0) + 1;
          }

          const resumoData: (string | number)[][] = [["Categoria", "Item", "Quantidade", "Percentual"]];
          
          const addSection = (category: string, data: Record<string, number>) => {
            const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
            const total = sorted.reduce((sum, [, v]) => sum + v, 0);
            for (const [name, count] of sorted) {
              resumoData.push([category, name, count, `${((count / total) * 100).toFixed(1)}%`]);
            }
          };

          addSection("Status", byStatus);
          addSection("Unidade", byUnidade);
          addSection("Procedimento", byProcedimento);
          addSection("Risco", byRisco);

          const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
          XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
        }

        // Convert to base64
        const xlsxBuffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

        return {
          ok: true,
          error: null,
          data: {
            base64: xlsxBuffer,
            filename: `sisreg_${input.indexType}_${input.mode}_${new Date().toISOString().slice(0, 10)}.xlsx`,
            totalExported: allHits.length,
            totalAvailable: totalRecords,
          },
        };
      }),

    logs: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return getQueryLogs(ctx.user.id, input?.limit || 50);
      }),
  }),

  // Field Selections
  fields: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getFieldSelections(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        fields: z.array(z.string()),
        isDefault: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        await createFieldSelection({
          userId: ctx.user.id,
          name: input.name,
          fields: input.fields,
          isDefault: input.isDefault ? 1 : 0,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        fields: z.array(z.string()).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData: { name?: string; fields?: string[]; isDefault?: number } = {};
        if (input.name) updateData.name = input.name;
        if (input.fields) updateData.fields = input.fields;
        if (input.isDefault !== undefined) updateData.isDefault = input.isDefault ? 1 : 0;
        await updateFieldSelection(input.id, ctx.user.id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteFieldSelection(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Dashboard Aggregation
  dashboard: router({
    aggregate: protectedProcedure
      .input(z.object({
        indexType: indexTypeSchema.default("marcacao"),
        mode: queryModeSchema,
        dateStart: z.string().optional(),
        dateEnd: z.string().optional(),
        procedimentoFilter: z.array(z.string()).optional(),
        riscoFilter: z.array(z.string()).optional(),
        situacaoFilter: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return { ok: false, error: "Configuração não encontrada.", data: null };
        }

        const password = decryptPassword(config.encryptedPassword);
        
        // Fetch dataset for aggregation (up to 10000 via pagination)
        const credentials = { baseUrl: config.baseUrl, username: config.username, password };
        const allHits: Record<string, unknown>[] = [];
        let totalRecords = 0;
        const batchSize = 1000;
        let currentFrom = 0;

        const firstResult = await executeSisregSearch(credentials, {
          indexType: input.indexType,
          mode: input.mode,
          size: batchSize,
          from: 0,
          dateStart: input.dateStart,
          dateEnd: input.dateEnd,
          riscoFilter: input.riscoFilter,
          situacaoFilter: input.situacaoFilter,
        });

        if (!firstResult.ok) {
          return { ok: false, error: firstResult.errorMessage || "Erro na consulta.", data: null };
        }

        totalRecords = firstResult.total;
        allHits.push(...firstResult.hits);
        currentFrom = batchSize;

        // Fetch up to 5000 for dashboard aggregation
        while (currentFrom < Math.min(totalRecords, 5000) && allHits.length < 5000) {
          const pageResult = await executeSisregSearch(credentials, {
            indexType: input.indexType,
            mode: input.mode,
            size: batchSize,
            from: currentFrom,
            dateStart: input.dateStart,
            dateEnd: input.dateEnd,
            riscoFilter: input.riscoFilter,
            situacaoFilter: input.situacaoFilter,
          });
          if (!pageResult.ok || pageResult.hits.length === 0) break;
          allHits.push(...pageResult.hits);
          currentFrom += batchSize;
        }

        // Filter by procedimento if specified
        let filteredHits = allHits;
        if (input.procedimentoFilter && input.procedimentoFilter.length > 0) {
          filteredHits = allHits.filter((hit) => {
            const proc = String(hit.descricao_interna_procedimento || hit.nome_grupo_procedimento || "");
            return input.procedimentoFilter!.some(f => proc.toLowerCase().includes(f.toLowerCase()));
          });
        }

        // Aggregate
        const unidadeField = input.indexType === "solicitacao" ? "nome_unidade_solicitante" : "nome_unidade_executante";
        const statusField = input.indexType === "solicitacao" ? "sigla_situacao" : "status_solicitacao";
        const byUnidade: Record<string, number> = {};
        const byProcedimento: Record<string, number> = {};
        const byRisco: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const allProcedimentos: Set<string> = new Set();

        for (const hit of filteredHits) {
          const unidade = String(hit[unidadeField] || "N/A");
          if (unidade !== "N/A") byUnidade[unidade] = (byUnidade[unidade] || 0) + 1;

          const proc = String(hit.descricao_interna_procedimento || hit.nome_grupo_procedimento || "N/A");
          if (proc !== "N/A") {
            byProcedimento[proc] = (byProcedimento[proc] || 0) + 1;
            allProcedimentos.add(proc);
          }

          const risco = String(hit.codigo_classificacao_risco || "N/A");
          byRisco[risco] = (byRisco[risco] || 0) + 1;

          const status = String(hit[statusField] || hit.sigla_situacao || "N/A");
          byStatus[status] = (byStatus[status] || 0) + 1;
        }

        // Generate auto-insights
        const insightsList: string[] = [];
        
        // Total
        insightsList.push(`**Total de registros:** ${filteredHits.length.toLocaleString("pt-BR")} de ${totalRecords.toLocaleString("pt-BR")} disponíveis`);

        // Top unidade
        const topUnidades = Object.entries(byUnidade).sort((a, b) => b[1] - a[1]);
        if (topUnidades.length > 0) {
          const topPct = ((topUnidades[0][1] / filteredHits.length) * 100).toFixed(1);
          insightsList.push(`**Unidade com mais registros:** ${topUnidades[0][0]} (${topUnidades[0][1]} — ${topPct}%)`);
          
          // Alert: concentration
          if (Number(topPct) > 40) {
            insightsList.push(`⚠️ **Alerta de concentração:** ${topUnidades[0][0]} concentra ${topPct}% dos registros`);
          }
        }

        // Top procedimento
        const topProcs = Object.entries(byProcedimento).sort((a, b) => b[1] - a[1]);
        if (topProcs.length > 0) {
          insightsList.push(`**Procedimento mais frequente:** ${topProcs[0][0]} (${topProcs[0][1]} registros)`);
        }

        // Risk distribution
        const totalRisco = Object.values(byRisco).reduce((s, v) => s + v, 0);
        const riscoAlto = (byRisco["0"] || 0) + (byRisco["1"] || 0);
        if (riscoAlto > 0) {
          const pctAlto = ((riscoAlto / totalRisco) * 100).toFixed(1);
          insightsList.push(`**Risco alto (Emergência + Urgência):** ${riscoAlto} registros (${pctAlto}%)`);
          if (Number(pctAlto) > 30) {
            insightsList.push(`⚠️ **Alerta:** ${pctAlto}% dos registros são de risco alto — pode indicar gargalo na regulação`);
          }
        }

        // Status distribution insight
        const topStatus = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);
        if (topStatus.length > 0) {
          insightsList.push(`**Status predominante:** ${topStatus[0][0]} (${topStatus[0][1]} — ${((topStatus[0][1] / filteredHits.length) * 100).toFixed(1)}%)`);
        }

        return {
          ok: true,
          error: null,
          data: {
            total: filteredHits.length,
            totalUnfiltered: totalRecords,
            byUnidade: topUnidades.slice(0, 15).map(([name, value]) => ({ name, value })),
            byProcedimento: topProcs.slice(0, 15).map(([name, value]) => ({ name, value })),
            byRisco: Object.entries(byRisco).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
            byStatus: topStatus.map(([name, value]) => ({ name, value })),
            allProcedimentos: Array.from(allProcedimentos).sort(),
            autoInsights: insightsList,
          },
        };
      }),
  }),

  // LLM Insights
  insights: router({
    generate: protectedProcedure
      .input(z.object({
        data: z.array(z.record(z.string(), z.unknown())),
        queryMode: queryModeSchema,
        indexType: indexTypeSchema.default("marcacao"),
        dateStart: z.string().optional(),
        dateEnd: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.data.length === 0) {
          return { ok: false, insights: "", error: "Nenhum dado para análise." };
        }

        const total = input.data.length;
        const statusCounts: Record<string, number> = {};
        const unidadeCounts: Record<string, number> = {};
        const procedimentoCounts: Record<string, number> = {};
        const riskCounts: Record<string, number> = {};

        for (const item of input.data) {
          const status = String(item.status_solicitacao || item.sigla_situacao || "N/A");
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          const unidade = String(item.nome_unidade_executante || item.nome_unidade_solicitante || "N/A");
          if (unidade !== "N/A") unidadeCounts[unidade] = (unidadeCounts[unidade] || 0) + 1;

          const proc = String(item.descricao_interna_procedimento || item.nome_grupo_procedimento || "N/A");
          if (proc !== "N/A") procedimentoCounts[proc] = (procedimentoCounts[proc] || 0) + 1;

          const risk = String(item.codigo_classificacao_risco || "N/A");
          riskCounts[risk] = (riskCounts[risk] || 0) + 1;
        }

        const indexLabel = input.indexType === "solicitacao" ? "solicitação ambulatorial (fila)" : "marcação ambulatorial";

        const context = `
Análise de dados de ${indexLabel} do SISREG (Sistema de Regulação) - Macaé/RJ.
Tipo de consulta: ${input.queryMode}
Período: ${input.dateStart || "N/A"} a ${input.dateEnd || "N/A"}
Total de registros: ${total}

Distribuição por Status:
${Object.entries(statusCounts).map(([k, v]) => `- ${k}: ${v} (${((v/total)*100).toFixed(1)}%)`).join("\n")}

Top 10 Unidades:
${Object.entries(unidadeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Top 10 Procedimentos:
${Object.entries(procedimentoCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Distribuição por Classificação de Risco:
${Object.entries(riskCounts).map(([k, v]) => `- Risco ${k}: ${v} (${((v/total)*100).toFixed(1)}%)`).join("\n")}
`;

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Você é um especialista em regulação de saúde pública e análise de dados do SISREG (Sistema Nacional de Regulação).
Sua tarefa é analisar dados de ${indexLabel} e fornecer insights úteis para gestores de saúde.
Responda sempre em português brasileiro, de forma clara e objetiva.
Foque em:
1. Padrões identificados nos dados
2. Possíveis gargalos ou problemas
3. Sugestões de otimização do fluxo de regulação
4. Alertas sobre situações que requerem atenção
Seja conciso mas informativo. Use formatação markdown para melhor legibilidade.`,
              },
              {
                role: "user",
                content: `Analise os seguintes dados de ${indexLabel} e forneça insights relevantes:\n\n${context}`,
              },
            ],
          });

          const content = response.choices?.[0]?.message?.content;
          const insights = typeof content === 'string' ? content : "Não foi possível gerar insights.";

          return { ok: true, insights, error: null };
        } catch (error) {
          console.error("[LLM] Error generating insights:", error);
          return { ok: false, insights: "", error: "Erro ao gerar insights. Tente novamente." };
        }
      }),
  }),

  // Métricas gerenciais para dashboard
  metrics: router({
    // Calcular tempo médio de espera por procedimento
    averageWaitTime: protectedProcedure
      .input(z.object({
        dateStart: z.string().optional(),
        dateEnd: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        try {
          const config = await getSisregConfig(ctx.user.id);
          if (!config) {
            return { ok: false, data: [], error: "Credenciais SISREG não configuradas" };
          }

          const credentials = {
            baseUrl: config.baseUrl,
            username: config.username,
            password: decryptPassword(config.encryptedPassword),
          };

          // Buscar todas as solicitações na fila
          const result = await executeSisregSearch(credentials, {
            indexType: "solicitacao",
            mode: "fila",
            size: 10000, // Máximo para análise
            from: 0,
            dateStart: input.dateStart,
            dateEnd: input.dateEnd,
          });

          if (!result.ok) {
            return { ok: false, data: [], error: result.errorMessage };
          }

          // Agrupar por procedimento e calcular tempo médio
          const procedimentoMap = new Map<string, { total: number; count: number; codigo: string }>();
          const now = new Date();

          result.hits.forEach((hit: any) => {
            const descricao = hit.descricao_interna_procedimento || 
                             hit.descricao_sigtap_procedimento || 
                             hit.nome_grupo_procedimento || 
                             "Sem descrição";
            const codigo = hit.codigo_interno_procedimento || "";
            const dataSolicitacao = hit.data_solicitacao;

            if (dataSolicitacao) {
              const solicitacaoDate = new Date(dataSolicitacao);
              const diasEspera = Math.floor((now.getTime() - solicitacaoDate.getTime()) / (1000 * 60 * 60 * 24));

              if (!procedimentoMap.has(descricao)) {
                procedimentoMap.set(descricao, { total: 0, count: 0, codigo });
              }
              const entry = procedimentoMap.get(descricao)!;
              entry.total += diasEspera;
              entry.count += 1;
            }
          });

          // Converter para array e calcular média
          const data = Array.from(procedimentoMap.entries()).map(([descricao, stats]) => ({
            descricao,
            codigo: stats.codigo,
            mediaDias: Math.round(stats.total / stats.count),
            totalSolicitacoes: stats.count,
          }));

          // Ordenar por média de dias (maior primeiro)
          data.sort((a, b) => b.mediaDias - a.mediaDias);

          return { ok: true, data, error: null };
        } catch (error) {
          console.error("[Metrics] Error calculating average wait time:", error);
          return { ok: false, data: [], error: "Erro ao calcular tempo médio de espera" };
        }
      }),

    // Top 10 procedimentos mais solicitados
    topProcedures: protectedProcedure
      .input(z.object({
        dateStart: z.string().optional(),
        dateEnd: z.string().optional(),
        limit: z.number().min(1).max(50).default(10),
      }))
      .query(async ({ ctx, input }) => {
        try {
          const config = await getSisregConfig(ctx.user.id);
          if (!config) {
            return { ok: false, data: [], error: "Credenciais SISREG não configuradas" };
          }

          const credentials = {
            baseUrl: config.baseUrl,
            username: config.username,
            password: decryptPassword(config.encryptedPassword),
          };

          // Buscar todas as solicitações na fila
          const result = await executeSisregSearch(credentials, {
            indexType: "solicitacao",
            mode: "fila",
            size: 10000,
            from: 0,
            dateStart: input.dateStart,
            dateEnd: input.dateEnd,
          });

          if (!result.ok) {
            return { ok: false, data: [], error: result.errorMessage };
          }

          // Contar solicitações por procedimento
          const procedimentoCount = new Map<string, { count: number; codigo: string }>();

          result.hits.forEach((hit: any) => {
            const descricao = hit.descricao_interna_procedimento || 
                             hit.descricao_sigtap_procedimento || 
                             hit.nome_grupo_procedimento || 
                             "Sem descrição";
            const codigo = hit.codigo_interno_procedimento || "";

            if (!procedimentoCount.has(descricao)) {
              procedimentoCount.set(descricao, { count: 0, codigo });
            }
            procedimentoCount.get(descricao)!.count += 1;
          });

          // Converter para array e ordenar
          const data = Array.from(procedimentoCount.entries())
            .map(([descricao, stats]) => ({
              descricao,
              codigo: stats.codigo,
              total: stats.count,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, input.limit);

          return { ok: true, data, error: null };
        } catch (error) {
          console.error("[Metrics] Error calculating top procedures:", error);
          return { ok: false, data: [], error: "Erro ao calcular procedimentos mais solicitados" };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
