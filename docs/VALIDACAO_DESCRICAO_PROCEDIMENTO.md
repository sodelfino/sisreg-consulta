# Validação: Formatação de Descrição de Procedimento

## Resumo da Correção

A coluna **Descrição Procedimento** no módulo **Solicitações Ambulatoriais (Fila)** foi corrigida para usar exclusivamente os campos corretos, removendo o fallback indevido que exibia o nome do grupo de procedimento.

## Regras de Formatação Implementadas

### Coluna: Descrição Procedimento

**Ordem de prioridade:**
1. `descricao_interna_procedimento` (campo principal)
2. `codigo_interno_procedimento` (fallback quando descrição vazia - exibe como "Código: XXXXXXXX")
3. `-` (quando ambos estão vazios)

**Campos REMOVIDOS do fallback:**
- ❌ `nome_grupo_procedimento` (agora é coluna separada)
- ❌ `descricao_sigtap_procedimento` (removido do fallback)

### Filtro: Buscar Procedimento

**Campos utilizados na busca:**
- ✅ `descricao_interna_procedimento` (busca com wildcard, match_phrase_prefix e fuzzy)
- ✅ `codigo_interno_procedimento` (busca exata com term)

**Campos REMOVIDOS da busca:**
- ❌ `nome_grupo_procedimento`
- ❌ `descricao_sigtap_procedimento`

## Cenários de Teste Validados

### ✅ Cenário 1: Descrição preenchida
**Dados:**
```json
{
  "descricao_interna_procedimento": "CONSULTA MÉDICA EM CARDIOLOGIA",
  "nome_grupo_procedimento": "CONSULTAS",
  "codigo_interno_procedimento": "0301010010"
}
```
**Resultado esperado:** `CONSULTA MÉDICA EM CARDIOLOGIA`  
**Status:** ✅ Passou no teste

---

### ✅ Cenário 2: Descrição vazia, código disponível
**Dados:**
```json
{
  "descricao_interna_procedimento": "",
  "nome_grupo_procedimento": "CONSULTAS",
  "codigo_interno_procedimento": "0301010010"
}
```
**Resultado esperado:** `Código: 0301010010`  
**Status:** ✅ Passou no teste

---

### ✅ Cenário 3: Descrição vazia, sem código
**Dados:**
```json
{
  "descricao_interna_procedimento": "",
  "nome_grupo_procedimento": "CONSULTAS"
}
```
**Resultado esperado:** `-`  
**Status:** ✅ Passou no teste

---

### ✅ Cenário 4: NÃO deve usar nome_grupo_procedimento
**Dados:**
```json
{
  "descricao_interna_procedimento": "",
  "nome_grupo_procedimento": "CONSULTAS",
  "codigo_interno_procedimento": "0301010010"
}
```
**Resultado NÃO esperado:** ~~`CONSULTAS`~~  
**Resultado correto:** `Código: 0301010010`  
**Status:** ✅ Passou no teste (não exibe o grupo)

---

### ✅ Cenário 5: NÃO deve usar descricao_sigtap_procedimento
**Dados:**
```json
{
  "descricao_interna_procedimento": "",
  "descricao_sigtap_procedimento": "CONSULTA EM ATENÇÃO ESPECIALIZADA",
  "codigo_interno_procedimento": "0301010010"
}
```
**Resultado NÃO esperado:** ~~`CONSULTA EM ATENÇÃO ESPECIALIZADA`~~  
**Resultado correto:** `Código: 0301010010`  
**Status:** ✅ Passou no teste (não exibe SIGTAP)

---

## Testes Unitários

**Arquivo:** `server/procedimento-fallback.test.ts`  
**Total de testes:** 6  
**Status:** ✅ Todos passaram

```bash
✓ Procedimento Fallback Logic (6)
  ✓ Descrição Procedimento (5)
    ✓ deve retornar descricao_interna_procedimento quando preenchido
    ✓ deve retornar codigo_interno_procedimento quando descricao vazia
    ✓ NÃO deve retornar nome_grupo_procedimento como fallback
    ✓ deve retornar '-' quando ambos estão vazios
    ✓ NÃO deve usar descricao_sigtap_procedimento como fallback
  ✓ Filtro de Busca (1)
    ✓ deve buscar apenas em descricao_interna_procedimento e codigo_interno_procedimento
```

## Arquivos Modificados

1. **`client/src/pages/Consulta.tsx`** (linhas 438-442)
   - Removido fallback para `descricao_sigtap_procedimento` e `nome_grupo_procedimento`
   - Mantido apenas `codigo_interno_procedimento` como fallback

2. **`server/sisreg.ts`** (linhas 221-228)
   - Removido busca em `descricao_sigtap_procedimento` e `nome_grupo_procedimento`
   - Mantido busca apenas em `descricao_interna_procedimento` e `codigo_interno_procedimento`

3. **`shared/sisreg.ts`** (linha 137, 217)
   - Campo `nome_grupo_procedimento` permanece no _source e como coluna separada
   - Label: "Nome Grupo Procedimento"

## Como Testar Manualmente

1. Acesse **Solicitações Ambulatoriais (Fila)**
2. Execute uma consulta sem filtros
3. Verifique a coluna **Descrição Procedimento**:
   - Se `descricao_interna_procedimento` estiver preenchido → exibe a descrição
   - Se estiver vazio mas `codigo_interno_procedimento` existir → exibe "Código: XXXXXXXX"
   - Se ambos estiverem vazios → exibe "-"
   - **NUNCA** deve exibir o nome do grupo de procedimento nesta coluna

4. Teste o filtro **Buscar Procedimento**:
   - Digite "CARDIO" → deve buscar em `descricao_interna_procedimento`
   - Digite "0301010010" → deve buscar em `codigo_interno_procedimento`
   - **NÃO** busca em `nome_grupo_procedimento`

## Conclusão

✅ A formatação da coluna **Descrição Procedimento** está correta e validada  
✅ O fallback indevido foi removido  
✅ O filtro de busca usa apenas os campos corretos  
✅ Nome Grupo Procedimento permanece como coluna separada  
✅ Todos os testes unitários passaram

**Próximos passos sugeridos:**
1. Adicionar coluna "Nome Grupo Procedimento" aos campos padrão da tabela
2. Criar filtros dropdown para Central Reguladora e Status
3. Adicionar indicadores visuais de filtros ativos na exportação
