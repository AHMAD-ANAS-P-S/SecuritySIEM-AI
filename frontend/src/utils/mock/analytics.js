/**
 * analytics.js — SIEM Performance Metrics and Geo Threat Origin Mock Data
 */

export const PERFORMANCE_TIMELINE = [
  { month: 'Jan', mttr: 14.5, mttd: 3.2, falsePositives: 420 },
  { month: 'Feb', mttr: 12.0, mttd: 2.9, falsePositives: 380 },
  { month: 'Mar', mttr: 11.2, mttd: 2.4, falsePositives: 350 },
  { month: 'Apr', mttr: 8.4,  mttd: 1.8, falsePositives: 290 },
  { month: 'May', mttr: 6.2,  mttd: 1.5, falsePositives: 210 },
  { month: 'Jun', mttr: 4.2,  mttd: 1.1, falsePositives: 145 },
];

export const GEO_THREAT_ORIGINS = [
  { country: 'United States', code: 'US', count: 1450, percentage: 42 },
  { country: 'Netherlands',   code: 'NL', count: 680,  percentage: 20 },
  { country: 'Germany',       code: 'DE', count: 480,  percentage: 14 },
  { country: 'United Kingdom', code: 'GB', count: 320,  percentage: 9 },
  { country: 'Other origins',  code: 'OTH', count: 520,  percentage: 15 },
];

export const ANALYST_METRICS = [
  { name: 'Sarah Connor', ticketsClosed: 242, avgResponseTime: '2.4 min', rating: 98 },
  { name: 'Alex Mercer',  ticketsClosed: 198, avgResponseTime: '3.1 min', rating: 95 },
  { name: 'Unassigned',   ticketsClosed: 14,  avgResponseTime: '—',       rating: 0 },
];
