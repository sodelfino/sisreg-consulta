/**
 * SISREG Elasticsearch Integration Service
 * 
 * DOIS MÓDULOS SEPARADOS:
 * - Marcação Ambulatorial: /marcacao-ambulatorial-rj-macae/_search
 *   Modos: quick, novas, agendadas, atendidas
 * 
 * - Solicitação Ambulatorial (Fila): /solicitacao-ambulatorial-rj-macae/_search
 *   Modo: fila (filtro obrigatório por centrais reguladoras)
 */

import {
  SisregQueryInput,
  SisregQueryResult,
  STATUS_AGENDADAS,
  STATUS_ATENDIDAS,
  DEFAULT_FIELDS_MARCACAO,
  DEFAULT_FIELDS_SOLICITACAO,
  CENTRAIS_REGULADORAS_MACAE,
  INDEX_PATHS,
  IndexType,
  MarcacaoMode,
  SolicitacaoMode,
  isConsultaProfissionalSaude,
} from "../shared/sisreg";

interface SisregCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

function getIndexPath(indexType: IndexType): string {
  return INDEX_PATHS[indexType];
}

// ============================================================
// CONSTRUTOR DE QUERY: MARCAÇÃO AMBULATORIAL
// Endpoint: /marcacao-ambulatorial-rj-macae/_search
// Modos: quick, novas, agendadas, atendidas
// ============================================================
function buildQueryMarcacaoAmbulatorial(
  mode: MarcacaoMode,
  size: number,
  from: number,
  dateStart?: string,
  dateEnd?: string,
  codigoCentralReguladora?: string[],
  selectedFields?: string[],
  procedimentoSearch?: string,
  riscoFilter?: string[],
  situacaoFilter?: string[]
): Record<string, unknown> {
  const defaultFields = DEFAULT_FIELDS_MARCACAO;
  const modeFields = mode === "novas" ? defaultFields.novas :
                     mode === "agendadas" ? defaultFields.agendadas :
                     mode === "atendidas" ? defaultFields.atendidas :
                     defaultFields.novas;
  
  const fieldsToReturn = selectedFields && selectedFields.length > 0 
    ? selectedFields 
    : [...defaultFields.common, ...modeFields];

  const query: Record<string, unknown> = {
    size: Math.min(size, 1000),
    from,
    _source: fieldsToReturn,
  };

  const mustClauses: Record<string, unknown>[] = [];

  if (mode === "quick") {
    query.sort = [{ data_solicitacao: { order: "desc" } }];
  } else {
    // Date range based on mode
    if (dateStart && dateEnd) {
      let dateField = "data_solicitacao";
      if (mode === "agendadas") dateField = "data_aprovacao";
      if (mode === "atendidas") dateField = "data_confirmacao";

      // End-exclusive: lt nextDay para incluir o último dia inteiro
      const endDate = new Date(dateEnd + "T00:00:00");
      endDate.setDate(endDate.getDate() + 1);
      const endExclusive = endDate.toISOString().split("T")[0];
      mustClauses.push({
        range: {
          [dateField]: { gte: dateStart, lt: endExclusive },
        },
      });
    }

    // Status filter for agendadas/atendidas
    if (mode === "agendadas") {
      mustClauses.push({ terms: { "status_solicitacao.keyword": STATUS_AGENDADAS } });
    } else if (mode === "atendidas") {
      mustClauses.push({ terms: { "status_solicitacao.keyword": STATUS_ATENDIDAS } });
    }

    // Sorting
    if (mode === "novas") {
      query.sort = [{ data_solicitacao: { order: "desc" } }];
    } else if (mode === "agendadas") {
      query.sort = [{ data_aprovacao: { order: "asc" } }];
    } else if (mode === "atendidas") {
      query.sort = [{ data_confirmacao: { order: "desc" } }];
    }
  }

  // Optional filter by central reguladora
  if (codigoCentralReguladora && codigoCentralReguladora.length > 0) {
    mustClauses.push({ terms: { codigo_central_reguladora: codigoCentralReguladora } });
  }

  // Risco filter
  if (riscoFilter && riscoFilter.length > 0) {
    mustClauses.push({ terms: { "codigo_classificacao_risco": riscoFilter } });
  }

  // Situação/status filter (marcação usa status_solicitacao.keyword)
  if (situacaoFilter && situacaoFilter.length > 0) {
    mustClauses.push({ terms: { "status_solicitacao.keyword": situacaoFilter } });
  }

  // Procedimento search (marcação usa campos diretos, não nested)
  // Suporta múltiplas consultas separadas por "|" (pipe)
  if (procedimentoSearch && procedimentoSearch.trim()) {
    const rawSearch = procedimentoSearch.trim().toUpperCase();
    const searchTerms = rawSearch.includes("|") 
      ? rawSearch.split("|").map(t => t.trim()).filter(t => t.length > 0)
      : [rawSearch];
    
    if (searchTerms.length === 1) {
      const searchTerm = searchTerms[0];
      mustClauses.push({
        bool: {
          should: [
            { match_phrase: { "descricao_interna_procedimento": searchTerm } },
            { match: { "descricao_interna_procedimento": { query: searchTerm, operator: "and" } } },
            { match_phrase: { "descricao_sigtap_procedimento": searchTerm } },
            { match: { "descricao_sigtap_procedimento": { query: searchTerm, operator: "and" } } },
          ],
          minimum_should_match: 1,
        },
      });
    } else {
      // Busca múltipla: vários termos separados por "|" (OR)
      const shouldClauses = searchTerms.map(term => ({
        bool: {
          should: [
            { match_phrase: { "descricao_interna_procedimento": term } },
            { match: { "descricao_interna_procedimento": { query: term, operator: "and" } } },
            { match_phrase: { "descricao_sigtap_procedimento": term } },
            { match: { "descricao_sigtap_procedimento": { query: term, operator: "and" } } },
          ],
          minimum_should_match: 1,
        },
      }));
      mustClauses.push({
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
        },
      });
    }
  }

  if (mustClauses.length > 0) {
    query.query = { bool: { must: mustClauses } };
  }

  return query;
}

// ============================================================
// CONSTRUTOR DE QUERY: SOLICITAÇÃO AMBULATORIAL (FILA)
// Endpoint: /solicitacao-ambulatorial-rj-macae/_search
// Modo: fila
// FILTRO OBRIGATÓRIO: centrais reguladoras de Macaé
// ============================================================
function buildQuerySolicitacaoAmbulatorial(
  _mode: SolicitacaoMode,
  size: number,
  from: number,
  dateStart?: string,
  dateEnd?: string,
  _codigoCentralReguladora?: string[],
  selectedFields?: string[],
  procedimentoSearch?: string,
  riscoFilter?: string[],
  situacaoFilter?: string[]
): Record<string, unknown> {
  const defaultFields = DEFAULT_FIELDS_SOLICITACAO;
  const fieldsToReturn = selectedFields && selectedFields.length > 0 
    ? selectedFields 
    : [...defaultFields.common, ...defaultFields.fila];

  const query: Record<string, unknown> = {
    size: Math.min(size, 1000),
    from,
    _source: fieldsToReturn,
    sort: [{ data_solicitacao: { order: "asc" } }],
  };

  const mustClauses: Record<string, unknown>[] = [];

  // REMOVIDO: Filtro obrigatório de centrais reguladoras
  // Agora permite consultar TODAS as solicitações sem restrição
  
  // Filtro OPCIONAL de central reguladora (se fornecido pelo usuário)
  if (_codigoCentralReguladora && _codigoCentralReguladora.length > 0) {
    mustClauses.push({
      bool: {
        should: [
          { terms: { "codigo_central_reguladora": _codigoCentralReguladora } },
          { terms: { "codigo_central_reguladora.keyword": _codigoCentralReguladora } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  // Optional date range (end-exclusive: lt nextDay para incluir o último dia inteiro)
  if (dateStart && dateEnd) {
    const endDate = new Date(dateEnd + "T00:00:00");
    endDate.setDate(endDate.getDate() + 1);
    const endExclusive = endDate.toISOString().split("T")[0];
    mustClauses.push({
      range: { data_solicitacao: { gte: dateStart, lt: endExclusive } },
    });
  }

  // Risco filter
  if (riscoFilter && riscoFilter.length > 0) {
    mustClauses.push({ terms: { "codigo_classificacao_risco": riscoFilter } });
  }

  // Situação filter (solicitação usa sigla_situacao.keyword)
  if (situacaoFilter && situacaoFilter.length > 0) {
    mustClauses.push({ terms: { "sigla_situacao.keyword": situacaoFilter } });
  }

  // Procedimento search com múltiplos campos (busca por frase)
  // Suporta múltiplas consultas separadas por "|" (pipe)
  if (procedimentoSearch && procedimentoSearch.trim()) {
    const rawSearch = procedimentoSearch.trim().toUpperCase();
    const searchTerms = rawSearch.includes("|") 
      ? rawSearch.split("|").map(t => t.trim()).filter(t => t.length > 0)
      : [rawSearch];
    
    if (searchTerms.length === 1) {
      // Busca simples: um único termo
      const searchTerm = searchTerms[0];
      mustClauses.push({
        nested: {
          path: "procedimentos",
          query: {
            bool: {
              should: [
                { match_phrase: { "procedimentos.descricao_interna": searchTerm } },
                { match: { "procedimentos.descricao_interna": { query: searchTerm, operator: "and" } } },
                { match_phrase: { "procedimentos.descricao_sigtap": searchTerm } },
                { match: { "procedimentos.descricao_sigtap": { query: searchTerm, operator: "and" } } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      });
    } else {
      // Busca múltipla: vários termos separados por "|" (OR)
      // Cada termo é uma consulta profissional selecionada
      const shouldClauses = searchTerms.map(term => ({
        nested: {
          path: "procedimentos",
          query: {
            bool: {
              should: [
                { match_phrase: { "procedimentos.descricao_interna": term } },
                { match: { "procedimentos.descricao_interna": { query: term, operator: "and" } } },
                { match_phrase: { "procedimentos.descricao_sigtap": term } },
                { match: { "procedimentos.descricao_sigtap": { query: term, operator: "and" } } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      }));
      mustClauses.push({
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
        },
      });
    }
  }

  if (mustClauses.length > 0) {
    query.query = { bool: { must: mustClauses } };
  } else {
    // Sem filtros: match_all para retornar todos os documentos
    query.query = { match_all: {} };
  }
  
  return query;
}

/**
 * Main query builder - delegates to specific builders based on indexType
 */
function buildElasticsearchQuery(input: SisregQueryInput): Record<string, unknown> {
  const { indexType, mode, size, from = 0, dateStart, dateEnd, codigoCentralReguladora, selectedFields, procedimentoSearch, riscoFilter, situacaoFilter } = input;

  if (indexType === "marcacao") {
    return buildQueryMarcacaoAmbulatorial(
      mode as MarcacaoMode, size, from,
      dateStart, dateEnd, codigoCentralReguladora,
      selectedFields, procedimentoSearch,
      riscoFilter, situacaoFilter
    );
  } else {
    return buildQuerySolicitacaoAmbulatorial(
      mode as SolicitacaoMode, size, from,
      dateStart, dateEnd, codigoCentralReguladora,
      selectedFields, procedimentoSearch,
      riscoFilter, situacaoFilter
    );
  }
}

/**
 * Execute SISREG Elasticsearch query
 */
export async function executeSisregSearch(
  credentials: SisregCredentials,
  input: SisregQueryInput
): Promise<SisregQueryResult> {
  const { baseUrl, username, password } = credentials;
  const indexPath = getIndexPath(input.indexType);
  const url = `${baseUrl}${indexPath}`;
  const esQuery = buildElasticsearchQuery(input);
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(esQuery),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      if (response.status === 401) errorMessage = "Credenciais inválidas. Verifique usuário e senha.";
      else if (response.status === 403) errorMessage = "Acesso negado. Verifique suas permissões.";
      else if (response.status === 400) errorMessage = "Requisição inválida. Verifique os parâmetros da consulta.";
      else if (response.status === 404) errorMessage = "Índice não encontrado. Verifique a URL do endpoint.";

      return { ok: false, status: response.status, total: 0, hits: [], errorMessage };
    }

    const data = await response.json() as {
      took?: number;
      hits?: {
        total?: { value?: number } | number;
        hits?: Array<{ _source?: Record<string, unknown> }>;
      };
    };

    let total = 0;
    if (data.hits?.total) {
      total = typeof data.hits.total === "number" 
        ? data.hits.total 
        : data.hits.total.value || 0;
    }

    const hits = data.hits?.hits?.map((hit) => hit._source || {}) || [];

    return { ok: true, status: response.status, took: data.took, total, hits };
  } catch (error) {
    console.error("[SISREG] Query error:", error);
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: isTimeout ? 408 : 500,
      total: 0,
      hits: [],
      errorMessage: isTimeout 
        ? "Timeout: a consulta demorou mais de 30 segundos. Tente reduzir o período ou os filtros."
        : (error instanceof Error ? error.message : "Erro desconhecido ao consultar API"),
    };
  }
}

// ============================================================
// LISTAR CONSULTAS COM PROFISSIONAIS DE SAÚDE
// Usa agregações do Elasticsearch para obter valores únicos
// ============================================================

export interface ListarConsultasResult {
  ok: boolean;
  consultas: string[];
  totalEncontrado: number;
  totalAposFiltragem: number;
  errorMessage?: string;
}

export async function listarConsultasProfissionaisDisponiveis(
  credentials: SisregCredentials,
  indexType: IndexType
): Promise<ListarConsultasResult> {
  const { baseUrl, username, password } = credentials;
  const indexPath = getIndexPath(indexType);
  const url = `${baseUrl}${indexPath}`;
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    let esQuery: Record<string, unknown>;

    if (indexType === "solicitacao") {
      // Para solicitação: usar nested aggregation
      esQuery = {
        size: 0,
        aggs: {
          procedimentos_nested: {
            nested: {
              path: "procedimentos",
            },
            aggs: {
              descricao_interna: {
                terms: {
                  field: "procedimentos.descricao_interna.keyword",
                  size: 5000,
                },
              },
              descricao_sigtap: {
                terms: {
                  field: "procedimentos.descricao_sigtap.keyword",
                  size: 5000,
                },
              },
            },
          },
        },
      };
    } else {
      // Para marcação: usar agregação direta
      esQuery = {
        size: 0,
        aggs: {
          descricao_interna: {
            terms: {
              field: "descricao_interna_procedimento.keyword",
              size: 5000,
            },
          },
          descricao_sigtap: {
            terms: {
              field: "descricao_sigtap_procedimento.keyword",
              size: 5000,
            },
          },
        },
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(esQuery),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        ok: false,
        consultas: [],
        totalEncontrado: 0,
        totalAposFiltragem: 0,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as Record<string, unknown>;
    
    // Extrair valores únicos das agregações
    const procedimentosSet = new Set<string>();

    if (indexType === "solicitacao") {
      const nestedAgg = (data as any).aggregations?.procedimentos_nested;
      if (nestedAgg) {
        const descInterna = nestedAgg.descricao_interna?.buckets || [];
        const descSigtap = nestedAgg.descricao_sigtap?.buckets || [];
        for (const bucket of descInterna) {
          if (bucket.key) procedimentosSet.add(String(bucket.key).toUpperCase().trim());
        }
        for (const bucket of descSigtap) {
          if (bucket.key) procedimentosSet.add(String(bucket.key).toUpperCase().trim());
        }
      }
    } else {
      const aggs = (data as any).aggregations;
      if (aggs) {
        const descInterna = aggs.descricao_interna?.buckets || [];
        const descSigtap = aggs.descricao_sigtap?.buckets || [];
        for (const bucket of descInterna) {
          if (bucket.key) procedimentosSet.add(String(bucket.key).toUpperCase().trim());
        }
        for (const bucket of descSigtap) {
          if (bucket.key) procedimentosSet.add(String(bucket.key).toUpperCase().trim());
        }
      }
    }

    const totalEncontrado = procedimentosSet.size;

    // Filtrar apenas consultas com profissionais de saúde
    const consultas = Array.from(procedimentosSet)
      .filter(desc => isConsultaProfissionalSaude(desc))
      .sort();

    return {
      ok: true,
      consultas,
      totalEncontrado,
      totalAposFiltragem: consultas.length,
    };
  } catch (error) {
    console.error("[SISREG] Erro ao listar consultas profissionais:", error);
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      consultas: [],
      totalEncontrado: 0,
      totalAposFiltragem: 0,
      errorMessage: isTimeout
        ? "Timeout ao buscar lista de consultas."
        : (error instanceof Error ? error.message : "Erro desconhecido"),
    };
  }
}

/**
 * Test SISREG connection with credentials
 * Testa ambos os índices: marcação e solicitação
 */
export async function testSisregConnection(
  credentials: SisregCredentials,
  indexType?: "marcacao" | "solicitacao"
): Promise<{ ok: boolean; message: string; details?: { marcacao?: string; solicitacao?: string } }> {
  try {
    // Se indexType especificado, testa apenas esse
    if (indexType) {
      const result = await executeSisregSearch(credentials, {
        indexType,
        mode: indexType === "marcacao" ? "quick" : "fila",
        size: 1,
        from: 0,
      });

      if (result.ok) {
        return { 
          ok: true, 
          message: `${indexType === "marcacao" ? "Marcação" : "Solicitação"} Ambulatorial: ${result.total} registros encontrados` 
        };
      } else {
        return { ok: false, message: result.errorMessage || "Falha na conexão" };
      }
    }

    // Testa ambos os índices
    const marcacaoResult = await executeSisregSearch(credentials, {
      indexType: "marcacao",
      mode: "quick",
      size: 1,
      from: 0,
    });

    const solicitacaoResult = await executeSisregSearch(credentials, {
      indexType: "solicitacao",
      mode: "fila",
      size: 1,
      from: 0,
    });

    const details = {
      marcacao: marcacaoResult.ok 
        ? `✅ ${marcacaoResult.total.toLocaleString("pt-BR")} registros` 
        : `❌ ${marcacaoResult.errorMessage}`,
      solicitacao: solicitacaoResult.ok 
        ? `✅ ${solicitacaoResult.total.toLocaleString("pt-BR")} registros` 
        : `❌ ${solicitacaoResult.errorMessage}`,
    };

    const bothOk = marcacaoResult.ok && solicitacaoResult.ok;
    const message = bothOk
      ? "Conexão estabelecida com sucesso em ambos os índices!"
      : "Conexão parcial ou com erros. Veja detalhes.";

    return { ok: bothOk, message, details };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}
