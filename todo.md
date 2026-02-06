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


## Versão 2.2 - Tempo de Espera na Fila

- [x] Ordenação por data_solicitacao (ascendente) via Elasticsearch para solicitações
- [x] Coluna "Tempo de Espera" calculada no frontend com date-fns
- [x] Cores personalizadas: verde (até 30d), amarelo (até 90d), laranja (até 120d), vermelho (180d+)
- [x] Formato: "X dias" ou "X meses, Y dias"


## HU Dashboard v3.0 - Melhorias Completas

### RB01 - Divisão obrigatória por módulo
- [x] Menu "Solicitações Ambulatoriais (Fila)" aponta para endpoint correto
- [x] Menu "Marcações Ambulatoriais" aponta para endpoint correto com abas Novas/Agendadas/Atendidas
- [x] Sem filtros de Agendadas/Atendidas em Solicitações

### RB02 - Contratos de dados independentes
- [x] buildQuerySolicitacaoAmbulatorial() nunca referencia campos de marcação
- [x] buildQueryMarcacaoAmbulatorial() aplica datas corretas por aba

### RB03 - Montagem de dados (construtor de consulta)
- [x] Filtros: período, central reguladora, procedimento, risco, situação/status
- [x] Seleção de colunas exibidas (Gestão/Operacional/Auditoria)
- [x] Filtros aplicados visíveis/resumidos no topo da tabela

### RB04 - Insights automáticos (obrigatório)
- [x] Insights gerados automaticamente após cada busca com resultados
- [x] Total de registros e distribuição por situação/status
- [x] Top 10 procedimentos e top unidades
- [x] Classificação de risco (distribuição)
- [x] Alertas automáticos (concentração, pico, etc.)

### CA06 - Exportação XLSX completa
- [x] Exportar TODOS os registros do filtro (não apenas a página)
- [x] Aba "Dados" com colunas selecionadas
- [x] Aba "Filtros" com parâmetros usados

### RNF
- [x] Não travar UI durante export (backend streaming)
- [x] Timeout e mensagens amigáveis de erro
- [x] Consistência de datas (end-exclusive)

### Testes
- [x] Testes unitários: builders separados
- [x] Testes unitários: rota de busca
- [x] Testes unitários: exportação

## Bugs v3.1

- [x] Bug 1: Navegação inicial - card Solicitações abre Marcações primeiro
- [x] Bug 2: Fila de Solicitações retorna 0 resultados (campo de data/central errado)
