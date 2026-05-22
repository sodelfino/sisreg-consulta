import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Filter,
  TrendingUp,
  Activity,
  Settings,
} from "lucide-react";
import { Link } from "wouter";
import { SITUACOES_SOLICITACAO, RISK_LABELS } from "../../../shared/sisreg";

// Presets de período
const PERIOD_PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "3 meses", days: 90 },
  { label: "6 meses", days: 180 },
  { label: "1 ano", days: 365 },
  { label: "3 anos", days: 1095 },
];

// Situações padrão ativas (pendentes e devolvidas)
const DEFAULT_SITUACOES = [
  "SOLICITAÇÃO / PENDENTE / FILA DE ESPERA",
  "SOLICITAÇÃO / PENDENTE / REGULADOR",
  "SOLICITAÇÃO / DEVOLVIDA / SOLICITANTE",
];

// Cores para gráficos de risco
const RISCO_COLORS: Record<string, string> = {
  "0": "#ef4444",
  "1": "#f97316",
  "2": "#eab308",
  "3": "#6b7280",
  "4": "#6b7280",
};

const RISCO_LABELS_DISPLAY: Record<string, string> = {
  "0": "Emergência",
  "1": "Urgência",
  "2": "Prioritário",
  "3": "Eletivo",
  "4": "Eletivo",
};

const BAR_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
];

function getDateFromDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function simplifyEspecialidade(name: string): string {
  return name
    .replace(/^CONSULTA EM /i, "")
    .replace(/^CONSULTA DE /i, "")
    .replace(/^CONSULTA COM /i, "")
    .replace(/^CONSULTA MÉDICA /i, "")
    .replace(/^CONSULTA MEDICA /i, "")
    .trim();
}

type DashData = {
  totalFila: number;
  totalPendentes: number;
  totalDevolvidas: number;
  totalAgendadas: number;
  totalUnfiltered: number;
  bySituacao: { name: string; value: number }[];
  byRisco: { name: string; value: number }[];
  top10Especialidades: { name: string; value: number }[];
  maisAntigas: { descricao: string; dataSolicitacao: string; risco: string; unidade: string; diasEspera: number }[];
  dateStart?: string;
  dateEnd?: string;
};

export default function Dashboard() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Filtros
  const [selectedPreset, setSelectedPreset] = useState(2); // 3 meses padrão
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [situacaoFilter, setSituacaoFilter] = useState<string[]>(DEFAULT_SITUACOES);
  const [riscoFilter, setRiscoFilter] = useState<string[]>([]);

  // Dados
  const [dashData, setDashData] = useState<DashData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const consultasFilaMutation = trpc.dashboard.consultasFila.useMutation();

  const getDateRange = useCallback(() => {
    if (isCustomPeriod && customDateStart && customDateEnd) {
      return { dateStart: customDateStart, dateEnd: customDateEnd };
    }
    const days = PERIOD_PRESETS[selectedPreset]?.days ?? 90;
    return { dateStart: getDateFromDaysAgo(days), dateEnd: getTodayStr() };
  }, [isCustomPeriod, customDateStart, customDateEnd, selectedPreset]);

  const handleLoadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const { dateStart, dateEnd } = getDateRange();
    try {
      const result = await consultasFilaMutation.mutateAsync({
        dateStart,
        dateEnd,
        situacaoFilter: situacaoFilter.length > 0 ? situacaoFilter : undefined,
        riscoFilter: riscoFilter.length > 0 ? riscoFilter : undefined,
      });
      if (result.ok && result.data) {
        setDashData(result.data as DashData);
        setHasLoaded(true);
      } else {
        setErrorMsg(result.error || "Erro ao carregar dados.");
      }
    } catch {
      setErrorMsg("Erro ao conectar ao servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [consultasFilaMutation, getDateRange, situacaoFilter, riscoFilter]);

  const toggleSituacao = (value: string) => {
    setSituacaoFilter(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  const toggleRisco = (value: string) => {
    setRiscoFilter(prev =>
      prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value]
    );
  };

  const handleClickEspecialidade = (especialidade: string) => {
    setLocation(`/consulta?tipo=solicitacoes&procedimento=${encodeURIComponent(especialidade)}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Ir para Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-500" />
              Dashboard de Fila de Consultas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Apenas consultas com profissionais de saúde — exames e procedimentos excluídos automaticamente
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasLoaded && dashData && (
              <Badge variant="outline" className="text-xs">
                {dashData.totalUnfiltered.toLocaleString("pt-BR")} registros no período
              </Badge>
            )}
            <Link href="/configuracao">
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="h-3.5 w-3.5" />
                Config
              </Button>
            </Link>
          </div>
        </div>

        {/* Painel de Filtros */}
        <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Filter className="h-4 w-4" />
              Filtros do Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Período */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                <Calendar className="h-3 w-3 inline mr-1" />
                Período
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PERIOD_PRESETS.map((preset, idx) => (
                  <Button
                    key={idx}
                    variant={!isCustomPeriod && selectedPreset === idx ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setSelectedPreset(idx); setIsCustomPeriod(false); }}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button
                  variant={isCustomPeriod ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsCustomPeriod(true)}
                >
                  Personalizado
                </Button>
              </div>
              {isCustomPeriod && (
                <div className="flex gap-2 items-center mt-2">
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={e => setCustomDateStart(e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background"
                  />
                  <span className="text-muted-foreground text-sm">até</span>
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={e => setCustomDateEnd(e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background"
                  />
                </div>
              )}
            </div>

            {/* Situação */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Situação (múltipla seleção)
              </Label>
              <div className="flex flex-wrap gap-3">
                {SITUACOES_SOLICITACAO.map(s => (
                  <div key={s.value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`sit-${s.value}`}
                      checked={situacaoFilter.includes(s.value)}
                      onCheckedChange={() => toggleSituacao(s.value)}
                    />
                    <Label htmlFor={`sit-${s.value}`} className="text-xs cursor-pointer">
                      {s.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Risco */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Risco / Prioridade (vazio = todos)
              </Label>
              <div className="flex flex-wrap gap-3">
                {[0, 1, 2, 3].map(r => (
                  <div key={r} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`risco-${r}`}
                      checked={riscoFilter.includes(String(r))}
                      onCheckedChange={() => toggleRisco(String(r))}
                    />
                    <Label htmlFor={`risco-${r}`} className="text-xs cursor-pointer">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: RISCO_COLORS[String(r)] }}
                      />
                      {RISK_LABELS[r]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão Atualizar */}
            <div className="pt-1 flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleLoadDashboard}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Carregando..." : hasLoaded ? "Atualizar Dashboard" : "Carregar Dashboard"}
              </Button>
              {hasLoaded && dashData && (
                <span className="text-xs text-muted-foreground">
                  Período: {dashData.dateStart} a {dashData.dateEnd} •{" "}
                  <strong>{dashData.totalFila.toLocaleString("pt-BR")}</strong> consultas filtradas
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Erro */}
        {errorMsg && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-4">
              <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {errorMsg}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estado inicial */}
        {!hasLoaded && !isLoading && !errorMsg && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground text-sm">
                Configure os filtros acima e clique em{" "}
                <strong>Carregar Dashboard</strong> para visualizar os dados.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dados carregados */}
        {hasLoaded && dashData && (
          <>
            {/* Cards de Métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-blue-200 dark:border-blue-900">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total na Fila</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {dashData.totalFila.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">consultas</p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-900">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Pendentes</p>
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {dashData.totalPendentes.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">aguardando vaga</p>
                    </div>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-900">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Devolvidas</p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                        {dashData.totalDevolvidas.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">requer ação</p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 dark:border-green-900">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Agendadas</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {dashData.totalAgendadas.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">reguladas</p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos: Top 10 + Risco */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top 10 Especialidades */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Top 10 Especialidades — Maior Demanda
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Clique em uma barra para filtrar na página de Consultas</p>
                </CardHeader>
                <CardContent>
                  {dashData.top10Especialidades.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={dashData.top10Especialidades.map((e, i) => ({
                          ...e,
                          shortName: simplifyEspecialidade(e.name),
                          fill: BAR_COLORS[i % BAR_COLORS.length],
                        }))}
                        layout="vertical"
                        margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                        onClick={(data) => {
                          if (data?.activePayload?.[0]?.payload?.name) {
                            handleClickEspecialidade(data.activePayload[0].payload.name);
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="shortName"
                          width={130}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString("pt-BR"), "Solicitações"]}
                          labelFormatter={(label) => `Especialidade: ${label}`}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer">
                          {dashData.top10Especialidades.map((_, i) => (
                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Distribuição por Risco */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Distribuição por Risco
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashData.byRisco.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={dashData.byRisco.map(r => ({
                            ...r,
                            displayName: RISCO_LABELS_DISPLAY[r.name] || `Risco ${r.name}`,
                            fill: RISCO_COLORS[r.name] || "#6b7280",
                          }))}
                          dataKey="value"
                          nameKey="displayName"
                          cx="50%"
                          cy="45%"
                          outerRadius={85}
                          label={({ percent }: { percent: number }) =>
                            percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                          }
                          labelLine={false}
                        >
                          {dashData.byRisco.map((r, i) => (
                            <Cell key={i} fill={RISCO_COLORS[r.name] || "#6b7280"} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [value.toLocaleString("pt-BR"), "Solicitações"]}
                        />
                        <Legend
                          formatter={(value) => <span className="text-xs">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Distribuição por Situação */}
            {dashData.bySituacao.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    Distribuição por Situação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {dashData.bySituacao
                      .sort((a, b) => b.value - a.value)
                      .map((s, i) => {
                        const total = dashData.totalFila || 1;
                        const pct = ((s.value / total) * 100).toFixed(1);
                        return (
                          <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 min-w-[200px]">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {s.value.toLocaleString("pt-BR")} ({pct}%)
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabela: Solicitações Mais Antigas */}
            {dashData.maisAntigas.length > 0 && (
              <Card className="border-red-200 dark:border-red-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    Solicitações Pendentes Mais Antigas — Ação Urgente
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Top 10 consultas com maior tempo na fila</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 text-xs font-semibold text-muted-foreground pr-4">Procedimento</th>
                          <th className="pb-2 text-xs font-semibold text-muted-foreground pr-4">Dias na Fila</th>
                          <th className="pb-2 text-xs font-semibold text-muted-foreground pr-4">Risco</th>
                          <th className="pb-2 text-xs font-semibold text-muted-foreground">Unidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashData.maisAntigas.map((s, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 pr-4 font-medium text-xs">
                              {simplifyEspecialidade(s.descricao) || s.descricao}
                            </td>
                            <td className="py-2 pr-4">
                              <Badge
                                variant={s.diasEspera > 365 ? "destructive" : s.diasEspera > 180 ? "secondary" : "outline"}
                                className="text-xs"
                              >
                                {s.diasEspera} dias
                              </Badge>
                            </td>
                            <td className="py-2 pr-4">
                              <span
                                className="text-xs font-medium"
                                style={{ color: RISCO_COLORS[s.risco] || "#6b7280" }}
                              >
                                {RISCO_LABELS_DISPLAY[s.risco] || `Risco ${s.risco}`}
                              </span>
                            </td>
                            <td className="py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                              {s.unidade || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
