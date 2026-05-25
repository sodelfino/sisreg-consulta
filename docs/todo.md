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

## URGENTE: Descobrir Campo Real de Descrição Procedimento
- [x] Adicionar TODOS os campos possíveis de descrição ao _source
- [x] Implementar fallback em cascata para tentar todos os campos
- [x] Atualizar filtro de busca para buscar em todos os campos possíveis
- [ ] Testar com dados reais para validar que descrição aparece

## Investigação com Credenciais Reais
- [x] Acessar API SISREG com credenciais fornecidas
- [x] Buscar 1 documento de amostra do índice solicitacao-ambulatorial-rj-macae
- [x] Identificar qual campo realmente contém descrição do procedimento (procedimentos[0].descricao_interna)
- [x] Atualizar código para usar campo correto (procedimentos array)
- [x] Validar que descrição aparece na interface (5 testes unitários passaram)


## Filtro Multi-Select de Procedimentos no Dashboard
- [x] Criar endpoint listProcedimentos para listar procedimentos únicos
- [x] Adicionar query procedimentosList ao Dashboard
- [x] Atualizar filtro para usar listProcedimentos com fallback
- [x] Criar testes para validar extração de procedimentos (4 testes passaram)
- [ ] Testar filtro com dados reais e validar que métricas refletem seleção

## URGENTE: Busca por Procedimento Não Funciona
- [x] Testar busca por "CARDIOLOGIA", "NEUROLOGIA" com credenciais reais
- [x] Identificar por que a busca não retorna resultados (problema: query não usava nested)
- [x] Corrigir query de busca no backend para procedimentos específicos (implementado nested query)
- [x] Validar que busca parcial funciona (ex: "CARDIO" encontra "CARDIOLOGIA") - 100% acurácia
- [x] Implementar query otimizada com match + wildcard (100% acurácia em todos os testes)
- [x] Criar testes unitários para validar query nested corrigida

## Correção: Busca de Procedimentos Retorna Muitos Resultados
- [x] Diagnosticar problema: busca por "CONSULTA EM CARDIOLOGIA" retorna tudo que começa com "CONSULTA"
- [x] Testar diferentes estratégias de busca (match_phrase, match_phrase_prefix com limite)
- [x] Implementar busca que retorna variações do termo (ex: "CONSULTA EM CARDIOLOGIA - ADULTO") - 100% acurácia
- [x] Criar testes unitários para validar nova query (10 testes passaram)
- [x] Validar com dados reais (4/4 testes com 100% de acurácia)

## Correção: Exportação Excel com Múltiplos Campos
- [ ] Investigar erro ao exportar com nome, telefone e descrição da especialidade
- [ ] Validar se campos estão no _source do Elasticsearch
- [ ] Corrigir mapeamento de campos no frontend
- [ ] Testar exportação com diferentes combinações de campos

## Nova Feature: Filtro de SITUAÇÃO nas Solicitações Ambulatoriais
- [x] Verificar campos disponíveis no Elasticsearch (sigla_situacao)
- [x] Implementar filtro de SITUAÇÃO no backend (já estava implementado)
- [x] Adicionar coluna de SITUAÇÃO na tabela frontend (já estava incluída)
- [x] Adicionar interface de seleção de filtros no frontend
- [x] Adicionar filtro de RISCO na interface
- [x] Enviar filtros na busca (handleSearch e handlePageChange)
- [x] Criar testes unitários para novo filtro (15 testes passaram)
- [x] Validar funcionamento com dados reais

## Nova Feature: Dashboard com Métricas Acumuladas (Últimos 3 Anos)
- [x] Criar procedure tRPC para buscar métricas por status (metricsAccumulated)
- [x] Implementar card para SOLICITAÇÃO / PENDENTE / FILA DE ESPERA (azul)
- [x] Implementar card para SOLICITAÇÃO / PENDENTE / REGULADOR (âmbar)
- [x] Implementar card para SOLICITAÇÃO / AGENDADA / FILA DE ESPERA (verde)
- [x] Filtrar apenas procedimentos com "CONSULTA EM"
- [x] Calcular período dos últimos 3 anos automaticamente
- [x] Criar testes unitários para métricas (12 testes passaram)
- [x] Validar dados com período correto

## Nova Feature: Sistema Dinâmico de Consultas com Profissionais de Saúde
- [x] Adicionar constantes TERMOS_EXCLUIR_NAO_CONSULTA e PREFIXOS_CONSULTA_VALIDOS em shared/sisreg.ts
- [x] Criar função isConsultaProfissionalSaude em shared/sisreg.ts
- [x] Criar função listarConsultasProfissionaisDisponiveis no backend (agregações ES)
- [x] Criar endpoint tRPC search.listarConsultasProfissionais
- [x] Implementar componente de seleção com checkboxes no frontend
- [x] Modificar busca para aceitar múltiplas consultas selecionadas (pipe separator)
- [x] Criar testes unitários para validar filtros (135 testes passaram)

## PATCH 01: Chave de Criptografia Insegura (CRÍTICA)
- [x] Remover fallback inseguro "default-key-for-dev"
- [x] Adicionar validação obrigatória de ENCRYPTION_KEY (mínimo 32 caracteres)
- [x] Servidor recusa iniciar sem chave válida com mensagem clara
- [x] Gerar chave segura de 64 caracteres hex
- [x] Configurar ENCRYPTION_KEY como variável de ambiente
- [x] Criar testes unitários para validar encrypt/decrypt (5 testes passaram)
- [x] Validar que servidor inicia corretamente com a chave configurada

## Bug Fix: Filtro de Situação Retorna Zero Resultados
- [x] Diagnosticar mismatch: checkboxes enviavam valores curtos (P, R, D) mas ES espera strings completas
- [x] Criar SITUACOES_SOLICITACAO com valores exatos do campo sigla_situacao.keyword
- [x] Atualizar frontend para usar valores completos nos checkboxes
- [x] Manter SITUACAO_LABELS para formatação na tabela (compatibilidade)
- [x] Testes passaram (140/142 - 2 falhas pré-existentes não relacionadas)

## Nova Feature: Carregamento Automático de Consultas Profissionais
- [x] Adicionar checkbox "Apenas consultas com profissionais" (ativo por padrão)
- [x] Carregar lista automaticamente ao montar componente ou ativar checkbox
- [x] Mostrar lista com checkboxes, contagem e filtro local
- [x] Implementar "Selecionar todas" e tags de selecionadas
- [x] Persistir preferência no localStorage
- [x] Quando desativado, voltar ao modo texto livre
- [x] Testes passaram (140/142 - 2 falhas pré-existentes)

## Redesign: Dashboard Focado em Consultas Profissionais
- [x] Criar endpoint dashboard.consultasFila com filtros de consultas profissionais
- [x] Implementar filtros interativos: Período (presets + custom), Situação (multi-select), Risco (multi-select)
- [x] Cards de métricas: Total Fila, Pendentes, Devolvidas, Agendadas
- [x] Gráfico Top 10 Especialidades com barras horizontais (clicável)
- [x] Gráfico Distribuição por Risco (pizza)
- [x] Distribuição por Situação (cards)
- [x] Tabela Solicitações Mais Antigas (críticas com badge de dias)
- [x] Clicar em especialidade navega para Consulta.tsx com filtro
- [x] Filtro de consultas profissionais embutido (isConsultaProfissionalSaude)
- [x] Testes passaram (140/142 - 2 falhas pré-existentes)

## Bug Fix: Exportação Excel não corresponde à tabela da tela
- [x] Analisar função de exportação Excel e colunas da tabela
- [x] Garantir que as mesmas colunas visíveis na tela são exportadas
- [x] Garantir que os valores formatados (labels, datas, situação) são iguais
- [x] Incluir campos de contato (nome, telefone) na exportação
- [x] Testar exportação e validar (18 testes passaram)
