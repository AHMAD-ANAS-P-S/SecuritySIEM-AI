/**
 * threats.js — SIEM Threat Hunting Feed Mock Data
 */

export const THREAT_FEEDS = [
  {
    id: 'THR-102',
    name: 'WannaCry Ransomware Indicator',
    signature: 'SHA256: 24d00b42c4b57a2928812c45161d9a29',
    severity: 'critical',
    source: 'US-CERT Feed',
    detectedCount: 14,
    compromisedHosts: ['WKSTN-042.corp.internal'],
  },
  {
    id: 'THR-103',
    name: 'Trojan AgentTesla Inbound Loader',
    signature: 'Domain: mail-tesla-server.dynamic-dns.net',
    severity: 'high',
    source: 'Optyx Intelligence Feed',
    detectedCount: 31,
    compromisedHosts: ['MAIL-SRV-01.corp', 'WKSTN-112.corp.internal'],
  },
  {
    id: 'THR-104',
    name: 'Log4Shell Vulnerability Scanner Probe',
    signature: 'IP: 167.99.122.45 (URI: jndi:ldap://...)',
    severity: 'high',
    source: 'AlienVault OTX',
    detectedCount: 8,
    compromisedHosts: ['WEB-SRV-03.dmz'],
  },
  {
    id: 'THR-105',
    name: 'XMRig Cryptominer Execution',
    signature: 'Process: xmrig.exe (Stratum protocol)',
    severity: 'medium',
    source: 'Internal Behavioral Sandbox',
    detectedCount: 22,
    compromisedHosts: ['WKSTN-005.corp.internal', 'WKSTN-090.corp.internal'],
  },
  {
    id: 'THR-106',
    name: 'Cobalt Strike Beacon activity',
    signature: 'Domain: cloud-service-update.net/jquery.min.js',
    severity: 'critical',
    source: 'Mandiant Threat Intel',
    detectedCount: 5,
    compromisedHosts: ['DC-01.corp.internal'],
  },
];

export const VULNERABILITY_VECTORS = [
  { category: 'External Ports', score: 85, count: 12 },
  { category: 'Outdated OS Patching', score: 92, count: 48 },
  { category: 'Weak Service Accounts', score: 64, count: 18 },
  { category: 'Lack of MFA Enrolment', score: 70, count: 90 },
  { category: 'Public S3 Permissions', score: 55, count: 4 },
];
