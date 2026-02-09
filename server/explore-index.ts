/**
 * Ferramenta de exploração do índice Elasticsearch
 * Permite descobrir campos, valores e estrutura dos dados
 */

interface ExploreCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

/**
 * Busca documentos de amostra do índice sem filtros
 */
export async function exploreIndex(
  credentials: ExploreCredentials,
  indexPath: string,
  size: number = 10
): Promise<{
  ok: boolean;
  total: number;
  samples: Record<string, unknown>[];
  fields: string[];
  errorMessage?: string;
}> {
  const { baseUrl, username, password } = credentials;
  const url = `${baseUrl}${indexPath}`;
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  // Query simples: buscar primeiros documentos sem filtros
  const query = {
    size,
    query: { match_all: {} },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      return {
        ok: false,
        total: 0,
        samples: [],
        fields: [],
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as {
      hits?: {
        total?: { value?: number } | number;
        hits?: Array<{ _source?: Record<string, unknown> }>;
      };
    };

    const total = typeof data.hits?.total === "number" 
      ? data.hits.total 
      : data.hits?.total?.value || 0;

    const samples = data.hits?.hits?.map((hit) => hit._source || {}) || [];

    // Extrair todos os campos únicos dos documentos de amostra
    const fieldsSet = new Set<string>();
    samples.forEach((doc) => {
      Object.keys(doc).forEach((key) => fieldsSet.add(key));
    });
    const fields = Array.from(fieldsSet).sort();

    return { ok: true, total, samples, fields };
  } catch (error) {
    return {
      ok: false,
      total: 0,
      samples: [],
      fields: [],
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Busca valores únicos de um campo específico
 */
export async function exploreFieldValues(
  credentials: ExploreCredentials,
  indexPath: string,
  fieldName: string,
  size: number = 100
): Promise<{
  ok: boolean;
  values: Array<{ value: string | number; count: number }>;
  errorMessage?: string;
}> {
  const { baseUrl, username, password } = credentials;
  const url = `${baseUrl}${indexPath}`;
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  // Aggregation query para valores únicos
  const query = {
    size: 0,
    aggs: {
      unique_values: {
        terms: {
          field: fieldName,
          size,
        },
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      return {
        ok: false,
        values: [],
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as {
      aggregations?: {
        unique_values?: {
          buckets?: Array<{ key: string | number; doc_count: number }>;
        };
      };
    };

    const buckets = data.aggregations?.unique_values?.buckets || [];
    const values = buckets.map((bucket) => ({
      value: bucket.key,
      count: bucket.doc_count,
    }));

    return { ok: true, values };
  } catch (error) {
    return {
      ok: false,
      values: [],
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Busca o mapping (schema) do índice
 */
export async function exploreMapping(
  credentials: ExploreCredentials,
  indexName: string
): Promise<{
  ok: boolean;
  mapping: Record<string, unknown>;
  errorMessage?: string;
}> {
  const { baseUrl, username, password } = credentials;
  const url = `${baseUrl}/${indexName}/_mapping`;
  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        mapping: {},
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { ok: true, mapping: data };
  } catch (error) {
    return {
      ok: false,
      mapping: {},
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}
