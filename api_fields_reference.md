# Campos da API SISREG - Referência

## Campos de Procedimento
- descricao_interna_procedimento (campo 40) - Descrição de interna procedimento
- descricao_sigtap_procedimento (campo 41) - Descrição de SIGTAP procedimento
- nome_grupo_procedimento (campo 56) - Nome grupo procedimento
- codigo_interno_procedimento (campo 15) - Código interno procedimento no SISREG
- codigo_grupo_procedimento (campo 14) - Código grupo do procedimento no SISREG
- codigo_sigtap_procedimento (campo 19) - Código SIGTAP do procedimento

## Campos de Unidade
- nome_unidade_solicitante (campo 68) - Nome da unidade solicitante
- nome_unidade_executante (campo 67) - Nome da unidade executante

## Status para Fila de Espera (Solicitações Pendentes)
- "SOLICITAÇÃO / PENDENTE / REGULADOR"
- "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA"
- "SOLICITAÇÃO / DEVOLVIDA / REGULADOR"
- "SOLICITAÇÃO / REENVIADA / REGULADOR"

## Observação
Para buscar pacientes na fila de espera (solicitações pendentes), usar status_solicitacao com valores de pendente/fila de espera.
