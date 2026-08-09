import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck, Users } from "lucide-react";
import { Link } from "wouter";

export default function SolicitarAcesso() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [enviado, setEnviado] = useState(false);

  const solicitarMutation = trpc.access.solicitar.useMutation({
    onSuccess: (data) => {
      if (data.ok) {
        setEnviado(true);
      } else {
        toast.error(data.error || "Erro ao enviar solicitação");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !cargo.trim() || !justificativa.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    solicitarMutation.mutate({ nome, email, cargo, justificativa });
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Solicitacao enviada!</h2>
            <p className="text-muted-foreground mb-6">
              Sua solicitacao foi registrada. O administrador ira analisar e voce recebera uma resposta em breve.
            </p>
            <Link href="/">
              <Button variant="outline">Voltar ao inicio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SISREG Consulta</span>
          </div>
          <p className="text-muted-foreground text-sm">Macae — RJ</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Solicitar Acesso
            </CardTitle>
            <CardDescription>
              Preencha o formulario abaixo. O coordenador ira analisar sua solicitacao e liberar o acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome completo *</Label>
                <Input
                  id="nome"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={solicitarMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail institucional *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@saude.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={solicitarMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cargo">Cargo / Funcao *</Label>
                <Input
                  id="cargo"
                  placeholder="Ex: Tecnico de Regulacao, Enfermeiro Regulador..."
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  disabled={solicitarMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="justificativa">Justificativa *</Label>
                <Textarea
                  id="justificativa"
                  placeholder="Descreva brevemente por que precisa de acesso ao sistema..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  disabled={solicitarMutation.isPending}
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={solicitarMutation.isPending}
              >
                {solicitarMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Solicitacao"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ja tem acesso?{" "}
          <Link href="/" className="text-primary hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
