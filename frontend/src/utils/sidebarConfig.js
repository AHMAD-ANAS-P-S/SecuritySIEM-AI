/* sidebarConfig.js - Navigation structure and quick actions configuration for SIEM AI */

export const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Security Operations Center',
    path: '/dashboard',
    iconName: 'LayoutDashboard',
  },
  {
    id: 'incidents',
    label: 'Security Alerts',
    path: '/alerts',
    iconName: 'ShieldAlert',
    badge: {
      count: 14,
      type: 'critical',
    }
  },
  {
    id: 'hunting',
    label: 'Threat Hunting',
    path: '/hunting',
    iconName: 'Target',
    badge: {
      count: 3,
      type: 'high',
    }
  },
  {
    id: 'ai-investigation',
    label: 'SIEM AI Investigation',
    path: '/ai-investigation',
    iconName: 'Brain',
  },
  {
    id: 'network',
    label: 'Network Topology',
    path: '/network',
    iconName: 'Network',
  },
  {
    id: 'history',
    label: 'Audit Timeline',
    path: '/history',
    iconName: 'Terminal',
  },
  {
    id: 'analytics',
    label: 'Threat Intelligence',
    path: '/analytics',
    iconName: 'BarChart2',
  },
  {
    id: 'reports',
    label: 'Incident Reports',
    path: '/reports',
    iconName: 'FileSpreadsheet',
  },
  {
    id: 'help',
    label: 'Documentation',
    path: '/help',
    iconName: 'BookOpen',
  },
  {
    id: 'settings',
    label: 'Platform Settings',
    path: '/settings',
    iconName: 'Settings',
  }
];

export const QUICK_ACTIONS = [
  {
    id: 'run-query',
    label: 'Execute KQL Query',
    iconName: 'Search',
    shortcut: '⌘K',
    actionType: 'query'
  },
  {
    id: 'contain-host',
    label: 'Isolate Endpoint Host',
    iconName: 'ShieldOff',
    shortcut: '⌘I',
    actionType: 'contain'
  }
];
