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
 * Get default fields based on index type
 */
function getDefaultFields(indexType: IndexType) {
  return indexType === "solicitacao" ? DEFAULT_FIELDS_SOLICITACAO : DEFAULT_FIELDS_MARCACAO;
}

/**
 * Build Elasticsearch query based on mode and parameters
 */
function buildElasticsearchQuery(input: SisregQueryInput): Record<string, unknown> {
  const { indexType, mode, size, from = 0, dateStart, dateEnd, codigoCentralReguladora, selectedFields, procedimentoSearch } = input;

  const defaultFields = getDefaultFields(indexType);

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
      quickMustClauses.push({
        bool: {
          should: [
            { wildcard: { "descricao_interna_procedimento": `*${searchTerm}*` } },
            { wildcard: { "nome_grupo_procedimento": `*${searchTerm}*` } },
            { match_phrase_prefix: { "descricao_interna_procedimento": searchTerm } },
            { match_phrase_prefix: { "nome_grupo_procedimento": searchTerm } },
          ],
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

  // Add procedimento search filter (wildcard search for partial matching)
  if (procedimentoSearch && procedimentoSearch.trim()) {
    const searchTerm = procedimentoSearch.trim().toLowerCase();
    mustClauses.push({
      bool: {
        should: [
          { wildcard: { "descricao_interna_procedimento": `*${searchTerm}*` } },
          { wildcard: { "nome_grupo_procedimento": `*${searchTerm}*` } },
          { match_phrase_prefix: { "descricao_interna_procedimento": searchTerm } },
          { match_phrase_prefix: { "nome_grupo_procedimento": searchTerm } },
        ],
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
  const sortField = mode === "agendadas" ? "data_aprovacao" :
                    mode === "atendidas" ? "data_confirmacao" :
                    "data_solicitacao";
  query.sort = [{ [sortField]: { order: "desc" } }];

  return query;
}

/**
 * Execute search against SISREG Elasticsearch
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
    const errorMessage = error instanceof Error 
      ? `Erro de conexão: ${error.message}` 
      : "Erro desconhecido ao conectar com SISREG";

    return {
      ok: false,
      status: 0,
      total: 0,
      hits: [],
      errorMessage,
    };
  }
}

/**
 * Test connection to SISREG API for a specific index type
 */
export async function testSisregConnection(
  credentials: SisregCredentials,
  indexType: IndexType = "marcacao"
): Promise<{ ok: boolean; message: string }> {
  const result = await executeSisregSearch(credentials, {
    indexType,
    mode: "quick",
    size: 1,
  });

  if (result.ok) {
    return {
      ok: true,
      message: `Conexão bem sucedida! ${result.total} registros disponíveis.`,
    };
  }

  return {
    ok: false,
    message: result.errorMessage || "Falha na conexão",
  };
}
