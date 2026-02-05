import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { 
  ALL_AVAILABLE_FIELDS, 
  FIELD_CATEGORIES, 
  DEFAULT_FIELDS,
  RISK_LABELS,
  SITUACAO_LABELS,
  type QueryMode 
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

  // Query state
  const [mode, setMode] = useState<QueryMode>("quick");
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
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
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

    // Build CSV content
    const csvRows = [headers.join(";")];
    
    results.hits.forEach((hit) => {
      const row = headers.map((header) => {
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
    link.download = `sisreg_${mode}_${new Date().toISOString().split("T")[0]}.csv`;
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

  // Select all fields in category
  const toggleCategory = (category: string) => {
    const categoryFields = ALL_AVAILABLE_FIELDS
      .filter((f) => f.category === category)
      .map((f) => f.key);
    
    const allSelected = categoryFields.every((f) => selectedFields.includes(f));
    
    if (allSelected) {
      setSelectedFields((prev) => prev.filter((f) => !categoryFields.includes(f)));
    } else {
      setSelectedFields((prev) => Array.from(new Set([...prev, ...categoryFields])));
    }
  };

  // Get display columns - sempre incluir telefone
  const displayColumns = useMemo(() => {
    if (selectedFields.length > 0) {
      // Se usuário selecionou campos, garantir que telefone esteja incluso
      if (!selectedFields.includes("telefone")) {
        return [...selectedFields, "telefone"];
      }
      return selectedFields;
    }
    // Colunas padrão: paciente, procedimento, telefone e campos do modo
    const modeFields = mode === "novas" ? DEFAULT_FIELDS.novas :
                       mode === "agendadas" ? DEFAULT_FIELDS.agendadas :
                       mode === "atendidas" ? DEFAULT_FIELDS.atendidas :
                       DEFAULT_FIELDS.novas;
    // Incluir: codigo, nome, telefone, procedimento, risco, status + campos do modo
    return [
      "codigo_solicitacao",
      "no_usuario",
      "telefone",
      "descricao_interna_procedimento",
      "codigo_classificacao_risco",
      "status_solicitacao",
      ...modeFields.slice(0, 3),
    ];
  }, [selectedFields, mode]);

  // Format cell value
  const formatCellValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return "-";
    
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
    const field = ALL_AVAILABLE_FIELDS.find((f) => f.key === key);
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
              Faça login para acessar a consulta SISREG
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
            <Link href="/configuracao">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.name}
            </span>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Config warning */}
        {!configQuery.isLoading && !configQuery.data && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium">Configuração necessária</p>
                <p className="text-sm text-muted-foreground">
                  Configure suas credenciais do SISREG para realizar consultas
                </p>
              </div>
              <Link href="/configuracao">
                <Button variant="outline" size="sm">
                  Configurar
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Filters Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Query Mode */}
                <div className="space-y-2">
                  <Label>Tipo de Consulta</Label>
                  <Tabs value={mode} onValueChange={(v) => setMode(v as QueryMode)}>
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="quick" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Rápida
                      </TabsTrigger>
                      <TabsTrigger value="novas" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Novas
                      </TabsTrigger>
                    </TabsList>
                    <TabsList className="grid grid-cols-2 w-full mt-1">
                      <TabsTrigger value="agendadas" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Agendadas
                      </TabsTrigger>
                      <TabsTrigger value="atendidas" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Atendidas
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Date Range */}
                {mode !== "quick" && (
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">De</Label>
                        <Input
                          type="date"
                          value={dateStart}
                          onChange={(e) => setDateStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Até</Label>
                        <Input
                          type="date"
                          value={dateEnd}
                          onChange={(e) => setDateEnd(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Procedimento Search */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Buscar Procedimento
                  </Label>
                  <Input
                    placeholder="Digite parte do nome ou descrição..."
                    value={procedimentoSearch}
                    onChange={(e) => setProcedimentoSearch(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Busca parcial por descrição ou nome do procedimento
                  </p>
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Select value={String(size)} onValueChange={(v) => setSize(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 registros</SelectItem>
                      <SelectItem value="50">50 registros</SelectItem>
                      <SelectItem value="100">100 registros</SelectItem>
                      <SelectItem value="250">250 registros</SelectItem>
                      <SelectItem value="500">500 registros</SelectItem>
                      <SelectItem value="1000">1000 registros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Field Selector Toggle */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
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
                      const categoryFields = ALL_AVAILABLE_FIELDS.filter(
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
                    Gerar Insights
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={!results.hits.length}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
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
                            {displayColumns.map((col) => (
                              <td key={col} className="whitespace-nowrap">
                                {formatCellValue(col, hit[col])}
                              </td>
                            ))}
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
                    Configure os filtros e clique em Consultar
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
