/* headerConfig.js — Configuration for SIEM AI Header components */

export const WORKSPACES = [
  { id: 'soc-primary', name: 'Primary SOC', region: 'US-EAST-1', status: 'optimal' },
  { id: 'soc-secondary', name: 'Backup SOC', region: 'US-WEST-2', status: 'optimal' },
  { id: 'soc-eu', name: 'EU Deployment', region: 'EU-CENTRAL-1', status: 'degraded' },
  { id: 'soc-compliance', name: 'Archive/Audit', region: 'US-EAST-1', status: 'optimal' }
];

export const SEARCH_COMMANDS = [
  { id: 'cmd-query', title: 'Run KQL Query', category: 'Commands', shortcut: 'Ctrl+Shift+K', action: 'query' },
  { id: 'cmd-isolate', title: 'Isolate Host', category: 'Commands', shortcut: 'Ctrl+Shift+I', action: 'isolate' },
  { id: 'cmd-rules', title: 'Manage SOAR Rules', category: 'Navigation', shortcut: 'G + R', action: 'soar' },
  { id: 'cmd-users', title: 'View SOC Users', category: 'Management', shortcut: 'G + U', action: 'users' },
  { id: 'cmd-status', title: 'System Diagnostics', category: 'Management', shortcut: 'G + D', action: 'status' }
];

export const MOCK_ALERTS = [
  { id: 'alt-1', title: 'Credential Access - LSASS Dump', time: '2m ago', severity: 'critical', read: false },
  { id: 'alt-2', title: 'Mass Exfiltration to WebDAV Target', time: '14m ago', severity: 'high', read: false },
  { id: 'alt-3', title: 'Brute force attempts from external subnet', time: '1h ago', severity: 'medium', read: true },
  { id: 'alt-4', title: 'Endpoint disconnected: WKSTN-023', time: '3h ago', severity: 'low', read: true }
];
