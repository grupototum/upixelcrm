export type Campaign = {
  id: string;
  name: string;
  platform: "Meta Ads" | "Google Ads";
  status: "active" | "paused" | "ended";
  spend: number;
  leads: number;
  cpl: number;
  cpc: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  roi: number;
  startDate: string;
};
