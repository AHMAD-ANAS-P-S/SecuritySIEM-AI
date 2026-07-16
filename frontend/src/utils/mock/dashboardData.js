/**
 * dashboardData.js — SIEM Dashboard Mock Data
 */

export const KPI_DATA = [
  { id: 'total_alerts',  label: 'Total Alerts (24h)',     value: 1847,  delta: 12.4, color: 'cyan',   unit: '' },
  { id: 'critical',      label: 'Critical Incidents',     value: 7,     delta: -2.0, color: 'red',    unit: '' },
  { id: 'mttr',          label: 'Avg MTTR',               value: 4.2,   delta: -18.5, color: 'green',  unit: 'min' },
  { id: 'systems',       label: 'Systems Monitored',      value: 3412,  delta: 3.1,  color: 'blue',   unit: '' },
];

export const SEVERITY_DISTRIBUTION = [
  { label: 'Critical', count: 7,   pct: 5,  color: '#ff2e54', glow: 'rgba(255,46,84,0.4)' },
  { label: 'High',     count: 23,  pct: 16, color: '#f97316', glow: 'rgba(249,115,22,0.4)' },
  { label: 'Medium',   count: 84,  pct: 58, color: '#eab308', glow: 'rgba(234,179,8,0.4)' },
  { label: 'Low',      count: 31,  pct: 21, color: '#10b981', glow: 'rgba(16,185,129,0.4)' },
];

export const SYSTEM_HEALTH = [
  { name: 'DC-01.corp.internal', type: 'Domain Controller', status: 'warning', cpu: 78, ram: 84, activeAlerts: 2 },
  { name: 'WEB-SRV-01.dmz',      type: 'Web Server',        status: 'critical', cpu: 94, ram: 90, activeAlerts: 4 },
  { name: 'SQL-DB-02.prod',      type: 'Database Cluster',  status: 'healthy',  cpu: 34, ram: 56, activeAlerts: 0 },
  { name: 'MAIL-SRV-01.corp',    type: 'Exchange Server',   status: 'healthy',  cpu: 45, ram: 72, activeAlerts: 0 },
  { name: 'K8S-GW-01.cloud',     type: 'API Gateway',       status: 'healthy',  cpu: 52, ram: 60, activeAlerts: 0 },
];

export const EVENT_TRENDS = [
  { time: '00:00', firewall: 140, dns: 90, activeDirectory: 45 },
  { time: '02:00', firewall: 120, dns: 80, activeDirectory: 30 },
  { time: '04:00', firewall: 110, dns: 75, activeDirectory: 25 },
  { time: '06:00', firewall: 180, dns: 110, activeDirectory: 55 },
  { time: '08:00', firewall: 310, dns: 240, activeDirectory: 120 },
  { time: '10:00', firewall: 480, dns: 390, activeDirectory: 190 },
  { time: '12:00', firewall: 590, dns: 420, activeDirectory: 210 },
  { time: '14:00', firewall: 510, dns: 380, activeDirectory: 180 },
  { time: '16:00', firewall: 640, dns: 480, activeDirectory: 240 },
  { time: '18:00', firewall: 580, dns: 410, activeDirectory: 220 },
  { time: '20:00', firewall: 620, dns: 490, activeDirectory: 250 },
  { time: '22:00', firewall: 490, dns: 370, activeDirectory: 160 },
];
