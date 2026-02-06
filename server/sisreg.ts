/**
 * SISREG Elasticsearch Integration Service
 * Handles all communication with the SISREG API
 */

import {
  SisregQueryInput,
  SisregQueryResult,
  STATUS_AGENDADAS,
  STATUS_ATENDIDAS,
  DEFAULT_FIELDS_MARCACAO,
  DEFAULT_FIELDS_SOLICITACAO,
  INDEX_PATHS,
  IndexType,
  MarcacaoMode,
  SolicitacaoMode,
} from "../shared/sisreg";

interface SisregCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

/**
 * Get the index path based on index type
 */
function getIndexPath(indexType: IndexType): string {
  return INDEX_PATHS[indexType];
}

/**
 * Build query for MARCAÇÃO AMBULATORIAL
 * Supports: quick, novas, agendadas, atendidas
 */
function buildMarcacaoQuery(
  mode: MarcacaoMode,
  size: number,
  from: number,
  dateStart?: string,
  dateEnd?: string,
  codigoCentralReguladora?: string[],
  selectedFields?: string[],
  procedimentoSearch?: string
): Record<string, unknown> {
  const defaultFields = DEFAULT_FIELDS_MARCACAO;

  // Determine which fields to return
  const modeFields = mode === "novas" ? defaultFields.novas :
                     mode === "agendadas" ? defaultFields.agendadas :
                     mode === "atendidas" ? defaultFields.atendidas :
                     defaultFields.novas;
  
  const fieldsToReturn = selectedFields && selectedFields.length > 0 
    ? selectedFields 
    : [...defaultFields.common, ...modeFields];

  // Base query structure
  const query: Record<string, unknown> = {
    size: Math.min(size, 1000), // Limit to 1000 max
    from,
    _source: fieldsToReturn,
  };

  // Quick mode: just return latest records
  if (mode === "quick") {
    query.sort = [{ data_solicitacao: { order: "desc" } }];
    
    const quickMustClauses: Record<string, unknown>[] = [];
    
    // Add optional filter by central reguladora
    if (codigoCentralReguladora && codigoCentralReguladora.length > 0) {
      quickMustClauses.push({ terms: { codigo_central_reguladora: codigoCentralReguladora } });
    }
    
    // Add procedimento search filter (wildcard search)
    if (procedimentoSearch && procedimentoSearch.trim()) {
      const searchTerm = procedimentoSearch.trim().toLowerCase();
      const shouldClauses: Array<Record<string, unknown>> = [
        { wildcard: { "nome_grupo_procedimento": `*${searchTerm}*` } },
        { match_phrase_prefix: { "nome_grupo_procedimento": searchTerm } },
        { wildcard: { "descricao_interna_procedimento": `*${searchTerm}*` } },
        { wildcard: { "descricao_sigtap_procedimento": `*${searchTerm}*` } },
        { match_phrase_prefix: { "descricao_interna_procedimento": searchTerm } },
        { match_phrase_prefix: { "descricao_sigtap_procedimento": searchTerm } },
      ];
      
      quickMustClauses.push({
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
        },
      });
    }
    
    if (quickMustClauses.length > 0) {
      query.query = {
        bool: {
          must: quickMustClauses,
        },
      };
    }
    
    return query;
  }

  // Build must clauses for filtered queries
  const mustClauses: Record<string, unknown>[] = [];

  // Add date range based on mode
  if (dateStart && dateEnd) {
    let dateField = "data_solicitacao";
    if (mode === "agendadas") dateField = "data_aprovacao";
    if (mode === "atendidas") dateField = "data_confirmacao";

    mustClauses.push({
      range: {
        [dateField]: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
    });
  }

  // Add status filter for agendadas/atendidas
  if (mode === "agendadas") {
    mustClauses.push({
      terms: {
        "status_solicitacao.keyword": STATUS_AGENDADAS,
      },
    });
  } else if (mode === "atendidas") {
    mustClauses.push({
      terms: {
        "status_solicitacao.keyword": STATUS_ATENDIDAS,
      },
    });
  }

  // Add optional filter by central reguladora
  if (codigoCentralReguladora && codigoCentralReguladora.length > 0) {
    mustClauses.push({
      terms: { codigo_central_reguladora: codigoCentralReguladora },
    });
  }

  // Add procedimento search filter
  if (procedimentoSearch && procedimentoSearch.trim()) {
    const searchTerm = procedimentoSearch.trim().toLowerCase();
    const shouldClauses: Array<Record<string, unknown>> = [
      { wildcard: { "nome_grupo_procedimento": `*${searchTerm}*` } },
      { match_phrase_prefix: { "nome_grupo_procedimento": searchTerm } },
      { wildcard: { "descricao_interna_procedimento": `*${searchTerm}*` } },
      { wildcard: { "descricao_sigtap_procedimento": `*${searchTerm}*` } },
      { match_phrase_prefix: { "descricao_interna_procedimento": searchTerm } },
      { match_phrase_prefix: { "descricao_sigtap_procedimento": searchTerm } },
    ];
    
    mustClauses.push({
      bool: {
        should: shouldClauses,
        minimum_should_match: 1,
      },
    });
  }

  // Build final query
  if (mustClauses.length > 0) {
    query.query = {
      bool: {
        must: mustClauses,
      },
    };
  }

  // Add sorting
  if (mode === "novas") {
    query.sort = [{ data_solicitacao: { order: "desc" } }];
  } else if (mode === "agendadas") {
    query.sort = [{ data_aprovacao: { order: "asc" } }];
  } else if (mode === "atendidas") {
    query.sort = [{ data_confirmacao: { order: "desc" } }];
  }

  return query;
}

/**
 * Build query for SOLICITAÇÃO AMBULATORIAL (Fila)
 * Only supports: fila mode
 */
function buildSolicitacaoQuery(
  mode: SolicitacaoMode,
  size: number,
  from: number,
  dateStart?: string,
  dateEnd?: string,
  codigoCentralReguladora?: string[],
  selectedFields?: string[],
  procedimentoSearch?: string
): Record<string, unknown> {
  const defaultFields = DEFAULT_FIELDS_SOLICITACAO;

  // Solicitação só tem modo "fila"
  const modeFields = defaultFields.fila;
  
  const fieldsToReturn = selectedFields && selectedFields.length > 0 
    ? selectedFields 
    : [...defaultFields.common, ...modeFields];

  // Base query structure
  const query: Record<string, unknown> = {
    size: Math.min(size, 1000), // Limit to 1000 max
    from,
    _source: fieldsToReturn,
    sort: [{ data_solicitacao: { order: "desc" } }], // Sempre ordena por data de solicitação
  };

  // Build must clauses
  const mustClauses: Record<string, unknown>[] = [];

  // Add date range (sempre usa data_solicitacao para fila)
  if (dateStart && dateEnd) {
    mustClauses.push({
      range: {
        data_solicitacao: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
    });
  }

  // Add optional filter by central reguladora
  if (codigoCentralReguladora && codigoCentralReguladora.length > 0) {
    mustClauses.push({
      terms: { codigo_central_reguladora: codigoCentralReguladora },
    });
  }

  // Add procedimento search filter (only nome_grupo_procedimento exists in solicitacao)
  if (procedimentoSearch && procedimentoSearch.trim()) {
    const searchTerm = procedimentoSearch.trim().toLowerCase();
    const shouldClauses: Array<Record<string, unknown>> = [
      { wildcard: { "nome_grupo_procedimento": `*${searchTerm}*` } },
      { match_phrase_prefix: { "nome_grupo_procedimento": searchTerm } },
    ];
    
    mustClauses.push({
      bool: {
        should: shouldClauses,
        minimum_should_match: 1,
      },
    });
  }

  // Build final query
  if (mustClauses.length > 0) {
    query.query = {
      bool: {
        must: mustClauses,
      },
    };
  }

  return query;
}

/**
 * Main query builder - delegates to specific builders
 */
function buildElasticsearchQuery(input: SisregQueryInput): Record<string, unknown> {
  const { indexType, mode, size, from = 0, dateStart, dateEnd, codigoCentralReguladora, selectedFields, procedimentoSearch } = input;

  if (indexType === "marcacao") {
    return buildMarcacaoQuery(
      mode as MarcacaoMode,
      size,
      from,
      dateStart,
      dateEnd,
      codigoCentralReguladora,
      selectedFields,
      procedimentoSearch
    );
  } else {
    return buildSolicitacaoQuery(
      mode as SolicitacaoMode,
      size,
      from,
      dateStart,
      dateEnd,
      codigoCentralReguladora,
      selectedFields,
      procedimentoSearch
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

  // Create Basic Auth header
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(esQuery),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      if (response.status === 401) {
        errorMessage = "Credenciais inválidas. Verifique usuário e senha.";
      } else if (response.status === 403) {
        errorMessage = "Acesso negado. Verifique suas permissões.";
      } else if (response.status === 400) {
        errorMessage = "Requisição inválida. Verifique os parâmetros da consulta.";
      } else if (response.status === 404) {
        errorMessage = "Índice não encontrado. Verifique a URL do endpoint.";
      }

      return {
        ok: false,
        status: response.status,
        total: 0,
        hits: [],
        errorMessage,
      };
    }

    const data = await response.json() as {
      took?: number;
      hits?: {
        total?: { value?: number } | number;
        hits?: Array<{ _source?: Record<string, unknown> }>;
      };
    };

    // Extract total count (handle both ES 6.x and 7.x formats)
    let total = 0;
    if (data.hits?.total) {
      total = typeof data.hits.total === "number" 
        ? data.hits.total 
        : data.hits.total.value || 0;
    }

    // Extract hits
    const hits = data.hits?.hits?.map((hit) => hit._source || {}) || [];

    return {
      ok: true,
      status: response.status,
      took: data.took,
      total,
      hits,
    };
  } catch (error) {
    console.error("[SISREG] Query error:", error);
    return {
      ok: false,
      status: 500,
      total: 0,
      hits: [],
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido ao consultar API",
    };
  }
}


/**
 * Test SISREG connection with credentials
 */
export async function testSisregConnection(credentials: SisregCredentials): Promise<{ ok: boolean; message: string }> {
  try {
    // Try a simple query with size 1 to test connection
    const result = await executeSisregSearch(credentials, {
      indexType: "marcacao",
      mode: "quick",
      size: 1,
      from: 0,
    });

    if (result.ok) {
      return {
        ok: true,
        message: "Conexão estabelecida com sucesso!",
      };
    } else {
      return {
        ok: false,
        message: result.errorMessage || "Falha na conexão",
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
