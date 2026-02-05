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
import { IndexType, QueryMode } from "../shared/sisreg";
import { invokeLLM } from "./_core/llm";

const indexTypeSchema = z.enum(["marcacao", "solicitacao"]);
const queryModeSchema = z.enum(["quick", "novas", "agendadas", "atendidas"]);

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
      
      // Return config without password
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
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return { ok: false, message: "Configuração não encontrada. Configure suas credenciais primeiro." };
        }

        const password = decryptPassword(config.encryptedPassword);
        return testSisregConnection(
          {
            baseUrl: config.baseUrl,
            username: config.username,
            password,
          },
          input?.indexType || "marcacao"
        );
      }),
  }),

  // SISREG Search
  search: router({
    execute: protectedProcedure
      .input(z.object({
        indexType: indexTypeSchema.default("marcacao"),
        mode: queryModeSchema,
        size: z.number().min(1).max(1000).default(100),
        from: z.number().min(0).default(0),
        dateStart: z.string().optional(),
        dateEnd: z.string().optional(),
        codigoCentralReguladora: z.array(z.string()).optional(),
        selectedFields: z.array(z.string()).optional(),
        procedimentoSearch: z.string().optional(),
      }))
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
          {
            baseUrl: config.baseUrl,
            username: config.username,
            password,
          },
          input
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
      }))
      .mutation(async ({ ctx, input }) => {
        const config = await getSisregConfig(ctx.user.id);
        if (!config) {
          return {
            ok: false,
            error: "Configuração não encontrada.",
            data: null,
          };
        }

        const password = decryptPassword(config.encryptedPassword);
        
        // Fetch a larger dataset for aggregation
        const result = await executeSisregSearch(
          {
            baseUrl: config.baseUrl,
            username: config.username,
            password,
          },
          {
            indexType: input.indexType,
            mode: input.mode,
            size: 1000,
            from: 0,
            dateStart: input.dateStart,
            dateEnd: input.dateEnd,
          }
        );

        if (!result.ok) {
          return {
            ok: false,
            error: result.errorMessage || "Erro na consulta.",
            data: null,
          };
        }

        // Filter by procedimento if specified
        let filteredHits = result.hits;
        if (input.procedimentoFilter && input.procedimentoFilter.length > 0) {
          filteredHits = result.hits.filter((hit) => {
            const proc = String(hit.descricao_interna_procedimento || hit.nome_grupo_procedimento || "");
            return input.procedimentoFilter!.some(f => proc.toLowerCase().includes(f.toLowerCase()));
          });
        }

        // Aggregate by unidade
        const unidadeField = input.indexType === "solicitacao" ? "nome_unidade_solicitante" : "nome_unidade_executante";
        const byUnidade: Record<string, number> = {};
        const byProcedimento: Record<string, number> = {};
        const byRisco: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        const allProcedimentos: Set<string> = new Set();

        for (const hit of filteredHits) {
          // By unidade
          const unidade = String(hit[unidadeField] || "N/A");
          if (unidade !== "N/A") {
            byUnidade[unidade] = (byUnidade[unidade] || 0) + 1;
          }

          // By procedimento
          const proc = String(hit.descricao_interna_procedimento || hit.nome_grupo_procedimento || "N/A");
          if (proc !== "N/A") {
            byProcedimento[proc] = (byProcedimento[proc] || 0) + 1;
            allProcedimentos.add(proc);
          }

          // By risco
          const risco = String(hit.codigo_classificacao_risco || "N/A");
          byRisco[risco] = (byRisco[risco] || 0) + 1;

          // By status
          const status = String(hit.status_solicitacao || hit.sigla_situacao || "N/A");
          byStatus[status] = (byStatus[status] || 0) + 1;
        }

        return {
          ok: true,
          error: null,
          data: {
            total: filteredHits.length,
            totalUnfiltered: result.total,
            byUnidade: Object.entries(byUnidade)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15)
              .map(([name, value]) => ({ name, value })),
            byProcedimento: Object.entries(byProcedimento)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15)
              .map(([name, value]) => ({ name, value })),
            byRisco: Object.entries(byRisco)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value]) => ({ name, value })),
            byStatus: Object.entries(byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value]) => ({ name, value })),
            allProcedimentos: Array.from(allProcedimentos).sort(),
            rawData: filteredHits,
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
          return {
            ok: false,
            insights: "",
            error: "Nenhum dado para análise.",
          };
        }

        // Prepare summary statistics
        const total = input.data.length;
        const statusCounts: Record<string, number> = {};
        const unidadeCounts: Record<string, number> = {};
        const procedimentoCounts: Record<string, number> = {};
        const riskCounts: Record<string, number> = {};

        for (const item of input.data) {
          // Count by status
          const status = String(item.status_solicitacao || item.sigla_situacao || "N/A");
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Count by unidade
          const unidade = String(item.nome_unidade_executante || item.nome_unidade_solicitante || "N/A");
          if (unidade !== "N/A") {
            unidadeCounts[unidade] = (unidadeCounts[unidade] || 0) + 1;
          }

          // Count by procedimento
          const proc = String(item.descricao_interna_procedimento || item.nome_grupo_procedimento || "N/A");
          if (proc !== "N/A") {
            procedimentoCounts[proc] = (procedimentoCounts[proc] || 0) + 1;
          }

          // Count by risk
          const risk = String(item.codigo_classificacao_risco || "N/A");
          riskCounts[risk] = (riskCounts[risk] || 0) + 1;
        }

        const indexLabel = input.indexType === "solicitacao" ? "solicitação ambulatorial" : "marcação ambulatorial";

        // Build context for LLM
        const context = `
Análise de dados de ${indexLabel} do SISREG (Sistema de Regulação).
Tipo de consulta: ${input.queryMode}
Período: ${input.dateStart || "N/A"} a ${input.dateEnd || "N/A"}
Total de registros: ${total}

Distribuição por Status:
${Object.entries(statusCounts).map(([k, v]) => `- ${k}: ${v} (${((v/total)*100).toFixed(1)}%)`).join("\n")}

Top 5 Unidades:
${Object.entries(unidadeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Top 5 Procedimentos:
${Object.entries(procedimentoCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

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

          return {
            ok: true,
            insights,
            error: null,
          };
        } catch (error) {
          console.error("[LLM] Error generating insights:", error);
          return {
            ok: false,
            insights: "",
            error: "Erro ao gerar insights. Tente novamente.",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
