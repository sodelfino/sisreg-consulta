/**
 * Página de Exploração do Índice Elasticsearch
 * Ferramenta para descobrir campos, valores e estrutura dos dados
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Database, List, FileJson } from "lucide-react";

export default function Explore() {
  const [indexType, setIndexType] = useState<"marcacao" | "solicitacao">("solicitacao");
  const [fieldName, setFieldName] = useState("");
  
  const exploreIndexMutation = trpc.explore.index.useMutation();
  const exploreFieldMutation = trpc.explore.fieldValues.useMutation();
  const exploreMappingMutation = trpc.explore.mapping.useMutation();
  const sampleDocMutation = trpc.explore.sampleDoc.useMutation();

  const handleExploreIndex = async () => {
    await exploreIndexMutation.mutateAsync({ indexType, size: 10 });
  };

  const handleExploreField = async () => {
    if (!fieldName.trim()) return;
    await exploreFieldMutation.mutateAsync({ indexType, fieldName: fieldName.trim(), size: 100 });
  };

  const handleExploreMapping = async () => {
    await exploreMappingMutation.mutateAsync({ indexType });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Exploração do Índice Elasticsearch</h1>
        <p className="text-muted-foreground mt-2">
          Ferramenta para descobrir campos, valores e estrutura dos dados do SISREG
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Índice</CardTitle>
          <CardDescription>Escolha qual índice deseja explorar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Índice</Label>
              <Select value={indexType} onValueChange={(v) => setIndexType(v as "marcacao" | "solicitacao")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marcacao">Marcações Ambulatoriais</SelectItem>
                  <SelectItem value="solicitacao">Solicitações Ambulatoriais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="samples">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="samples">
            <Database className="w-4 h-4 mr-2" />
            Amostras
          </TabsTrigger>
          <TabsTrigger value="field">
            <List className="w-4 h-4 mr-2" />
            Valores de Campo
          </TabsTrigger>
          <TabsTrigger value="mapping">
            <FileJson className="w-4 h-4 mr-2" />
            Mapping (Schema)
          </TabsTrigger>
          <TabsTrigger value="debug">
            <Database className="w-4 h-4 mr-2" />
            Debug (1 Doc)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="samples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos de Amostra</CardTitle>
              <CardDescription>
                Busca os primeiros 10 documentos do índice sem filtros para descobrir campos disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleExploreIndex} disabled={exploreIndexMutation.isPending}>
                {exploreIndexMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Explorar Índice
              </Button>

              {exploreIndexMutation.data && (
                <div className="space-y-4">
                  {exploreIndexMutation.data.ok ? (
                    <>
                      <Alert>
                        <AlertDescription>
                          <strong>Total de documentos:</strong> {exploreIndexMutation.data.total.toLocaleString("pt-BR")}
                          <br />
                          <strong>Amostras retornadas:</strong> {exploreIndexMutation.data.samples.length}
                          <br />
                          <strong>Campos encontrados:</strong> {exploreIndexMutation.data.fields.length}
                        </AlertDescription>
                      </Alert>

                      <div>
                        <h3 className="font-semibold mb-2">Campos Disponíveis ({exploreIndexMutation.data.fields.length})</h3>
                        <div className="bg-muted p-4 rounded-md max-h-96 overflow-auto">
                          <pre className="text-sm">{exploreIndexMutation.data.fields.join("\n")}</pre>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Documento de Exemplo (JSON)</h3>
                        <div className="bg-muted p-4 rounded-md max-h-96 overflow-auto">
                          <pre className="text-xs">{JSON.stringify(exploreIndexMutation.data.samples[0], null, 2)}</pre>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>{exploreIndexMutation.data.errorMessage}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="field" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Valores Únicos de um Campo</CardTitle>
              <CardDescription>
                Busca os valores únicos e suas contagens para um campo específico (use .keyword para campos text)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do Campo</Label>
                <Input
                  placeholder="Ex: status_solicitacao.keyword"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                />
              </div>

              <Button onClick={handleExploreField} disabled={exploreFieldMutation.isPending || !fieldName.trim()}>
                {exploreFieldMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Buscar Valores
              </Button>

              {exploreFieldMutation.data && (
                <div className="space-y-4">
                  {exploreFieldMutation.data.ok ? (
                    <>
                      <Alert>
                        <AlertDescription>
                          <strong>Valores únicos encontrados:</strong> {exploreFieldMutation.data.values.length}
                        </AlertDescription>
                      </Alert>

                      <div>
                        <h3 className="font-semibold mb-2">Valores e Contagens</h3>
                        <div className="bg-muted p-4 rounded-md max-h-96 overflow-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2">Valor</th>
                                <th className="text-right py-2">Contagem</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exploreFieldMutation.data.values.map((item, idx) => (
                                <tr key={idx} className="border-b">
                                  <td className="py-2">{String(item.value)}</td>
                                  <td className="text-right py-2">{item.count.toLocaleString("pt-BR")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>{exploreFieldMutation.data.errorMessage}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapping do Índice</CardTitle>
              <CardDescription>
                Mostra o schema completo do índice com tipos de dados de cada campo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleExploreMapping} disabled={exploreMappingMutation.isPending}>
                {exploreMappingMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Buscar Mapping
              </Button>

              {exploreMappingMutation.data && (
                <div className="space-y-4">
                  {exploreMappingMutation.data.ok ? (
                    <div>
                      <h3 className="font-semibold mb-2">Mapping (JSON)</h3>
                      <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-auto">
                        <pre className="text-xs">{JSON.stringify(exploreMappingMutation.data.mapping, null, 2)}</pre>
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>{exploreMappingMutation.data.errorMessage}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documento de Amostra (Debug)</CardTitle>
              <CardDescription>
                Busca 1 documento completo do índice para ver TODOS os campos e valores reais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={async () => await sampleDocMutation.mutateAsync({ indexType })} disabled={sampleDocMutation.isPending}>
                {sampleDocMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Buscar 1 Documento
              </Button>

              {sampleDocMutation.data && (
                <div className="space-y-4">
                  {sampleDocMutation.data.ok ? (
                    <div>
                      <h3 className="font-semibold mb-2">Documento Completo (JSON)</h3>
                      <div className="bg-muted p-4 rounded-md max-h-[600px] overflow-auto">
                        <pre className="text-xs">{JSON.stringify(sampleDocMutation.data.doc, null, 2)}</pre>
                      </div>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertDescription>{sampleDocMutation.data.errorMessage}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
