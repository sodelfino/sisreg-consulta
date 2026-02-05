import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Loader2,
  PieChart,
  RefreshCw,
  Settings,
  TrendingUp,
  X,
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
import * as XLSX from "xlsx";
import { RISK_LABELS, INDEX_LABELS, type QueryMode, type IndexType } from "../../../shared/sisreg";

// Colors for charts
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#8DD1E1", "#A4DE6C", "#D0ED57",
  "#FA8072", "#DDA0DD", "#87CEEB", "#F0E68C", "#E6E6FA",
];

const RISK_COLORS: Record<string, string> = {
  "0": "#6B7280", // Cinza - Não classificado
  "1": "#EF4444", // Vermelho - Emergência
  "2": "#F97316", // Laranja - Muito urgente
  "3": "#EAB308", // Amarelo - Urgente
  "4": "#22C55E", // Verde - Pouco urgente
  "5": "#3B82F6", // Azul - Não urgente
};

export default function Dashboard() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Filter state
  const [indexType, setIndexType] = useState<IndexType>("marcacao");
  const [mode, setMode] = useState<QueryMode>("quick");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedProcedimentos, setSelectedProcedimentos] = useState<string[]>([]);
  const [showProcedimentoFilter, setShowProcedimentoFilter] = useState(false);
  const [procedimentoSearch, setProcedimentoSearch] = useState("");

  // Check config
  const configQuery = trpc.config.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Dashboard aggregation mutation
  const aggregateMutation = trpc.dashboard.aggregate.useMutation({
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Dashboard atualizado com ${data.data?.total} registros`);
      } else {
        toast.error(data.error || "Erro ao carregar dados");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Load dashboard data
  const handleLoadDashboard = () => {
    if (!configQuery.data) {
      toast.error("Configure suas credenciais primeiro");
      setLocation("/configuracao");
      return;
    }

    if (mode !== "quick" && (!dateStart || !dateEnd)) {
      toast.error("Selecione o período de datas");
      return;
    }

    aggregateMutation.mutate({
      indexType,
      mode,
      dateStart: dateStart || undefined,
      dateEnd: dateEnd || undefined,
      procedimentoFilter: selectedProcedimentos.length > 0 ? selectedProcedimentos : undefined,
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

  // Export to Excel
  const handleExportExcel = () => {
    const data = aggregateMutation.data?.data;
    if (!data?.rawData || data.rawData.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Raw data
    const rawDataSheet = XLSX.utils.json_to_sheet(data.rawData);
    XLSX.utils.book_append_sheet(wb, rawDataSheet, "Dados");

    // Sheet 2: By Unidade
    const unidadeSheet = XLSX.utils.json_to_sheet(data.byUnidade.map(u => ({
      Unidade: u.name,
      Quantidade: u.value,
      Percentual: ((u.value / data.total) * 100).toFixed(1) + "%",
    })));
    XLSX.utils.book_append_sheet(wb, unidadeSheet, "Por Unidade");

    // Sheet 3: By Procedimento
    const procSheet = XLSX.utils.json_to_sheet(data.byProcedimento.map(p => ({
      Procedimento: p.name,
      Quantidade: p.value,
      Percentual: ((p.value / data.total) * 100).toFixed(1) + "%",
    })));
    XLSX.utils.book_append_sheet(wb, procSheet, "Por Procedimento");

    // Sheet 4: By Risco
    const riscoSheet = XLSX.utils.json_to_sheet(data.byRisco.map(r => ({
      Classificação: RISK_LABELS[Number(r.name)] || r.name,
      Quantidade: r.value,
      Percentual: ((r.value / data.total) * 100).toFixed(1) + "%",
    })));
    XLSX.utils.book_append_sheet(wb, riscoSheet, "Por Risco");

    // Sheet 5: By Status
    const statusSheet = XLSX.utils.json_to_sheet(data.byStatus.map(s => ({
      Status: s.name,
      Quantidade: s.value,
      Percentual: ((s.value / data.total) * 100).toFixed(1) + "%",
    })));
    XLSX.utils.book_append_sheet(wb, statusSheet, "Por Status");

    // Generate filename
    const filename = `sisreg_dashboard_${indexType}_${mode}_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
    toast.success("Excel exportado com sucesso!");
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
            <CardDescription>
              Faça login para acessar o dashboard
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

  const dashboardData = aggregateMutation.data?.data;

  // Effect to reload dashboard when procedimento filter changes
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
                  <h1 className="text-lg font-semibold">SISREG Dashboard</h1>
                  <p className="text-xs text-muted-foreground">Macaé - RJ</p>
                </div>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/consulta">
              <Button variant="outline" size="sm">
                <Database className="mr-2 h-4 w-4" />
                Consulta
              </Button>
            </Link>
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
                  Configure suas credenciais do SISREG para visualizar o dashboard
                </p>
              </div>
              <Link href="/configuracao">
                <Button size="sm">Configurar</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filtros do Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Index Type */}
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Consulta</Label>
                <Select value={indexType} onValueChange={(v) => setIndexType(v as IndexType)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="marcacao">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Marcações
                      </span>
                    </SelectItem>
                    <SelectItem value="solicitacao">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Solicitações
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mode */}
              <div className="space-y-1">
                <Label className="text-xs">Modo</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as QueryMode)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Rápida
                      </span>
                    </SelectItem>
                    <SelectItem value="novas">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Novas
                      </span>
                    </SelectItem>
                    <SelectItem value="agendadas">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Agendadas
                      </span>
                    </SelectItem>
                    <SelectItem value="atendidas">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Atendidas
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              {mode !== "quick" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Data Inicial</Label>
                    <Input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data Final</Label>
                    <Input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleLoadDashboard}
                  disabled={aggregateMutation.isPending || !configQuery.data}
                  className="flex-1"
                >
                  {aggregateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Carregar
                </Button>
              </div>
            </div>

            {/* Procedimento Filter */}
            {dashboardData && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Filtrar por Procedimentos</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProcedimentoFilter(!showProcedimentoFilter)}
                  >
                    {showProcedimentoFilter ? "Ocultar" : "Mostrar"} ({selectedProcedimentos.length} selecionados)
                  </Button>
                </div>
                
                {showProcedimentoFilter && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Buscar procedimento..."
                      value={procedimentoSearch}
                      onChange={(e) => setProcedimentoSearch(e.target.value)}
                      className="h-9"
                    />
                    <ScrollArea className="h-[200px] border rounded-md p-2">
                      {filteredProcedimentos.map((proc) => (
                        <div
                          key={proc}
                          className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 px-2 rounded"
                          onClick={() => toggleProcedimento(proc)}
                        >
                          <Checkbox
                            checked={selectedProcedimentos.includes(proc)}
                            className="pointer-events-none"
                          />
                          <span className="text-sm truncate">{proc}</span>
                        </div>
                      ))}
                    </ScrollArea>
                    {selectedProcedimentos.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProcedimentos([])}
                        >
                          Limpar seleção
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleApplyProcedimentoFilter}
                        >
                          Aplicar filtro
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Content */}
        {dashboardData ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Database className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboardData.total.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total de Registros</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboardData.byUnidade.length}</p>
                      <p className="text-sm text-muted-foreground">Unidades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboardData.byProcedimento.length}</p>
                      <p className="text-sm text-muted-foreground">Procedimentos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-6 w-6 text-chart-4" />
                    </div>
                    <div>
                      <Button onClick={handleExportExcel} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Excel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 lg:grid-cols-2 mb-6">
              {/* By Unidade */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Distribuição por Unidade
                  </CardTitle>
                  <CardDescription>Top 15 unidades com mais registros</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData.byUnidade}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={150}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + "..." : value}
                        />
                        <Tooltip
                          formatter={(value: number) => [value, "Quantidade"]}
                          labelFormatter={(label) => label}
                        />
                        <Bar dataKey="value" fill="#0088FE" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* By Procedimento */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Distribuição por Procedimento
                  </CardTitle>
                  <CardDescription>Top 15 procedimentos mais solicitados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dashboardData.byProcedimento}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={150}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + "..." : value}
                        />
                        <Tooltip
                          formatter={(value: number) => [value, "Quantidade"]}
                          labelFormatter={(label) => label}
                        />
                        <Bar dataKey="value" fill="#00C49F" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* By Risco */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Classificação de Risco
                  </CardTitle>
                  <CardDescription>Distribuição por classificação de risco</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dashboardData.byRisco}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${formatRiskLabel(name)} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
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
                          formatter={(value: number, name: string) => [value, formatRiskLabel(name)]}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* By Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Status das Solicitações
                  </CardTitle>
                  <CardDescription>Distribuição por status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={dashboardData.byStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dashboardData.byStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [value, "Quantidade"]} />
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
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Dashboard Vazio</p>
              <p className="text-sm text-muted-foreground mb-4">
                Configure os filtros e clique em "Carregar" para visualizar os gráficos
              </p>
              <Button onClick={handleLoadDashboard} disabled={!configQuery.data}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Carregar Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
