/**
 * SISREG Elasticsearch API Types and Constants
 */

// Tipo de índice: marcação ou solicitação ambulatorial
export type IndexType = "marcacao" | "solicitacao";

// Modos específicos para cada índice
export type MarcacaoMode = "quick" | "novas" | "agendadas" | "atendidas";
export type SolicitacaoMode = "fila"; // Solicitações só tem "fila"
export type QueryMode = MarcacaoMode | SolicitacaoMode;

export interface SisregQueryInput {
  indexType: IndexType;
  mode: QueryMode;
  size: number;
  from?: number;
  dateStart?: string;
  dateEnd?: string;
  codigoCentralReguladora?: string[];
  selectedFields?: string[];
  procedimentoSearch?: string;
  riscoFilter?: string[];
  situacaoFilter?: string[];
}

export interface SisregQueryResult {
  ok: boolean;
  status: number;
  took?: number;
  total: number;
  hits: Record<string, unknown>[];
  errorMessage?: string;
}

// Índices disponíveis
export const INDEX_PATHS = {
  marcacao: "/marcacao-ambulatorial-rj-macae/_search",
  solicitacao: "/solicitacao-ambulatorial-rj-macae/_search",
};

// Labels para os tipos de índice
export const INDEX_LABELS = {
  marcacao: "Marcações Ambulatoriais",
  solicitacao: "Solicitações Ambulatoriais",
};

// Centrais reguladoras obrigatórias para Solicitação Ambulatorial (Macaé)
export const CENTRAIS_REGULADORAS_MACAE = ["32C164", "32C206", "32C211", "32C220"];

// Status values for "agendadas" query (Marcação)
export const STATUS_AGENDADAS = [
  "SOLICITAÇÃO / AGENDADA / FILA DE ESPERA",
  "SOLICITAÇÃO / AGENDADA / SOLICITANTE",
  "SOLICITAÇÃO / AUTORIZADA / REGULADOR",
  "AGENDAMENTO / PENDENTE CONFIRMAÇÃO / EXECUTANTE",
  "SOLICITAÇÃO / AGENDADA / COORDENADOR",
];

// Status values for "atendidas" query (Marcação)
export const STATUS_ATENDIDAS = [
  "AGENDAMENTO / CONFIRMADO / EXECUTANTE",
];

// ============================================================
// CAMPOS _SOURCE - MARCAÇÃO AMBULATORIAL
// Endpoint: /marcacao-ambulatorial-rj-macae/_search
// ============================================================
export const DEFAULT_FIELDS_MARCACAO = {
  common: [
    "codigo_solicitacao",
    "no_usuario",
    "cns_usuario",
    "sexo_usuario",
    "dt_nascimento_usuario",
    "municipio_paciente_residencia",
    "telefone",
    "codigo_interno_procedimento",
    "descricao_interna_procedimento",
    "descricao_sigtap_procedimento",
    "nome_grupo_procedimento",
    "codigo_classificacao_risco",
    "status_solicitacao",
    "sigla_situacao",
    "nome_unidade_executante",
  ],
  novas: [
    "data_solicitacao",
    "codigo_central_reguladora",
    "nome_central_reguladora",
    "codigo_unidade_solicitante",
    "nome_unidade_solicitante",
    "nome_medico_solicitante",
  ],
  agendadas: [
    "data_solicitacao",
    "data_aprovacao",
    "data_marcacao",
    "codigo_central_reguladora",
    "nome_central_reguladora",
    "codigo_unidade_executante",
    "nome_unidade_executante",
    "nome_profissional_executante",
  ],
  atendidas: [
    "data_solicitacao",
    "data_aprovacao",
    "data_confirmacao",
    "data_marcacao",
    "codigo_central_reguladora",
    "nome_central_reguladora",
    "codigo_unidade_executante",
    "nome_unidade_executante",
    "nome_profissional_executante",
  ],
};

// ============================================================
// CAMPOS _SOURCE - SOLICITAÇÃO AMBULATORIAL (FILA)
// Endpoint: /solicitacao-ambulatorial-rj-macae/_search
// Conforme documentação v2.1
// ============================================================
export const DEFAULT_FIELDS_SOLICITACAO = {
  common: [
    // Campos conforme documentação v2.1
    "codigo_central_reguladora",
    "codigo_central_solicitante",
    "data_solicitacao",
    "codigo_unidade_solicitante",
    "nome_unidade_solicitante",
    "nome_medico_solicitante",
    "cpf_profissional_solicitante",
    "sigla_situacao",
    "codigo_interno_procedimento",
    "descricao_interna_procedimento",
    "descricao_sigtap_procedimento",
    "nome_grupo_procedimento",
    "codigo_grupo_procedimento",
    // Campos alternativos de descrição (tentar todos)
    "descricao_procedimento",
    "nome_procedimento",
    "procedimento",
    "codigo_tipo_regulacao",
    "codigo_classificacao_risco",
    "cns_usuario",
    "no_usuario",
    "no_mae_usuario",
    "dt_nascimento_usuario",
    "municipio_paciente_residencia",
    "sexo_usuario",
    "telefone",
  ],
  fila: [] as string[], // Todos os campos já estão em common
};

// Alias para compatibilidade
export const DEFAULT_FIELDS = DEFAULT_FIELDS_MARCACAO;

// All available fields for marcação ambulatorial
export const ALL_FIELDS_MARCACAO = [
  { key: "codigo_solicitacao", label: "Código Solicitação", category: "identificacao" },
  { key: "no_usuario", label: "Nome Paciente", category: "paciente" },
  { key: "cns_usuario", label: "CNS Paciente", category: "paciente" },
  { key: "no_mae_usuario", label: "Nome da Mãe", category: "paciente" },
  { key: "sexo_usuario", label: "Sexo", category: "paciente" },
  { key: "dt_nascimento_usuario", label: "Data Nascimento", category: "paciente" },
  { key: "municipio_paciente_residencia", label: "Município Residência", category: "paciente" },
  { key: "endereco_paciente_residencia", label: "Endereço", category: "paciente" },
  { key: "telefone", label: "Telefone", category: "paciente" },
  { key: "data_solicitacao", label: "Data Solicitação", category: "datas" },
  { key: "data_aprovacao", label: "Data Aprovação", category: "datas" },
  { key: "data_confirmacao", label: "Data Confirmação", category: "datas" },
  { key: "data_marcacao", label: "Data Marcação", category: "datas" },
  { key: "data_desejada", label: "Data Desejada", category: "datas" },
  { key: "dt_atualizacao", label: "Data Atualização", category: "datas" },
  { key: "codigo_interno_procedimento", label: "Código Procedimento", category: "procedimento" },
  { key: "descricao_interna_procedimento", label: "Descrição Procedimento", category: "procedimento" },
  { key: "descricao_sigtap_procedimento", label: "Descrição SIGTAP", category: "procedimento" },
  { key: "codigo_grupo_procedimento", label: "Código Grupo", category: "procedimento" },
  { key: "nome_grupo_procedimento", label: "Nome Grupo", category: "procedimento" },
  { key: "codigo_cid_solicitado", label: "CID Solicitado", category: "procedimento" },
  { key: "descricao_cid_solicitado", label: "Descrição CID", category: "procedimento" },
  { key: "codigo_classificacao_risco", label: "Classificação Risco", category: "procedimento" },
  { key: "codigo_central_reguladora", label: "Código Central Reguladora", category: "unidade" },
  { key: "nome_central_reguladora", label: "Nome Central Reguladora", category: "unidade" },
  { key: "codigo_central_solicitante", label: "Código Central Solicitante", category: "unidade" },
  { key: "nome_central_solicitante", label: "Nome Central Solicitante", category: "unidade" },
  { key: "codigo_unidade_solicitante", label: "Código Unidade Solicitante", category: "unidade" },
  { key: "nome_unidade_solicitante", label: "Nome Unidade Solicitante", category: "unidade" },
  { key: "codigo_unidade_executante", label: "Código Unidade Executante", category: "unidade" },
  { key: "nome_unidade_executante", label: "Nome Unidade Executante", category: "unidade" },
  { key: "nome_medico_solicitante", label: "Médico Solicitante", category: "profissional" },
  { key: "nome_profissional_executante", label: "Profissional Executante", category: "profissional" },
  { key: "cpf_profissional_executante", label: "CPF Executante", category: "profissional" },
  { key: "status_solicitacao", label: "Status Solicitação", category: "status" },
  { key: "sigla_situacao", label: "Sigla Situação", category: "status" },
  { key: "codigo_tipo_regulacao", label: "Tipo Regulação", category: "status" },
];

// All available fields for solicitação ambulatorial
export const ALL_FIELDS_SOLICITACAO = [
  { key: "codigo_central_reguladora", label: "Código Central Reguladora", category: "unidade" },
  { key: "codigo_central_solicitante", label: "Código Central Solicitante", category: "unidade" },
  { key: "data_solicitacao", label: "Data Solicitação", category: "datas" },
  { key: "codigo_unidade_solicitante", label: "Código Unidade Solicitante", category: "unidade" },
  { key: "nome_unidade_solicitante", label: "Nome Unidade Solicitante", category: "unidade" },
  { key: "nome_medico_solicitante", label: "Médico Solicitante", category: "profissional" },
  { key: "cpf_profissional_solicitante", label: "CPF Profissional Solicitante", category: "profissional" },
  { key: "sigla_situacao", label: "Sigla Situação", category: "status" },
  { key: "codigo_interno_procedimento", label: "Código Procedimento", category: "procedimento" },
  { key: "descricao_interna_procedimento", label: "Descrição Procedimento", category: "procedimento" },
  { key: "codigo_classificacao_risco", label: "Classificação Risco", category: "procedimento" },
  { key: "cns_usuario", label: "CNS Paciente", category: "paciente" },
  { key: "no_usuario", label: "Nome Paciente", category: "paciente" },
  { key: "no_mae_usuario", label: "Nome da Mãe", category: "paciente" },
  { key: "dt_nascimento_usuario", label: "Data Nascimento", category: "paciente" },
  { key: "municipio_paciente_residencia", label: "Município Residência", category: "paciente" },
  { key: "sexo_usuario", label: "Sexo", category: "paciente" },
  { key: "telefone", label: "Telefone", category: "paciente" },
  { key: "codigo_grupo_procedimento", label: "Código Grupo Procedimento", category: "procedimento" },
  { key: "nome_grupo_procedimento", label: "Nome Grupo Procedimento", category: "procedimento" },
  { key: "codigo_tipo_regulacao", label: "Tipo Regulação", category: "status" },
];

// Backward compatibility: combined list
export const ALL_AVAILABLE_FIELDS = ALL_FIELDS_MARCACAO;

export const FIELD_CATEGORIES = [
  { key: "identificacao", label: "Identificação" },
  { key: "paciente", label: "Paciente" },
  { key: "datas", label: "Datas" },
  { key: "procedimento", label: "Procedimento" },
  { key: "unidade", label: "Unidade" },
  { key: "profissional", label: "Profissional" },
  { key: "status", label: "Status" },
];

// Risk classification labels
export const RISK_LABELS: Record<number, string> = {
  0: "Emergência",
  1: "Urgência",
  2: "Prioridade não urgente",
  3: "Eletivo",
  4: "Eletivo",
};

// Situation labels
export const SITUACAO_LABELS: Record<string, string> = {
  P: "Pendente",
  R: "Reenviada",
  D: "Devolvida",
  N: "Negada",
  A: "Aprovada",
  C: "Cancelada",
};
