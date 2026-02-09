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
