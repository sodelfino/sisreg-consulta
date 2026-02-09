# TODO - SISREG Consulta

## Concluído
- [x] Corrigir query de Solicitações Ambulatoriais para retornar resultados reais com filtros de status corretos
- [x] Investigar índice solicitacao-ambulatorial-rj-macae para descobrir campos e valores reais
- [x] Remover filtros restritivos de status que impedem resultados
- [x] Permitir consulta livre do índice de Solicitações Ambulatoriais
- [x] Criar ferramenta de exploração do índice (/explore)
- [x] Adicionar teste específico para cada endpoint (Marcação e Solicitação)
- [x] Remover filtro obrigatório de centrais reguladoras que pode estar bloqueando resultados
- [x] Permitir consulta completamente livre sem filtros obrigatórios
- [x] Corrigir campo Descrição Procedimento que está vindo vazio em Solicitações Ambulatoriais
- [x] Criar ferramenta de debug para ver documento completo do Elasticsearch
- [x] Adicionar descricao_sigtap_procedimento e nome_grupo_procedimento ao _source
- [x] Implementar fallback inteligente para descrição de procedimento (3 níveis)
- [x] Melhorar filtro de busca por procedimento com busca parcial em múltiplos campos
- [x] Criar testes para validar busca de procedimento e fallback

## Dashboard de Métricas Gerenciais
- [x] Criar endpoint tRPC para calcular tempo médio de espera por procedimento
- [x] Criar endpoint tRPC para listar top 10 procedimentos mais solicitados
- [x] Implementar cálculo de tempo de espera (data_solicitacao até hoje)
- [x] Criar interface do dashboard com cards de métricas
- [x] Adicionar gráfico de barras para top 10 procedimentos
- [x] Adicionar tabela com detalhes de tempo médio de espera
- [x] Criar testes para validar cálculos de métricas
- [x] Integrar métricas ao Dashboard existente (seção dedicada)

## Correção de Campo de Descrição (descricao_interna_procedimento)
- [x] Verificar _source no backend para garantir que descricao_interna_procedimento está incluído
- [x] Corrigir mapeamento da tabela no frontend para usar descricao_interna_procedimento
- [x] Corrigir filtro de busca para usar exclusivamente descricao_interna_procedimento com match parcial
- [ ] Validar que coluna aparece preenchida sem filtro (requer teste com credenciais reais)
- [ ] Validar que busca por "CARDIO", "CONSULTA", "ELETRO" retorna resultados (requer teste com credenciais reais)

## Correção de Fallback Indevido em Descrição Procedimento
- [x] Corrigir formatCellValue para usar apenas descricao_interna_procedimento ou codigo_interno_procedimento
- [x] Remover nome_grupo_procedimento e descricao_sigtap_procedimento do fallback de descrição
- [x] Garantir que Nome Grupo Procedimento seja coluna separada
- [x] Ajustar filtro de busca para não usar nome_grupo_procedimento
- [x] Validar que descrição não mostra grupo quando vazia

## Teste de Formatação de Descrição
- [x] Criar relatório de validação com cenários de teste
- [x] Validar formatação de descrição de procedimento via testes unitários
- [x] Documentar resultados do teste (VALIDACAO_DESCRICAO_PROCEDIMENTO.md)
