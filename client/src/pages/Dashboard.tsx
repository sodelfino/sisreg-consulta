import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Lightbulb,
  Loader2,
  PieChart,
  RefreshCw,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { RISK_LABELS, INDEX_LABELS, type QueryMode, type IndexType } from "../../../shared/sisreg";
import { Streamdown } from "streamdown";

// Colors for charts
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#8DD1E1", "#A4DE6C", "#D0ED57",
  "#FA8072", "#DDA0DD", "#87CEEB", "#F0E68C", "#E6E6FA",
];

const RISK_COLORS: Record<string, string> = {
  "0": "#6B7280",
  "1": "#EF4444",
  "2": "#F97316",
  "3": "#EAB308",
  "4": "#22C55E",
  "5": "#3B82F6",
};

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Filter state
  const [indexType, setIndexType] = useState<IndexType>("solicitacao");
  const [mode, setMode] = useState<QueryMode>("fila");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedProcedimentos, setSelectedProcedimentos] = useState<string[]>([]);
  const [showProcedimentoFilter, setShowProcedimentoFilter] = useState(false);
  const [procedimentoSearch, setProcedimentoSearch] = useState("");
  const [showLlmInsights, setShowLlmInsights] = useState(false);

  // Mudar modo quando indexType mudar
  useEffect(() => {
    if (indexType === "solicitacao") {
      setMode("fila");
    } else if (mode === "fila") {
      setMode("quick");
    }
  }, [indexType]);

  // Check config
  const configQuery = trpc.config.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Dashboard aggregation mutation
  const aggregateMutation = trpc.dashboard.aggregate.useMutation({
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Dashboard atualizado com ${data.data?.total.toLocaleString("pt-BR")} registros`);
      } else {
        toast.error(data.error || "Erro ao carregar dados");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // XLSX export mutation
  const exportMutation = trpc.search.exportXlsx.useMutation({
    onSuccess: (data) => {
      if (data.ok && data.data) {
        // Download the XLSX file from base64
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
        toast.success(`Excel exportado: ${data.data.totalExported.toLocaleString("pt-BR")} registros`);
      } else {
        toast.error(data.error || "Erro ao exportar");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // LLM insights mutation
  const insightsMutation = trpc.insights.generate.useMutation({
    onSuccess: (data) => {
      if (data.ok) {
        setShowLlmInsights(true);
      } else {
        toast.error(data.error || "Erro ao gerar insights");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Métricas gerenciais
  const topProcedures = trpc.metrics.topProcedures.useQuery(
    { dateStart, dateEnd, limit: 10 },
    { enabled: isAuthenticated && indexType === "solicitacao" }
  );

  const averageWaitTime = trpc.metrics.averageWaitTime.useQuery(
    { dateStart, dateEnd },
    { enabled: isAuthenticated && indexType === "solicitacao" }
  );

  // Load dashboard data
  const handleLoadDashboard = () => {
    if (!configQuery.data) {
      toast.error("Configure suas credenciais primeiro");
      setLocation("/configuracao");
      return;
    }

    if (mode !== "quick" && mode !== "fila" && (!dateStart || !dateEnd)) {
      toast.error("Selecione o período de datas");
      return;
    }

    setShowLlmInsights(false);
    aggregateMutation.mutate({
      indexType,
      mode,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      procedimentoFilter: selectedProcedimentos.length > 0 ? selectedProcedimentos : undefined,
    });
  };

  // Export XLSX via backend
  const handleExportExcel = () => {
    if (!configQuery.data) return;

    exportMutation.mutate({
      indexType,
      mode,
      size: 1000,
      from: 0,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      procedimentoSearch: selectedProcedimentos.length > 0 ? selectedProcedimentos[0] : undefined,
      exportAllPages: true,
    });
  };

  // Generate LLM insights
  const handleGenerateLlmInsights = () => {
    if (!dashboardData) return;

    // Build a summary dataset for LLM
    const summaryData = [
      ...dashboardData.byUnidade.map(u => ({
        tipo: "unidade",
        nome: u.name,
        quantidade: u.value,
      })),
      ...dashboardData.byProcedimento.map(p => ({
        tipo: "procedimento",
        nome: p.name,
        quantidade: p.value,
      })),
      ...dashboardData.byRisco.map(r => ({
        tipo: "risco",
        nome: RISK_LABELS[Number(r.name)] || r.name,
        quantidade: r.value,
      })),
      ...dashboardData.byStatus.map(s => ({
        tipo: "status",
        nome: s.name,
        quantidade: s.value,
      })),
    ];

    insightsMutation.mutate({
      data: summaryData,
      queryMode: mode,
      indexType,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
    });
  };

  // Filter procedimentos for selection
  const filteredProcedimentos = useMemo(() => {
    if (!aggregateMutation.data?.data?.allProcedimentos) return [];
    const search = procedimentoSearch.toLowerCase();
    return aggregateMutation.data.data.allProcedimentos.filter(
      (p) => p.toLowerCase().includes(search)
    );
  }, [aggregateMutation.data?.data?.allProcedimentos, procedimentoSearch]);

  // Toggle procedimento selection
  const toggleProcedimento = (proc: string) => {
    setSelectedProcedimentos((prev) =>
      prev.includes(proc) ? prev.filter((p) => p !== proc) : [...prev, proc]
    );
  };

  // Apply procedimento filter
  const handleApplyProcedimentoFilter = () => {
    if (!configQuery.data) return;
    aggregateMutation.mutate({
      indexType,
      mode,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      procedimentoFilter: selectedProcedimentos.length > 0 ? selectedProcedimentos : undefined,
    });
  };

  // Format risk label
  const formatRiskLabel = (name: string) => {
    return RISK_LABELS[Number(name)] || `Risco ${name}`;
  };

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
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>Faça login para acessar o dashboard</CardDescription>
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

  const dashboardData = aggregateMutation.data?.data;

  // Build active filters summary
  const activeFilters: string[] = [];
  if (indexType === "marcacao") activeFilters.push("Marcações Ambulatoriais");
  else activeFilters.push("Solicitações Ambulatoriais (Fila)");
  if (mode !== "quick" && mode !== "fila") activeFilters.push(`Modo: ${mode}`);
  if (dateStart && dateEnd) activeFilters.push(`Período: ${dateStart} a ${dateEnd}`);
  if (selectedProcedimentos.length > 0) activeFilters.push(`${selectedProcedimentos.length} procedimento(s) filtrado(s)`);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold leading-tight">SISREG Dashboard</h1>
                  <p className="text-[10px] text-muted-foreground">Macaé - RJ</p>
                </div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/consulta">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Database className="mr-1 h-3 w-3" />
                Consulta
              </Button>
            </Link>
            <Link href="/configuracao">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Settings className="mr-1 h-3 w-3" />
                Config
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-4">
        {/* Config Warning */}
        {!configQuery.data && !configQuery.isLoading && (
          <Card className="mb-4 border-amber-500/50 bg-amber-500/5">
            <CardContent className="flex items-center gap-3 py-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Configure suas credenciais do SISREG</p>
              </div>
              <Link href="/configuracao">
                <Button size="sm" className="h-7 text-xs">Configurar</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Filters - Compact */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6 items-end">
              {/* Index Type */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={indexType} onValueChange={(v) => setIndexType(v as IndexType)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marcacao">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Marcações
                      </span>
                    </SelectItem>
                    <SelectItem value="solicitacao">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Solicitações (Fila)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mode */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Modo</Label>
                {indexType === "solicitacao" ? (
                  <div className="h-8 flex items-center px-2 rounded-md border bg-muted/50 text-xs">
                    <FileText className="h-3 w-3 mr-1" /> Fila
                  </div>
                ) : (
                  <Select value={mode} onValueChange={(v) => setMode(v as QueryMode)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick"><span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Rápida</span></SelectItem>
                      <SelectItem value="novas"><span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Novas</span></SelectItem>
                      <SelectItem value="agendadas"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Agendadas</span></SelectItem>
                      <SelectItem value="atendidas"><span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Atendidas</span></SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Date Range */}
              {mode !== "quick" && mode !== "fila" ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                    <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data Final</Label>
                    <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="h-8 text-xs" />
                  </div>
                </>
              ) : (
                <div className="lg:col-span-2" />
              )}

              {/* Actions */}
              <div className="flex items-end gap-1 lg:col-span-2">
                <Button
                  onClick={handleLoadDashboard}
                  disabled={aggregateMutation.isPending || !configQuery.data}
                  className="flex-1 h-8 text-xs"
                >
                  {aggregateMutation.isPending ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  Carregar
                </Button>
                {dashboardData && (
                  <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    disabled={exportMutation.isPending}
                    className="h-8 text-xs"
                  >
                    {exportMutation.isPending ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-3 w-3" />
                    )}
                    XLSX
                  </Button>
                )}
              </div>
            </div>

            {/* Procedimento Filter */}
            {dashboardData && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={() => setShowProcedimentoFilter(!showProcedimentoFilter)}
                  >
                    <Filter className="h-3 w-3" />
                    Filtrar por Procedimentos ({selectedProcedimentos.length} selecionados)
                  </button>
                  {selectedProcedimentos.length > 0 && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSelectedProcedimentos([])}>
                        Limpar
                      </Button>
                      <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleApplyProcedimentoFilter}>
                        Aplicar
                      </Button>
                    </div>
                  )}
                </div>
                
                {showProcedimentoFilter && (
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Buscar procedimento..."
                      value={procedimentoSearch}
                      onChange={(e) => setProcedimentoSearch(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <ScrollArea className="h-[150px] border rounded-md p-1">
                      {filteredProcedimentos.map((proc) => (
                        <div
                          key={proc}
                          className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-muted/50 px-2 rounded text-xs"
                          onClick={() => toggleProcedimento(proc)}
                        >
                          <Checkbox checked={selectedProcedimentos.includes(proc)} className="pointer-events-none h-3 w-3" />
                          <span className="truncate">{proc}</span>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Content */}
        {dashboardData ? (
          <>
            {/* Active Filters Summary + KPIs Row */}
            <div className="flex flex-wrap gap-1 mb-3">
              {activeFilters.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] h-5">
                  {f}
                </Badge>
              ))}
            </div>

            {/* Summary KPIs - Compact */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
              <Card className="py-0">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl font-bold leading-tight">{dashboardData.total.toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-muted-foreground">Total Registros</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="py-0">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold leading-tight">{dashboardData.byUnidade.length}</p>
                      <p className="text-[10px] text-muted-foreground">Unidades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="py-0">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <BarChart3 className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold leading-tight">{dashboardData.byProcedimento.length}</p>
                      <p className="text-[10px] text-muted-foreground">Procedimentos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="py-0">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xl font-bold leading-tight">{dashboardData.totalUnfiltered.toLocaleString("pt-BR")}</p>
                      <p className="text-[10px] text-muted-foreground">Total Disponível</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Métricas Gerenciais - Apenas para Solicitações */}
            {indexType === "solicitacao" && topProcedures.data?.ok && averageWaitTime.data?.ok && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Métricas Gerenciais</h2>
                </div>

                {/* Cards de Métricas */}
                <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Tempo Médio de Espera
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="text-2xl font-bold">
                        {averageWaitTime.data.data.length > 0
                          ? Math.round(
                              averageWaitTime.data.data.reduce((sum, item) => sum + item.mediaDias, 0) /
                                averageWaitTime.data.data.length
                            )
                          : 0}{" "}
                        dias
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Média geral da fila</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Maior Tempo de Espera
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="text-2xl font-bold text-red-600">
                        {averageWaitTime.data.data.length > 0 ? averageWaitTime.data.data[0].mediaDias : 0} dias
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        {averageWaitTime.data.data.length > 0 ? averageWaitTime.data.data[0].descricao : "N/A"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Procedimento Mais Solicitado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="text-2xl font-bold">
                        {topProcedures.data.data.length > 0 ? topProcedures.data.data[0].total : 0}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        {topProcedures.data.data.length > 0 ? topProcedures.data.data[0].descricao : "N/A"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráfico de Top 10 Procedimentos */}
                <Card>
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      Top 10 Procedimentos Mais Solicitados
                    </CardTitle>
                    <CardDescription className="text-[10px]">Volume de solicitações por procedimento</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topProcedures.data.data.map((item) => ({
                            nome: item.descricao.length > 35 ? item.descricao.substring(0, 35) + "..." : item.descricao,
                            total: item.total,
                            nomeCompleto: item.descricao,
                          }))}
                          layout="vertical"
                          margin={{ top: 2, right: 20, left: 10, bottom: 2 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis
                            type="category"
                            dataKey="nome"
                            width={180}
                            tick={{ fontSize: 9 }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-background border rounded-lg p-2 shadow-lg">
                                    <p className="font-medium text-xs">{payload[0].payload.nomeCompleto}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Total: {payload[0].value} solicitações
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Tempo Médio de Espera */}
                <Card>
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Tempo Médio de Espera por Procedimento
                    </CardTitle>
                    <CardDescription className="text-[10px]">Top 15 procedimentos com maior tempo de espera</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-1">#</th>
                            <th className="text-left p-1">Procedimento</th>
                            <th className="text-right p-1">Média (dias)</th>
                            <th className="text-right p-1">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {averageWaitTime.data.data.slice(0, 15).map((item, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="p-1">{index + 1}</td>
                              <td className="p-1 text-[9px]">{item.descricao}</td>
                              <td className="text-right p-1 font-semibold">
                                <span
                                  className={
                                    item.mediaDias > 90
                                      ? "text-red-600"
                                      : item.mediaDias > 60
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                  }
                                >
                                  {item.mediaDias}
                                </span>
                              </td>
                              <td className="text-right p-1">{item.totalSolicitacoes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Auto-Insights */}
            {dashboardData.autoInsights && dashboardData.autoInsights.length > 0 && (
              <Card className="mb-4 border-blue-500/30 bg-blue-500/5">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Insights Automáticos</p>
                      <div className="grid gap-1">
                        {dashboardData.autoInsights.map((insight, i) => (
                          <div key={i} className="text-xs text-muted-foreground">
                            <Streamdown>{insight}</Streamdown>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px]"
                          onClick={handleGenerateLlmInsights}
                          disabled={insightsMutation.isPending}
                        >
                          {insightsMutation.isPending ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Lightbulb className="mr-1 h-3 w-3" />
                          )}
                          Gerar análise detalhada com IA
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* LLM Insights */}
            {showLlmInsights && insightsMutation.data?.ok && (
              <Card className="mb-4 border-purple-500/30 bg-purple-500/5">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">Análise Detalhada (IA)</p>
                      <div className="text-xs prose prose-sm max-w-none dark:prose-invert">
                        <Streamdown>{insightsMutation.data.insights}</Streamdown>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts Row 1 - Compact */}
            <div className="grid gap-4 lg:grid-cols-2 mb-4">
              {/* By Unidade */}
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Distribuição por Unidade
                  </CardTitle>
                  <CardDescription className="text-[10px]">Top 15 unidades</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData.byUnidade}
                        layout="vertical"
                        margin={{ top: 2, right: 20, left: 10, bottom: 2 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 9 }}
                          tickFormatter={(value) => value.length > 22 ? value.substring(0, 22) + "…" : value}
                        />
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString("pt-BR"), "Qtd"]}
                          labelFormatter={(label) => label}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Bar dataKey="value" fill="#0088FE" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* By Procedimento */}
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Distribuição por Procedimento
                  </CardTitle>
                  <CardDescription className="text-[10px]">Top 15 procedimentos</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData.byProcedimento}
                        layout="vertical"
                        margin={{ top: 2, right: 20, left: 10, bottom: 2 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 9 }}
                          tickFormatter={(value) => value.length > 22 ? value.substring(0, 22) + "…" : value}
                        />
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString("pt-BR"), "Qtd"]}
                          labelFormatter={(label) => label}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <Bar dataKey="value" fill="#00C49F" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 - Compact */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* By Risco */}
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <PieChart className="h-3 w-3" />
                    Classificação de Risco
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dashboardData.byRisco}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${formatRiskLabel(name)} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dashboardData.byRisco.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={RISK_COLORS[entry.name] || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [value.toLocaleString("pt-BR"), formatRiskLabel(name)]}
                          contentStyle={{ fontSize: 11 }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* By Status */}
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs flex items-center gap-1">
                    <PieChart className="h-3 w-3" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dashboardData.byStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dashboardData.byStatus.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString("pt-BR"), "Qtd"]}
                          contentStyle={{ fontSize: 11 }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          /* Empty State */
          <Card>
            <CardContent className="py-10 text-center">
              <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Dashboard Vazio</p>
              <p className="text-xs text-muted-foreground mb-3">
                Configure os filtros e clique em "Carregar" para visualizar os gráficos
              </p>
              <Button onClick={handleLoadDashboard} disabled={!configQuery.data} size="sm">
                <RefreshCw className="mr-1 h-3 w-3" />
                Carregar Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
