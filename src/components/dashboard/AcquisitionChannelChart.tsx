import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Megaphone } from "lucide-react";

const CHANNEL_CONFIG: Record<string, { color: string; label: string }> = {
  tiktok: { color: "hsl(340, 82%, 52%)", label: "TikTok" },
  facebook: { color: "hsl(220, 46%, 48%)", label: "Facebook" },
  instagram: { color: "hsl(330, 70%, 50%)", label: "Instagram" },
  whatsapp: { color: "hsl(142, 70%, 45%)", label: "WhatsApp" },
  google: { color: "hsl(217, 91%, 60%)", label: "Google" },
  ads: { color: "hsl(36, 100%, 50%)", label: "ADS" },
};

export function AcquisitionChannelChart() {
  const { data: channelData } = useQuery({
    queryKey: ["acquisition-channels-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("acquisition_channel")
        .eq("is_archived", false)
        .not("acquisition_channel", "is", null);
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((c) => {
        const ch = c.acquisition_channel?.toLowerCase() ?? "autre";
        counts[ch] = (counts[ch] ?? 0) + 1;
      });

      return Object.entries(counts)
        .map(([key, value]) => ({
          name: CHANNEL_CONFIG[key]?.label ?? key,
          value,
          color: CHANNEL_CONFIG[key]?.color ?? "hsl(var(--muted-foreground))",
        }))
        .sort((a, b) => b.value - a.value);
    },
  });

  const total = channelData?.reduce((s, d) => s + d.value, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> Canaux d'acquisition
        </CardTitle>
      </CardHeader>
      <CardContent>
        {channelData && channelData.length > 0 ? (
          <div className="flex items-center gap-6">
            <div className="w-[140px] h-[140px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {channelData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} clients`, ""]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {channelData.map((ch) => (
                <div key={ch.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ch.color }} />
                    <span className="text-foreground font-medium">{ch.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{ch.value}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {total > 0 ? Math.round((ch.value / total) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Aucune donnée de canal d'acquisition
          </p>
        )}
      </CardContent>
    </Card>
  );
}
