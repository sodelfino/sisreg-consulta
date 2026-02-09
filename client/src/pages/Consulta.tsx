import { useState, useMemo, useEffect } from "react";
import { differenceInDays, differenceInMonths, parseISO } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Download,
  Filter,
  Loader2,
  Phone,
  Search,
  Settings,
  Sparkles,
  Stethoscope,
  X,
  Zap,
  FileText,
  Building2,
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { getLoginUrl } from "@/const";
import { 
  ALL_FIELDS_MARCACAO,
  ALL_FIELDS_SOLICITACAO,
  FIELD_CATEGORIES, 
  DEFAULT_FIELDS_MARCACAO,
  DEFAULT_FIELDS_SOLICITACAO,
  RISK_LABELS,
  SITUACAO_LABELS,
  INDEX_LABELS,
  type QueryMode,
  type IndexType,
} from "../../../shared/sisreg";

type SearchResult = {
  ok: boolean;
  status: number;
  took?: number;
  total: number;
  hits: Record<string, unknown>[];
  errorMessage?: string;
};

export default function Consulta() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Index type state - read from URL query param
  const searchParams = useSearch();
  const initialType = new URLSearchParams(searchParams).get("tipo") as IndexType | null;
  const [indexType, setIndexType] = useState<IndexType>(initialType === "solicitacao" ? "solicitacao" : "marcacao");
  const [initialMode] = useState<QueryMode>(initialType === "solicitacao" ? "fila" : "quick");
  
  // Mudar modo quando indexType mudar
  useEffect(() => {
    if (indexType === "solicitacao") {
      setMode("fila");
    } else if (mode === "fila") {
      setMode("quick");
    }
  }, [indexType]);

  // Query state
  const [mode, setMode] = useState<QueryMode>(initialMode);
  const [size, setSize] = useState(100);
  const [from, setFrom] = useState(0);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [procedimentoSearch, setProcedimentoSearch] = useState("");

  // Results state
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Insights state
  const [insights, setInsights] = useState<string>("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Check config
  const configQuery = trpc.config.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Search mutation
  const searchMutation = trpc.search.execute.useMutation({
    onSuccess: (data) => {
      setResults(data);
      if (data.ok) {
        toast.success(`${data.total} registros encontrados em ${data.took}ms`);
      } else {
        toast.error(data.errorMessage || "Erro na consulta");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Insights mutation
  const insightsMutation = trpc.insights.generate.useMutation({
    onSuccess: (data) => {
      if (data.ok) {
        setInsights(data.insights);
      } else {
        toast.error(data.error || "Erro ao gerar insights");
      }
      setIsGeneratingInsights(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsGeneratingInsights(false);
    },
  });

  // Handle index type change
  const handleIndexTypeChange = (newType: IndexType) => {
    setIndexType(newType);
    setResults(null);
    setInsights("");
    setFrom(0);
    setSelectedFields([]);
  };

  // Handle search
  const handleSearch = async () => {
    if (!configQuery.data) {
      toast.error("Configure suas credenciais primeiro");
      setLocation("/configuracao");
      return;
    }

    // Validate dates for non-quick modes
    if (mode !== "quick" && (!dateStart || !dateEnd)) {
      toast.error("Selecione o período de datas");
      return;
    }

    if (dateStart && dateEnd && new Date(dateStart) > new Date(dateEnd)) {
      toast.error("Data inicial deve ser anterior à data final");
      return;
    }

    setIsSearching(true);
    setInsights("");
    
    try {
      await searchMutation.mutateAsync({
        indexType,
        mode,
        size,
        from,
        dateStart: dateStart || undefined,
        dateEnd: dateEnd || undefined,
        selectedFields: selectedFields.length > 0 ? selectedFields : undefined,
        procedimentoSearch: procedimentoSearch.trim() || undefined,
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle pagination
  const handlePageChange = (newFrom: number) => {
    setFrom(newFrom);
    searchMutation.mutate({
      indexType,
      mode,
      size,
      from: newFrom,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      selectedFields: selectedFields.length > 0 ? selectedFields : undefined,
      procedimentoSearch: procedimentoSearch.trim() || undefined,
    });
  };

  // Generate insights
  const handleGenerateInsights = () => {
    if (!results?.hits || results.hits.length === 0) {
      toast.error("Execute uma consulta primeiro");
      return;
    }

    setIsGeneratingInsights(true);
    insightsMutation.mutate({
      data: results.hits,
      queryMode: mode,
      indexType,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
    });
  };

  // Export XLSX via backend
  const exportXlsxMutation = trpc.search.exportXlsx.useMutation({
    onSuccess: (data) => {
      if (data.ok && data.data) {
        const byteCharacters = atob(data.data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Excel exportado: ${data.data.totalExported.toLocaleString("pt-BR")} de ${data.data.totalAvailable.toLocaleString("pt-BR")} registros`);
      } else {
        toast.error(data.error || "Erro ao exportar");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleExportXlsx = () => {
    if (!configQuery.data) return;
    exportXlsxMutation.mutate({
      indexType,
      mode,
      size,
      from: 0,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      procedimentoSearch: procedimentoSearch.trim() || undefined,
      exportAllPages: true,
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!results?.hits || results.hits.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    // Get all unique keys from hits
    const allKeys = new Set<string>();
    results.hits.forEach((hit) => {
      Object.keys(hit).forEach((key) => allKeys.add(key));
    });
    const headers = Array.from(allKeys);
    
    // Adicionar coluna de tempo de espera para solicitações
    const isFilaSolicitacao = indexType === "solicitacao";
    if (isFilaSolicitacao && !headers.includes("tempo_espera_dias")) {
      headers.push("tempo_espera_dias");
    }

    // Build CSV content
    const csvRows = [headers.join(";")];
    
    results.hits.forEach((hit) => {
      const row = headers.map((header) => {
        // Coluna calculada de tempo de espera
        if (header === "tempo_espera_dias" && isFilaSolicitacao) {
          const { dias, texto } = calcularTempoEspera(hit.data_solicitacao);
          return `${dias} (${texto})`;
        }
        const value = hit[header];
        if (value === null || value === undefined) return "";
        const strValue = String(value);
        // Escape quotes and wrap in quotes if contains separator or quotes
        if (strValue.includes(";") || strValue.includes('"') || strValue.includes("\n")) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      });
      csvRows.push(row.join(";"));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sisreg_${indexType}_${mode}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("CSV exportado com sucesso!");
  };

  // Toggle field selection
  const toggleField = (fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  // Get available fields based on index type
  const availableFields = useMemo(() => {
    return indexType === "solicitacao" ? ALL_FIELDS_SOLICITACAO : ALL_FIELDS_MARCACAO;
  }, [indexType]);

  // Select all fields in category
  const toggleCategory = (category: string) => {
    const categoryFields = availableFields
      .filter((f) => f.category === category)
      .map((f) => f.key);
    
    const allSelected = categoryFields.every((f) => selectedFields.includes(f));
    
    if (allSelected) {
      setSelectedFields((prev) => prev.filter((f) => !categoryFields.includes(f)));
    } else {
      setSelectedFields((prev) => Array.from(new Set([...prev, ...categoryFields])));
    }
  };

  // Get default fields based on index type
  const getDefaultFields = () => {
    return indexType === "solicitacao" ? DEFAULT_FIELDS_SOLICITACAO : DEFAULT_FIELDS_MARCACAO;
  };

  // Get display columns - sempre incluir telefone e estabelecimento
  const displayColumns = useMemo(() => {
    const defaultFields = getDefaultFields();
    const estabelecimentoField = indexType === "marcacao" ? "nome_unidade_executante" : "nome_unidade_solicitante";
    
    if (selectedFields.length > 0) {
      // Se usuário selecionou campos, garantir que telefone e estabelecimento estejam inclusos
      const cols = [...selectedFields];
      if (!cols.includes("telefone")) cols.push("telefone");
      if (!cols.includes(estabelecimentoField)) cols.push(estabelecimentoField);
      return cols;
    }
    
    // Colunas padrão: paciente, procedimento, telefone, estabelecimento e campos do modo
    let modeFields: string[];
    if (indexType === "marcacao") {
      const marcacaoFields = defaultFields as typeof import("@shared/sisreg").DEFAULT_FIELDS_MARCACAO;
      modeFields = mode === "novas" ? marcacaoFields.novas :
                   mode === "agendadas" ? marcacaoFields.agendadas :
                   mode === "atendidas" ? marcacaoFields.atendidas :
                   marcacaoFields.novas;
    } else {
      const solicitacaoFields = defaultFields as typeof import("@shared/sisreg").DEFAULT_FIELDS_SOLICITACAO;
      modeFields = solicitacaoFields.fila;
    }
    
    // Colunas de procedimento dependem do tipo de índice
    if (indexType === "marcacao") {
      return [
        "codigo_solicitacao",
        "no_usuario",
        "telefone",
        estabelecimentoField,
        "descricao_interna_procedimento",
        "descricao_sigtap_procedimento",
        "nome_grupo_procedimento",
        "codigo_classificacao_risco",
        "status_solicitacao",
        ...modeFields.slice(0, 2),
      ];
    } else {
      // Solicitação: campos específicos da fila (inclui tempo de espera calculado)
      return [
        "no_usuario",
        "cns_usuario",
        "telefone",
        "nome_unidade_solicitante",
        "descricao_interna_procedimento",
        "nome_grupo_procedimento",
        "codigo_classificacao_risco",
        "sigla_situacao",
        "data_solicitacao",
        "__tempo_espera",
        "nome_medico_solicitante",
        "codigo_tipo_regulacao",
      ];
    }
  }, [selectedFields, mode, indexType]);

  // Calcular tempo de espera a partir da data_solicitacao
  const calcularTempoEspera = (dataSolicitacao: unknown): { dias: number; texto: string } => {
    if (!dataSolicitacao) return { dias: 0, texto: "-" };
    try {
      const dataStr = String(dataSolicitacao);
      const data = dataStr.includes("T") ? parseISO(dataStr) : new Date(dataStr);
      if (isNaN(data.getTime())) return { dias: 0, texto: "-" };
      
      const hoje = new Date();
      const dias = differenceInDays(hoje, data);
      const meses = differenceInMonths(hoje, data);
      
      if (meses >= 1) {
        const diasRestantes = dias - (meses * 30);
        return { dias, texto: `${meses} ${meses === 1 ? "mês" : "meses"}, ${diasRestantes} dias` };
      }
      return { dias, texto: `${dias} ${dias === 1 ? "dia" : "dias"}` };
    } catch {
      return { dias: 0, texto: "-" };
    }
  };

  // Cor do tempo de espera baseada nos dias
  const getCorTempoEspera = (dias: number): string => {
    if (dias <= 30) return "text-green-600 bg-green-50";
    if (dias <= 90) return "text-yellow-600 bg-yellow-50";
    if (dias <= 120) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  // Format cell value
  const formatCellValue = (key: string, value: unknown, hit?: Record<string, unknown>): string => {
    if (value === null || value === undefined || value === "") {
      // Fallback para descrição de procedimento: tentar múltiplos campos
      if (key === "descricao_interna_procedimento" && hit) {
        // Ordem de prioridade: descricao_sigtap > nome_grupo_procedimento > codigo_interno_procedimento
        if (hit.descricao_sigtap_procedimento) return String(hit.descricao_sigtap_procedimento);
        if (hit.nome_grupo_procedimento) return String(hit.nome_grupo_procedimento);
        if (hit.codigo_interno_procedimento) return `Código: ${hit.codigo_interno_procedimento}`;
      }
      return "-";
    }
    
    // Format dates
    if (key.startsWith("data_") || key.startsWith("dt_")) {
      try {
        const date = new Date(String(value));
        return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      } catch {
        return String(value);
      }
    }

    // Format risk classification
    if (key === "codigo_classificacao_risco") {
      const riskNum = Number(value);
      return RISK_LABELS[riskNum] || String(value);
    }

    // Format situation
    if (key === "sigla_situacao") {
      return SITUACAO_LABELS[String(value)] || String(value);
    }

    return String(value);
  };

  // Get field label
  const getFieldLabel = (key: string): string => {
    // Custom labels
    if (key === "nome_unidade_executante") return "Estabelecimento";
    if (key === "nome_unidade_solicitante") return "Unidade Solicitante";
    if (key === "__tempo_espera") return "Tempo de Espera";
    
    const field = availableFields.find((f) => f.key === key);
    return field?.label || key;
  };

  // Pagination info
  const currentPage = Math.floor(from / size) + 1;
  const totalPages = results ? Math.ceil(results.total / size) : 0;

  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Faça login para acessar as consultas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href={getLoginUrl()}>
              <Button className="w-full">Fazer Login</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">SISREG Consulta</h1>
                  <p className="text-xs text-muted-foreground">Macaé - RJ</p>
                </div>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name}
            </span>
            <Link href="/configuracao">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Config Warning */}
        {!configQuery.data && !configQuery.isLoading && (
          <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <p className="font-medium">Configuração necessária</p>
                <p className="text-sm text-muted-foreground">
                  Configure suas credenciais do SISREG para realizar consultas
                </p>
              </div>
              <Link href="/configuracao">
                <Button size="sm">Configurar</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Index Type Selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            <Button
              variant={indexType === "marcacao" ? "default" : "outline"}
              onClick={() => handleIndexTypeChange("marcacao")}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Marcações Ambulatoriais
            </Button>
            <Button
              variant={indexType === "solicitacao" ? "default" : "outline"}
              onClick={() => handleIndexTypeChange("solicitacao")}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Solicitações Ambulatoriais
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {indexType === "marcacao" 
              ? "Consulte marcações de procedimentos ambulatoriais já agendados"
              : "Consulte solicitações de procedimentos ambulatoriais em fila de espera"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Filters Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Query Mode */}
                <Tabs value={mode} onValueChange={(v) => setMode(v as QueryMode)}>
                  {indexType === "marcacao" ? (
                    <TabsList className="grid grid-cols-2 h-auto">
                      <TabsTrigger value="quick" className="text-xs py-2">
                        <Zap className="mr-1 h-3 w-3" />
                        Rápida
                      </TabsTrigger>
                      <TabsTrigger value="novas" className="text-xs py-2">
                        <Clock className="mr-1 h-3 w-3" />
                        Novas
                      </TabsTrigger>
                      <TabsTrigger value="agendadas" className="text-xs py-2">
                        <Calendar className="mr-1 h-3 w-3" />
                        Agendadas
                      </TabsTrigger>
                      <TabsTrigger value="atendidas" className="text-xs py-2">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Atendidas
                      </TabsTrigger>
                    </TabsList>
                  ) : (
                    <TabsList className="grid grid-cols-1 h-auto">
                      <TabsTrigger value="fila" className="text-xs py-2">
                        <Database className="mr-1 h-3 w-3" />
                        Fila de Solicitações
                      </TabsTrigger>
                    </TabsList>
                  )}
                </Tabs>

                {/* Date Range */}
                {mode !== "quick" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="dateStart" className="text-xs">Data Inicial</Label>
                      <Input
                        id="dateStart"
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dateEnd" className="text-xs">Data Final</Label>
                      <Input
                        id="dateEnd"
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                {/* Procedimento Search */}
                <div className="space-y-1">
                  <Label htmlFor="procedimentoSearch" className="text-xs">Buscar Procedimento</Label>
                  <div className="relative">
                    <Stethoscope className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="procedimentoSearch"
                      placeholder="Digite parte do nome..."
                      value={procedimentoSearch}
                      onChange={(e) => setProcedimentoSearch(e.target.value)}
                      className="h-9 pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Busca parcial por descrição ou nome do procedimento
                  </p>
                </div>

                {/* Size */}
                <div className="space-y-1">
                  <Label htmlFor="size" className="text-xs">Resultados por página</Label>
                  <Select value={String(size)} onValueChange={(v) => setSize(Number(v))}>
                    <SelectTrigger id="size" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Field Selector Toggle */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setShowFieldSelector(!showFieldSelector)}
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Campos
                    </span>
                    <Badge variant="secondary">
                      {selectedFields.length || "Padrão"}
                    </Badge>
                  </Button>
                </div>

                {/* Search Button */}
                <Button
                  className="w-full"
                  onClick={handleSearch}
                  disabled={isSearching || !configQuery.data}
                >
                  {isSearching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Consultar
                </Button>
              </CardContent>
            </Card>

            {/* Field Selector */}
            {showFieldSelector && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Selecionar Campos</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowFieldSelector(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    {FIELD_CATEGORIES.map((category) => {
                      const categoryFields = availableFields.filter(
                        (f) => f.category === category.key
                      );
                      const selectedCount = categoryFields.filter((f) =>
                        selectedFields.includes(f.key)
                      ).length;

                      return (
                        <div key={category.key} className="mb-4">
                          <div
                            className="flex items-center gap-2 mb-2 cursor-pointer hover:text-primary"
                            onClick={() => toggleCategory(category.key)}
                          >
                            <Checkbox
                              checked={selectedCount === categoryFields.length}
                              className="pointer-events-none"
                            />
                            <span className="font-medium text-sm">
                              {category.label}
                            </span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {selectedCount}/{categoryFields.length}
                            </Badge>
                          </div>
                          <div className="ml-6 space-y-1">
                            {categoryFields.map((field) => (
                              <div
                                key={field.key}
                                className="flex items-center gap-2 cursor-pointer hover:text-primary"
                                onClick={() => toggleField(field.key)}
                              >
                                <Checkbox
                                  checked={selectedFields.includes(field.key)}
                                  className="pointer-events-none"
                                />
                                <span className="text-sm">{field.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </ScrollArea>
                  {selectedFields.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedFields([])}
                    >
                      Limpar seleção
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Results Header */}
            {results && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Badge variant={results.ok ? "default" : "destructive"}>
                    {results.ok ? `${results.total} resultados` : "Erro"}
                  </Badge>
                  <Badge variant="outline">
                    {INDEX_LABELS[indexType]}
                  </Badge>
                  {results.took && (
                    <span className="text-sm text-muted-foreground">
                      {results.took}ms
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateInsights}
                    disabled={isGeneratingInsights || !results.hits.length}
                  >
                    {isGeneratingInsights ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Insights IA
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportXlsx}
                    disabled={exportXlsxMutation.isPending || !results.hits.length}
                  >
                    {exportXlsxMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Excel (XLSX)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={!results.hits.length}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {results?.ok && (
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {INDEX_LABELS[indexType]}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Modo: {mode === "fila" ? "Fila" : mode === "quick" ? "Rápida" : mode}
                </Badge>
                {dateStart && dateEnd && (
                  <Badge variant="secondary" className="text-xs">
                    Período: {dateStart} a {dateEnd}
                  </Badge>
                )}
                {procedimentoSearch && (
                  <Badge variant="secondary" className="text-xs">
                    Procedimento: {procedimentoSearch}
                  </Badge>
                )}
                {selectedFields.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedFields.length} campos selecionados
                  </Badge>
                )}
              </div>
            )}

            {/* Insights */}
            {insights && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none">
                  <Streamdown>{insights}</Streamdown>
                </CardContent>
              </Card>
            )}

            {/* Error Message */}
            {results && !results.ok && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="flex items-center gap-4 py-4">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">Erro na consulta</p>
                    <p className="text-sm text-muted-foreground">
                      {results.errorMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Table */}
            {results?.ok && results.hits.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {displayColumns.map((col) => (
                            <th key={col} className="whitespace-nowrap">
                              {getFieldLabel(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.hits.map((hit, idx) => (
                          <tr key={idx}>
                            {displayColumns.map((col) => {
                              // Coluna especial: Tempo de Espera (calculado no frontend)
                              if (col === "__tempo_espera") {
                                const { dias, texto } = calcularTempoEspera(hit.data_solicitacao);
                                const corClasse = getCorTempoEspera(dias);
                                return (
                                  <td key={col} className="whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${corClasse}`}>
                                      <Clock className="h-3 w-3" />
                                      {texto}
                                    </span>
                                  </td>
                                );
                              }
                              return (
                                <td key={col} className="whitespace-nowrap">
                                  {formatCellValue(col, hit[col], hit)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {results?.ok && results.hits.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Nenhum resultado encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    Tente ajustar os filtros da consulta
                  </p>
                </CardContent>
              </Card>
            )}

            {/* No Results Yet */}
            {!results && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Pronto para consultar</p>
                  <p className="text-sm text-muted-foreground">
                    Selecione o tipo de consulta, configure os filtros e clique em Consultar
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {results?.ok && totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {from + 1} - {Math.min(from + size, results.total)} de{" "}
                  {results.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(0, from - size))}
                    disabled={from === 0 || searchMutation.isPending}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(from + size)}
                    disabled={from + size >= results.total || searchMutation.isPending}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
