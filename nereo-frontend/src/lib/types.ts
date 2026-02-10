// ── Subscriber / Membership types ──

export type MembershipStatus = "active" | "expired" | "pending" | "paused";

export interface Subscriber {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  plate: string;
  vehicleModel?: string;
  plan: Plan;
  status: MembershipStatus;
  renewalDate: string;
  lastWashDate?: string;
  createdAt: string;
  branchId: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: "monthly" | "quarterly" | "annual";
  features: string[];
  recommended?: boolean;
}

export interface WashRecord {
  id: string;
  subscriberId: string;
  date: string;
  serviceType: string;
  operarioName: string;
  durationMinutes: number;
  notes?: string;
}

// ── Dashboard / Analytics types ──

export interface DashboardKPIs {
  monthlyRevenue: number;
  revenueChange: number;
  activeSubscribers: number;
  subscribersChange: number;
  churnRate: number;
  churnChange: number;
  avgTicket: number;
  avgTicketChange: number;
}

export interface RevenueDataPoint {
  month: string;
  subscriptionRevenue: number;
  singleWashRevenue: number;
  total: number;
}

export interface ChurnDataPoint {
  month: string;
  churnRate: number;
}

export interface AtRiskSubscriber {
  id: string;
  fullName: string;
  phone: string;
  plan: string;
  daysSinceLastWash: number;
  renewalDate: string;
  riskReason: "no_wash_15d" | "payment_expiring";
}

export interface RevenueProjection {
  month: string;
  optimistic: number;
  realistic: number;
  pessimistic: number;
}

export interface WeatherData {
  current: {
    temp: number;
    description: string;
    icon: string;
  };
  forecast: {
    date: string;
    temp: number;
    description: string;
    icon: string;
  }[];
  suggestion?: string;
}
