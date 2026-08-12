import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, UserCheck, Users } from "lucide-react";

export default function AdminAcessos() {
  const [filtroStatus, setFiltroStatus] = useState<"pendente" | "aprovado" | "rejeitado" | "todos">("pendente");
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [acaoAtual, setAcaoAtual] = useState<"aprovado" | "rejeitado">("aprovado");

  const utils = trpc.useUtils();
  const { data: requests = [], isLoading } = trpc.access.listar.useQuery({ status: filtroStatus });

  const revisarMutation = trpc.access.revisar.useMutation({
    onSuccess: () => {
      toast.success(acaoAtual === "aprovado" ? "Acesso aprovado com sucesso!" : "Solicitação rejeitada.");
      setModalOpen(false);
      setSelectedReq(null);
      setMotivoRejeicao("");
      utils.access.listar.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao processar revisão");
    },
  });

  const handleOpenModal = (req: any, acao: "aprovado" | "rejeitado") => {
    setSelectedReq(req);
    setAcaoAtual(acao);
    setMotivoRejeicao("");
    setModalOpen(true);
  };

  const handleConfirmarRevisao = () => {
    if (!selectedReq) return;
    if (acaoAtual === "rejeitado" && !motivoRejeicao.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    revisarMutation.mutate({
      id: selectedReq.id,
      acao: acaoAtual,
      motivoRejeicao: acaoAtual === "rejeitado" ? motivoRejeicao : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Painel de Administração de Acessos
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie as solicitações de acesso da equipe técnica ao SISREG Consulta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["pendente", "aprovado", "rejeitado", "todos"] as const).map((s) => (
              <Button
                key={s}
                variant={filtroStatus === s ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroStatus(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Acesso ({requests.length})</CardTitle>
            <CardDescription>
              Visualize dados institucionais, cargos e justificativas informados pelos solicitantes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Carregando solicitações...</div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">Nenhuma solicitação encontrada com este filtro.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.createdAt).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{r.email}</TableCell>
                        <TableCell>{r.cargo}</TableCell>
                        <TableCell className="max-w-xs truncate" title={r.justificativa}>
                          {r.justificativa}
                        </TableCell>
                        <TableCell>
                          {r.status === "pendente" && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <Clock className="w-3 h-3 mr-1" /> Pendente
                            </Badge>
                          )}
                          {r.status === "aprovado" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado
                            </Badge>
                          )}
                          {r.status === "rejeitado" && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <XCircle className="w-3 h-3 mr-1" /> Rejeitado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          {r.status === "pendente" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleOpenModal(r, "aprovado")}
                              >
                                <UserCheck className="w-4 h-4 mr-1" /> Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleOpenModal(r, "rejeitado")}
                              >
                                Rejeitar
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {acaoAtual === "aprovado" ? "Aprovar Acesso" : "Rejeitar Acesso"}
            </DialogTitle>
            <DialogDescription>
              {selectedReq && (
                <>
                  Usuário: <b>{selectedReq.nome}</b> ({selectedReq.email})<br />
                  Cargo: {selectedReq.cargo}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {acaoAtual === "rejeitado" && (
            <div className="space-y-2 py-2">
              <label className="text-sm font-medium">Motivo da Rejeição *</label>
              <Textarea
                placeholder="Explique o motivo da rejeição..."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={acaoAtual === "aprovado" ? "default" : "destructive"}
              className={acaoAtual === "aprovado" ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={handleConfirmarRevisao}
              disabled={revisarMutation.isPending}
            >
              Confirmar {acaoAtual === "aprovado" ? "Aprovação" : "Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
