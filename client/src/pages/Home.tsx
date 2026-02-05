import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { 
  Activity, 
  BarChart3,
  Calendar, 
  CheckCircle2, 
  Clock, 
  Database, 
  FileSpreadsheet, 
  FileText,
  LogIn, 
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Building2,
  Phone,
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">SISREG Consulta</h1>
              <p className="text-xs text-muted-foreground">Macaé - RJ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  Olá, {user?.name || "Usuário"}
                </span>
                <Link href="/configuracao">
                  <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Button>
                </Link>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button>
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              Sistema de Consulta SISREG
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Consulte dados do{" "}
              <span className="gradient-text">SISREG</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Acesse, analise e exporte dados de marcações e solicitações ambulatoriais de forma simples e segura.
            </p>
          </div>

            {/* Main Selection Cards */}
          {isAuthenticated ? (
            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {/* Marcações Card */}
              <Card className="card-hover cursor-pointer group relative overflow-hidden" onClick={() => setLocation("/consulta?tipo=marcacao")}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <CardHeader className="relative">
                  <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Marcações Ambulatoriais
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                  <CardDescription className="text-base">
                    Consulte procedimentos ambulatoriais já agendados
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <Building2 className="h-3 w-3" />
                      Estabelecimento executante
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <Phone className="h-3 w-3" />
                      Telefone do paciente
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <Calendar className="h-3 w-3" />
                      Data de marcação
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Solicitações Card */}
              <Card className="card-hover cursor-pointer group relative overflow-hidden" onClick={() => setLocation("/consulta?tipo=solicitacao")}>
                <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent" />
                <CardHeader className="relative">
                  <div className="h-16 w-16 rounded-xl bg-chart-2/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="h-8 w-8 text-chart-2" />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Solicitações Ambulatoriais
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                  <CardDescription className="text-base">
                    Consulte solicitações em fila de espera
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <Building2 className="h-3 w-3" />
                      Unidade solicitante
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <Phone className="h-3 w-3" />
                      Telefone do paciente
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3" />
                      Data de solicitação
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Dashboard Card */}
              <Card className="card-hover cursor-pointer group relative overflow-hidden" onClick={() => setLocation("/dashboard")}>
                <div className="absolute inset-0 bg-gradient-to-br from-chart-3/5 to-transparent" />
                <CardHeader className="relative">
                  <div className="h-16 w-16 rounded-xl bg-chart-3/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-8 w-8 text-chart-3" />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Dashboard
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                  <CardDescription className="text-base">
                    Visualize gráficos e estatísticas
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <BarChart3 className="h-3 w-3" />
                      Gráficos interativos
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <FileSpreadsheet className="h-3 w-3" />
                      Exportar Excel
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                      <TrendingUp className="h-3 w-3" />
                      Análise de dados
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center">
              <a href={getLoginUrl()}>
                <Button size="lg">
                  <LogIn className="mr-2 h-5 w-5" />
                  Fazer Login para Começar
                </Button>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-3">Funcionalidades</h3>
            <p className="text-muted-foreground">
              Tudo que você precisa para consultar dados do SISREG
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Novas Solicitações</CardTitle>
                <CardDescription>
                  Consulte solicitações recentes por período de data de solicitação
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-chart-2" />
                </div>
                <CardTitle className="text-lg">Agendadas</CardTitle>
                <CardDescription>
                  Visualize solicitações agendadas por data de aprovação
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-chart-3" />
                </div>
                <CardTitle className="text-lg">Atendidas</CardTitle>
                <CardDescription>
                  Acompanhe solicitações confirmadas por data de confirmação
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="h-6 w-6 text-chart-4" />
                </div>
                <CardTitle className="text-lg">Exportação CSV</CardTitle>
                <CardDescription>
                  Exporte os resultados para análise em planilhas Excel
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-chart-5/10 flex items-center justify-center mb-4">
                  <Activity className="h-6 w-6 text-chart-5" />
                </div>
                <CardTitle className="text-lg">Campos Personalizados</CardTitle>
                <CardDescription>
                  Selecione quais campos deseja visualizar e exportar
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Insights com IA</CardTitle>
                <CardDescription>
                  Análises automáticas e sugestões de otimização via LLM
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>SISREG Consulta - Macaé/RJ</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Dados somente leitura via API Elasticsearch
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
