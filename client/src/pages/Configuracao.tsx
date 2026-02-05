import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Save,
  Settings,
  Shield,
  TestTube,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function Configuracao() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Form state
  const [baseUrl, setBaseUrl] = useState("https://sisreg-es.saude.gov.br");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Test result state
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Load existing config
  const configQuery = trpc.config.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Update form when config loads
  useEffect(() => {
    if (configQuery.data) {
      setBaseUrl(configQuery.data.baseUrl);
      setUsername(configQuery.data.username);
    }
  }, [configQuery.data]);

  // Save mutation
  const saveMutation = trpc.config.save.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      setPassword(""); // Clear password after save
      configQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Test mutation
  const testMutation = trpc.config.test.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.config.delete.useMutation({
    onSuccess: () => {
      toast.success("Configuração removida");
      setUsername("");
      setPassword("");
      setTestResult(null);
      configQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handle save
  const handleSave = () => {
    if (!username.trim()) {
      toast.error("Informe o usuário");
      return;
    }
    if (!password.trim() && !configQuery.data?.hasPassword) {
      toast.error("Informe a senha");
      return;
    }

    if (!password.trim() && configQuery.data?.hasPassword) {
      toast.error("Para atualizar, informe a senha novamente");
      return;
    }

    saveMutation.mutate({
      baseUrl: baseUrl.trim(),
      username: username.trim(),
      password: password.trim(),
    });
  };

  // Handle test
  const handleTest = () => {
    if (!configQuery.data) {
      toast.error("Salve a configuração primeiro para testar");
      return;
    }
    setTestResult(null);
    testMutation.mutate();
  };

  // Handle delete
  const handleDelete = () => {
    if (confirm("Tem certeza que deseja remover a configuração?")) {
      deleteMutation.mutate();
    }
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
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Faça login para acessar as configurações
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
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        {/* Back link */}
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <div className="space-y-6">
          {/* Main Config Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Credenciais SISREG</CardTitle>
                  <CardDescription>
                    Configure suas credenciais de acesso à API do SISREG
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Badge */}
              {configQuery.data && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Configurado
                  </Badge>
                  {testResult && (
                    <Badge variant={testResult.ok ? "default" : "destructive"}>
                      {testResult.ok ? "Conexão OK" : "Falha na conexão"}
                    </Badge>
                  )}
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">URL Base da API</Label>
                  <Input
                    id="baseUrl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://sisreg-es.saude.gov.br"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL base do servidor Elasticsearch do SISREG
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu usuário do SISREG"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={configQuery.data?.hasPassword ? "••••••••" : "Sua senha do SISREG"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {configQuery.data?.hasPassword && (
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco para manter a senha atual, ou digite uma nova senha
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testMutation.isPending || !configQuery.data}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  Testar Conexão
                </Button>

                {configQuery.data && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Remover
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Segurança</CardTitle>
                  <CardDescription>
                    Suas credenciais são protegidas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Senhas são criptografadas com AES-256 antes do armazenamento</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Credenciais nunca são expostas no frontend ou logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Comunicação via HTTPS com a API do SISREG</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Cada usuário tem suas próprias credenciais isoladas</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Ajuda</CardTitle>
                  <CardDescription>
                    Informações sobre a configuração
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">URL Base:</strong> Normalmente é{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">
                    https://sisreg-es.saude.gov.br
                  </code>
                </p>
                <p>
                  <strong className="text-foreground">Usuário e Senha:</strong> São as mesmas
                  credenciais que você usa para acessar o SISREG. Consulte a equipe de TI
                  do seu município se não tiver acesso.
                </p>
                <p>
                  <strong className="text-foreground">Índices disponíveis:</strong> O sistema
                  permite consultar marcações e solicitações ambulatoriais de Macaé/RJ.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
