/**
 * reports.js — SIEM Compliance and Export Reports Mock Data
 */

export const COMPLIANCE_REPORTS = [
  { id: 'REP-001', name: 'SOC 2 Type II Compliance Report', category: 'Compliance', frequency: 'Monthly', status: 'ready', date: '2026-07-01', size: '4.8 MB', format: 'PDF' },
  { id: 'REP-002', name: 'ISO 27001 ISMS Audit Logs Summary', category: 'Compliance', frequency: 'Quarterly', status: 'ready', date: '2026-06-30', size: '12.4 MB', format: 'CSV' },
  { id: 'REP-003', name: 'HIPAA Security Controls Checklist', category: 'Security', frequency: 'Annual', status: 'generating', date: 'Running now', size: '—', format: 'PDF' },
  { id: 'REP-004', name: 'Internal Vulnerability Scan Report', category: 'Technical', frequency: 'Weekly', status: 'ready', date: '2026-07-12', size: '2.1 MB', format: 'PDF' },
  { id: 'REP-005', name: 'Executive Operations Summary', category: 'Executive', frequency: 'Monthly', status: 'ready', date: '2026-07-01', size: '1.2 MB', format: 'PDF' },
];

export const SCHEDULED_REPORTS = [
  { name: 'PCI-DSS Daily Transactions Log', recipient: 'compliance-alerts@corp.com', nextRun: '2026-07-16 00:00:00' },
  { name: 'Active Directory User Auditing Audit', recipient: 'iam-ops@corp.com', nextRun: '2026-07-17 06:00:00' },
  { name: 'Firewall Dropped Packet Analysis', recipient: 'network-security@corp.com', nextRun: '2026-07-19 12:00:00' },
];
