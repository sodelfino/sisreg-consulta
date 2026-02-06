# SISREG Consulta - Macaé - TODO

## Funcionalidades Principais

- [x] Interface de consulta com filtros por tipo (Novas, Agendadas, Atendidas) e datas
- [x] Integração backend com API Elasticsearch do SISREG (autenticação HTTP Basic)
- [x] Exibição de resultados em tabela responsiva (paciente, procedimento, unidade, status)
- [x] Exportação de dados para CSV com todos os campos
- [x] Formulário de configuração para credenciais SISREG (armazenamento seguro)
- [x] Sistema de paginação (size/from) para grandes volumes
- [x] Validação de datas e tratamento de erros com feedback visual
- [x] Seleção de campos personalizados para visualização e exportação
- [x] Insights via LLM (padrões de agendamento, sugestões de otimização)

## Backend

- [x] Schema do banco para configurações e logs
- [x] Endpoint tRPC para consulta Elasticsearch
- [x] Endpoint tRPC para salvar/recuperar credenciais
- [x] Endpoint tRPC para gerar insights via LLM
- [x] Logging de consultas (sem credenciais)

## Frontend

- [x] Design elegante e responsivo
- [x] Página de consulta com formulário de filtros
- [x] Tabela de resultados com ordenação
- [x] Modal/página de configuração de credenciais
- [x] Seletor de campos para exibição
- [x] Botão de exportação CSV
- [x] Área de insights gerados por LLM
- [x] Estados de loading, erro e vazio

## Melhorias Solicitadas

- [x] Filtro de busca por procedimento (descrição/nome) com autocomplete parcial
- [x] Garantir telefone de contato visível na tabela de resultados
- [x] Incluir telefone na exportação CSV


## Versão 1.2 - Solicitação Ambulatorial

- [x] Adicionar coluna nome do estabelecimento na tabela de marcações
- [x] Integrar endpoint de Solicitação Ambulatorial (solicitacao-ambulatorial-rj-macae)
- [x] Criar tela de seleção inicial entre Solicitações e Marcações
- [x] Adaptar filtros e campos para cada tipo de consulta


## Versão 1.3 - Dashboard e Exportação Excel

- [x] Instalar dependência xlsx para exportação Excel
- [x] Criar página de Dashboard com gráficos (Recharts)
- [x] Gráfico de distribuição por unidade
- [x] Gráfico de distribuição por procedimento
- [x] Filtros personalizáveis no dashboard
- [x] Seleção de tipos de procedimentos para visualização
- [x] Exportação de dados para Excel (XLSX)
- [x] Integrar dashboard na navegação principal

## Correções v1.3.1

- [x] Corrigir busca de descrição de procedimento em Solicitações Ambulatoriais
- [x] Corrigir filtros do Dashboard que retornam mesmo resultado


## Correções v1.3.2

- [x] Corrigir campos de descrição de procedimento em Solicitações Ambulatoriais (retornando vazio)
- [x] Verificar e ajustar campos corretos da API para solicitações vs marcações


## Refatoração v2.0 - Separação Completa dos Índices

- [x] Criar construtores de query separados (buildMarcacaoQuery e buildSolicitacaoQuery)
- [x] Remover modos Novas/Agendadas/Atendidas de Solicitações Ambulatoriais
- [x] Solicitações deve ter apenas modo "Fila" (sem subdivisões)
- [x] Ajustar campos específicos para cada índice
- [x] Ajustar filtros de data apropriados para cada tipo
- [x] Atualizar frontend para refletir a separação correta


## Correções Obrigatórias v2.1 - Documento de Ajustes

- [x] Ajustar campos _source de Solicitações conforme documentação (22 campos específicos)
- [x] Adicionar filtro obrigatório por centrais reguladoras ["32C164", "32C206", "32C211", "32C220"]
- [x] Remover filtro de datas obrigatório de Solicitações (apenas central reguladora é obrigatório)
- [x] Garantir construtores de query separados (buildQuerySolicitacaoAmbulatorial / buildQueryMarcacaoAmbulatorial)
- [x] Separar dashboards para cada módulo (Solicitação vs Marcação)
- [x] Garantir exportação XLSX funciona corretamente para ambos os módulos
- [x] Ajustar colunas exibidas na tabela de Solicitações conforme campos reais
