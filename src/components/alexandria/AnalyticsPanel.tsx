import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Zap, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TYPE_LABELS: Record<string, string> = {
  design_system: "🎨 Design System",
  pops: "📋 POPs",
  slas: "⏱️ SLAs",
  client_info: "🏢 Cliente",
  execution_history: "📊 Histórico",
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(340, 65%, 55%)",
];

interface AnalyticsData {
  totalDocuments: number;
  totalExecutions: number;
  avgSimilarity: number;
  documentUsage: Array<{ type: string; label: string; count: number }>;
}

export function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const [docsRes, ctxRes, ctxAvgRes] = await Promise.all([
          supabase.from("rag_documents").select("id, type"),
          supabase.from("rag_context").select("id"),
          supabase.from("rag_context").select("similarity_score"),
        ]);

        if (docsRes.error) throw docsRes.error;
        if (ctxRes.error) throw ctxRes.error;

        const docs = docsRes.data || [];
        const ctxCount = ctxRes.data?.length || 0;
        const scores = (ctxAvgRes.data || []).map((r) => r.similarity_score);
        const avgSim = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        const typeMap: Record<string, number> = {};
        docs.forEach((d) => {
          typeMap[d.type] = (typeMap[d.type] || 0) + 1;
        });

        const documentUsage = Object.entries(typeMap).map(([type, count]) => ({
          type,
          label: TYPE_LABELS[type] || type,
          count,
        }));

        setData({
          totalDocuments: docs.length,
          totalExecutions: ctxCount,
          avgSimilarity: avgSim,
          documentUsage,
        });
      } catch (err: any) {
        setError(err.message || "Erro ao carregar analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-4">{error}</div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: "Total de Documentos", value: data.totalDocuments, icon: FileText },
    { label: "Total de Execuções", value: data.totalExecutions, icon: Zap },
    { label: "Similaridade Média", value: `${(data.avgSimilarity * 100).toFixed(1)}%`, icon: Target },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.documentUsage.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.documentUsage} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.documentUsage.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
