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
