/* NetworkTopologyPage.jsx — Live network topology map and asset inventory */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Server, Globe, Router, Database, Cloud,
  Shield, AlertTriangle, Wifi, Search, RefreshCw,
  Filter, ChevronRight, Activity, Zap, Lock,
  MapPin, ArrowRight, Info, X, CheckCircle,
} from 'lucide-react';

/* ─── Mock Network Data ─────────────────────────────────────────── */
const NETWORK_NODES = [
  // Internet / External
  { id: 'internet',    label: 'Internet',           type: 'internet',  x: 50,  y: 50,  status: 'neutral', threats: 0, ip: 'External', os: '—' },
  // Perimeter
  { id: 'fw-01',       label: 'Firewall-01',         type: 'firewall',  x: 50,  y: 170, status: 'healthy', threats: 0, ip: '10.0.0.1',   os: 'PAN-OS 11.0' },
  { id: 'lb-01',       label: 'Load Balancer',       type: 'network',   x: 180, y: 280, status: 'healthy', threats: 0, ip: '10.0.0.5',   os: 'NGINX 1.24' },
  { id: 'vpn-gw',      label: 'VPN Gateway',         type: 'network',   x: 320, y: 170, status: 'warning', threats: 1, ip: '10.0.0.10',  os: 'OpenVPN 2.6' },
  // DMZ / Public
  { id: 'web-srv-01',  label: 'WEB-SRV-01',          type: 'server',    x: 100, y: 380, status: 'warning', threats: 2, ip: '10.1.0.10',  os: 'RHEL 9.2' },
  { id: 'web-srv-02',  label: 'WEB-SRV-02',          type: 'server',    x: 260, y: 380, status: 'healthy', threats: 0, ip: '10.1.0.11',  os: 'RHEL 9.2' },
  { id: 'api-gw',      label: 'API-GW-01',           type: 'server',    x: 420, y: 280, status: 'healthy', threats: 0, ip: '10.1.0.20',  os: 'Node 20 LTS' },
  // Internal Core
  { id: 'dc-01',       label: 'DC-01 (Primary AD)',   type: 'dc',        x: 180, y: 490, status: 'warning', threats: 3, ip: '10.2.0.1',   os: 'Windows Server 2022' },
  { id: 'dc-02',       label: 'DC-02 (Replica)',      type: 'dc',        x: 370, y: 490, status: 'healthy', threats: 0, ip: '10.2.0.2',   os: 'Windows Server 2022' },
  { id: 'db-cluster',  label: 'DB-CLUSTER',           type: 'database',  x: 540, y: 380, status: 'healthy', threats: 0, ip: '10.2.0.50',  os: 'PostgreSQL 16' },
  // Endpoints
  { id: 'wkstn-042',   label: 'WKSTN-042',            type: 'endpoint',  x: 80,  y: 600, status: 'critical', threats: 7, ip: '10.3.0.42',  os: 'Windows 11 Pro' },
  { id: 'wkstn-101',   label: 'WKSTN-101',            type: 'endpoint',  x: 220, y: 600, status: 'healthy', threats: 0, ip: '10.3.0.101', os: 'macOS Sonoma' },
  { id: 'wkstn-203',   label: 'WKSTN-203',            type: 'endpoint',  x: 360, y: 600, status: 'healthy', threats: 0, ip: '10.3.0.203', os: 'Ubuntu 24.04' },
  // Cloud
  { id: 'cloud-aws',   label: 'AWS VPC (us-east-1)',  type: 'cloud',     x: 600, y: 490, status: 'healthy', threats: 0, ip: '172.16.0.0/16', os: 'AWS' },
  { id: 's3-bucket',   label: 'S3-BUCKET-LOGS',       type: 'cloud',     x: 700, y: 380, status: 'warning', threats: 1, ip: 's3://soc-logs', os: 'AWS S3' },
];

const NETWORK_EDGES = [
  { from: 'internet',   to: 'fw-01',      encrypted: false },
  { from: 'fw-01',      to: 'lb-01',      encrypted: true },
  { from: 'fw-01',      to: 'vpn-gw',     encrypted: true },
  { from: 'lb-01',      to: 'web-srv-01', encrypted: true },
  { from: 'lb-01',      to: 'web-srv-02', encrypted: true },
  { from: 'fw-01',      to: 'api-gw',     encrypted: true },
  { from: 'api-gw',     to: 'db-cluster', encrypted: true },
  { from: 'api-gw',     to: 'dc-01',      encrypted: true },
  { from: 'web-srv-01', to: 'dc-01',      encrypted: false },
  { from: 'dc-01',      to: 'dc-02',      encrypted: true },
  { from: 'dc-01',      to: 'wkstn-042',  encrypted: false },
  { from: 'dc-01',      to: 'wkstn-101',  encrypted: true },
  { from: 'dc-01',      to: 'wkstn-203',  encrypted: true },
  { from: 'dc-02',      to: 'db-cluster', encrypted: true },
  { from: 'api-gw',     to: 'cloud-aws',  encrypted: true },
  { from: 'cloud-aws',  to: 's3-bucket',  encrypted: true },
  { from: 'vpn-gw',     to: 'dc-02',      encrypted: true },
];

const ASSET_TABLE = [
  { host: 'WKSTN-042',   ip: '10.3.0.42',   type: 'Endpoint',  os: 'Windows 11 Pro',     status: 'critical', lastSeen: '22:47 UTC',  open: 7 },
  { host: 'DC-01',       ip: '10.2.0.1',    type: 'Domain Controller', os: 'Win Server 2022', status: 'warning', lastSeen: '22:43 UTC', open: 3 },
  { host: 'WEB-SRV-01',  ip: '10.1.0.10',   type: 'Web Server', os: 'RHEL 9.2',           status: 'warning', lastSeen: '22:31 UTC',  open: 2 },
  { host: 'VPN-GW',      ip: '10.0.0.10',   type: 'Network',   os: 'OpenVPN 2.6',         status: 'warning', lastSeen: '22:20 UTC',  open: 1 },
  { host: 'S3-BUCKET',   ip: 's3://soc-logs', type: 'Cloud',  os: 'AWS S3',              status: 'warning', lastSeen: '22:00 UTC',  open: 1 },
  { host: 'FW-01',       ip: '10.0.0.1',    type: 'Firewall',  os: 'PAN-OS 11.0',        status: 'healthy', lastSeen: '22:47 UTC',  open: 0 },
  { host: 'WKSTN-101',   ip: '10.3.0.101',  type: 'Endpoint',  os: 'macOS Sonoma',       status: 'healthy', lastSeen: '22:46 UTC',  open: 0 },
  { host: 'API-GW-01',   ip: '10.1.0.20',   type: 'API Gateway', os: 'Node 20 LTS',      status: 'healthy', lastSeen: '22:47 UTC',  open: 0 },
];

/* ─── Style Maps ─────────────────────────────────────────────────── */
const STATUS_STYLE = {
  critical: { dot: 'bg-red-400',     text: 'var(--threat-critical)', bg: 'var(--threat-critical-glow)', border: 'var(--threat-critical-border)', label: 'Critical' },
  warning:  { dot: 'bg-amber-400',   text: 'var(--threat-medium)',   bg: 'var(--threat-medium-glow)',   border: 'var(--threat-medium-border)',   label: 'Warning' },
  healthy:  { dot: 'bg-emerald-400', text: 'var(--cyber-accent-green)', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)',          label: 'Healthy' },
  neutral:  { dot: 'bg-slate-400',   text: 'var(--cyber-text-muted)', bg: 'transparent', border: 'var(--cyber-border-subtle)',              label: 'Unknown' },
};

const NODE_TYPE_ICONS = {
  internet: Globe,
  firewall: Shield,
  network: Router,
  server: Server,
  dc: Monitor,
  database: Database,
  endpoint: Monitor,
  cloud: Cloud,
};

const NODE_TYPE_COLORS = {
  internet: 'var(--cyber-text-muted)',
  firewall: 'var(--cyber-accent-cyan)',
  network: 'var(--cyber-accent-blue)',
  server: 'var(--cyber-accent-indigo)',
  dc: 'var(--cyber-accent-violet)',
  database: 'var(--threat-medium)',
  endpoint: 'var(--cyber-text-base)',
  cloud: '#60a5fa',
};

/* ─── Network Topology Canvas ───────────────────────────────────── */
function TopologyCanvas({ nodes, edges, selectedNode, onSelectNode, searchTerm }) {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 680 });

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        setDimensions({ w: canvasRef.current.offsetWidth, h: Math.max(canvasRef.current.offsetHeight, 620) });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Scale nodes to canvas
  const scaleX = (x) => (x / 760) * (dimensions.w - 80) + 40;
  const scaleY = (y) => (y / 660) * (dimensions.h - 80) + 40;

  const getNodeById = (id) => nodes.find(n => n.id === id);
  const isFiltered = (node) => searchTerm && !node.label.toLowerCase().includes(searchTerm.toLowerCase()) && !node.ip.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <div ref={canvasRef} className="relative w-full rounded-xl overflow-hidden" style={{ height: '620px', background: 'var(--cyber-bg-deep)', border: '1px solid var(--cyber-border-subtle)' }}>
      {/* Grid pattern background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]">
        <defs>
          <pattern id="topo-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--cyber-accent-cyan)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo-grid)" />
      </svg>

      {/* SVG Edges Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge, i) => {
          const fromNode = getNodeById(edge.from);
          const toNode = getNodeById(edge.to);
          if (!fromNode || !toNode) return null;
          const x1 = scaleX(fromNode.x);
          const y1 = scaleY(fromNode.y);
          const x2 = scaleX(toNode.x);
          const y2 = scaleY(toNode.y);
          const isCritical = fromNode.status === 'critical' || toNode.status === 'critical';
          const isSelected = selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);
          return (
            <g key={i}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isCritical ? 'var(--threat-critical)' : isSelected ? 'var(--cyber-accent-cyan)' : edge.encrypted ? 'var(--cyber-accent-blue)' : 'var(--cyber-border-glow)'}
                strokeWidth={isSelected ? 2 : isCritical ? 1.5 : 1}
                strokeOpacity={isSelected ? 0.9 : isCritical ? 0.6 : 0.3}
                strokeDasharray={edge.encrypted ? 'none' : '5,4'}
              />
              {isCritical && (
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="var(--threat-critical)"
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                  strokeDasharray="8,3"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-22" dur="1.5s" repeatCount="indefinite" />
                </line>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes Layer */}
      {nodes.map((node) => {
        const x = scaleX(node.x);
        const y = scaleY(node.y);
        const Icon = NODE_TYPE_ICONS[node.type] || Server;
        const iconColor = NODE_TYPE_COLORS[node.type] || 'var(--cyber-text-muted)';
        const st = STATUS_STYLE[node.status] || STATUS_STYLE.neutral;
        const isSelected = selectedNode?.id === node.id;
        const dimmed = isFiltered(node) || (searchTerm && !isFiltered(node) === false);
        const filtered = searchTerm && !node.label.toLowerCase().includes(searchTerm.toLowerCase()) && !node.ip.toLowerCase().includes(searchTerm.toLowerCase());

        return (
          <motion.button
            key={node.id}
            initial={false}
            animate={{ opacity: filtered ? 0.2 : 1 }}
            transition={{ duration: 0.2 }}
            onClick={() => onSelectNode(isSelected ? null : node)}
            className="absolute flex flex-col items-center"
            style={{ left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 30 : 10 }}
          >
            <motion.div
              animate={{ scale: isSelected ? 1.2 : 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative flex items-center justify-center rounded-xl"
              style={{
                width: 44, height: 44,
                background: isSelected ? st.bg : 'var(--cyber-bg-panel)',
                border: `2px solid ${isSelected ? st.text : node.status === 'critical' ? 'var(--threat-critical)' : node.status === 'warning' ? 'var(--threat-medium)' : 'var(--cyber-border-subtle)'}`,
                boxShadow: node.status === 'critical' ? `0 0 16px ${st.bg}` : isSelected ? `0 0 12px ${st.bg}` : 'var(--shadow-card)',
              }}
            >
              <Icon size={18} style={{ color: iconColor }} />
              {/* Threat badge */}
              {node.threats > 0 && (
                <span className="absolute -top-1.5 -right-1.5 font-mono text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: node.status === 'critical' ? 'var(--threat-critical)' : 'var(--threat-medium)', color: '#fff' }}>
                  {node.threats}
                </span>
              )}
              {/* Pulse ring for critical */}
              {node.status === 'critical' && (
                <motion.div
                  animate={{ scale: [1, 1.6, 1.6], opacity: [0.6, 0, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-xl"
                  style={{ border: '2px solid var(--threat-critical)' }}
                />
              )}
            </motion.div>
            <div className="mt-1.5 px-1.5 py-0.5 rounded text-center"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
              <span className="font-mono text-[8px] whitespace-nowrap block" style={{ color: 'var(--cyber-text-base)' }}>
                {node.label.length > 14 ? node.label.substring(0, 14) + '…' : node.label}
              </span>
            </div>
          </motion.button>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 rounded-lg p-2.5"
        style={{ background: 'rgba(7,9,18,0.85)', backdropFilter: 'blur(8px)', border: '1px solid var(--cyber-border-subtle)' }}>
        <div className="font-mono text-[8px] uppercase tracking-widest mb-1" style={{ color: 'var(--cyber-text-dim)' }}>Legend</div>
        {[
          { color: 'var(--threat-critical)', label: 'Critical Threat', dash: false },
          { color: 'var(--threat-medium)', label: 'Warning', dash: false },
          { color: 'var(--cyber-accent-blue)', label: 'Encrypted Link', dash: false },
          { color: 'var(--cyber-border-glow)', label: 'Unencrypted Link', dash: true },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <svg width="20" height="10">
              <line x1="0" y1="5" x2="20" y2="5" stroke={item.color} strokeWidth="1.5" strokeDasharray={item.dash ? '4,3' : 'none'} />
            </svg>
            <span className="font-mono text-[8px]" style={{ color: 'var(--cyber-text-muted)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Node Detail Drawer ─────────────────────────────────────────── */
function NodeDetailDrawer({ node, onClose }) {
  if (!node) return null;
  const st = STATUS_STYLE[node.status] || STATUS_STYLE.neutral;
  const Icon = NODE_TYPE_ICONS[node.type] || Server;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', boxShadow: 'var(--shadow-elevated)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--cyber-border-muted)', background: 'var(--cyber-bg-accent)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: st.bg, border: `1px solid ${st.border}` }}>
              <Icon size={14} style={{ color: NODE_TYPE_COLORS[node.type] }} />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold" style={{ color: 'var(--cyber-text-bright)' }}>{node.label}</div>
              <div className="font-mono text-[8px]" style={{ color: 'var(--cyber-text-muted)' }}>{node.type.toUpperCase()}</div>
            </div>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--cyber-text-dim)' }}>
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: 'IP Address', value: node.ip },
            { label: 'Operating System', value: node.os },
            { label: 'Status', value: st.label },
            { label: 'Active Threats', value: node.threats > 0 ? `${node.threats} open` : 'None' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="font-mono text-[9px]" style={{ color: 'var(--cyber-text-muted)' }}>{item.label}</span>
              <span className="font-mono text-[9px] font-medium"
                style={{ color: item.label === 'Status' ? st.text : item.label === 'Active Threats' && node.threats > 0 ? 'var(--threat-critical)' : 'var(--cyber-text-base)' }}>
                {item.value}
              </span>
            </div>
          ))}
          <div className="pt-2 space-y-1.5">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-mono text-[9px] transition-all"
              style={{ background: 'var(--cyber-accent-cyan-glow)', border: '1px solid rgba(0,229,255,0.2)', color: 'var(--cyber-accent-cyan)' }}>
              <span>View Full Asset Profile</span><ChevronRight size={10} />
            </button>
            {node.threats > 0 && (
              <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-mono text-[9px] transition-all"
                style={{ background: 'var(--threat-critical-glow)', border: '1px solid var(--threat-critical-border)', color: 'var(--threat-critical)' }}>
                <span>Isolate Endpoint</span><Lock size={10} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function NetworkTopologyPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('topology');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const summary = {
    total: NETWORK_NODES.filter(n => n.type !== 'internet').length,
    critical: NETWORK_NODES.filter(n => n.status === 'critical').length,
    warning: NETWORK_NODES.filter(n => n.status === 'warning').length,
    healthy: NETWORK_NODES.filter(n => n.status === 'healthy').length,
  };

  const filteredAssets = ASSET_TABLE.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchSearch = !searchTerm || a.host.toLowerCase().includes(searchTerm.toLowerCase()) || a.ip.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-4 lg:p-6 min-h-full" style={{ background: 'var(--cyber-bg-deep)' }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="font-headings text-2xl font-bold" style={{ color: 'var(--cyber-text-bright)' }}>
            Network Topology & Asset Inventory
          </h1>
          <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--cyber-text-muted)' }}>
            Live view of monitored infrastructure · Last scanned 2 minutes ago
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-[10px] transition-all"
            style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', color: 'var(--cyber-text-muted)' }}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--cyber-accent-cyan)' }} />
            {refreshing ? 'Scanning...' : 'Rescan Network'}
          </button>
        </div>
      </motion.div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Monitored Assets', value: summary.total,    color: 'var(--cyber-accent-cyan)',   icon: Monitor },
          { label: 'Critical Threats', value: summary.critical, color: 'var(--threat-critical)',     icon: AlertTriangle },
          { label: 'Warnings',         value: summary.warning,  color: 'var(--threat-medium)',       icon: Zap },
          { label: 'Healthy',          value: summary.healthy,  color: 'var(--cyber-accent-green)',  icon: CheckCircle },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${kpi.color}22`, border: `1px solid ${kpi.color}44` }}>
                <Icon size={16} style={{ color: kpi.color }} />
              </div>
              <div>
                <div className="font-headings text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="font-mono text-[9px] uppercase tracking-wide" style={{ color: 'var(--cyber-text-muted)' }}>{kpi.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* View Toggle + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)' }}>
          {[
            { id: 'topology', label: 'Topology Map', icon: Wifi },
            { id: 'table',    label: 'Asset Table',  icon: Activity },
          ].map(v => {
            const Icon = v.icon;
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] transition-all duration-200"
                style={{
                  background: view === v.id ? 'var(--cyber-accent-cyan-glow)' : 'transparent',
                  border: `1px solid ${view === v.id ? 'rgba(0,229,255,0.25)' : 'transparent'}`,
                  color: view === v.id ? 'var(--cyber-accent-cyan)' : 'var(--cyber-text-muted)',
                }}>
                <Icon size={12} />
                {v.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--cyber-text-dim)' }} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search hosts, IPs..."
              className="pl-8 pr-3 py-2 rounded-lg font-mono text-[10px] w-48 transition-all"
              style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', color: 'var(--cyber-text-bright)', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = 'var(--cyber-border-glow)'}
              onBlur={e => e.target.style.borderColor = 'var(--cyber-border-subtle)'}
            />
          </div>
          {view === 'table' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg font-mono text-[10px] transition-all"
              style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', color: 'var(--cyber-text-base)', outline: 'none' }}
            >
              <option value="all">All Status</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="healthy">Healthy</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {view === 'topology' ? (
          <motion.div
            key="topology"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-4"
          >
            {/* Canvas */}
            <div className="flex-1 min-w-0">
              <TopologyCanvas
                nodes={NETWORK_NODES}
                edges={NETWORK_EDGES}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                searchTerm={searchTerm}
              />
            </div>
            {/* Node Detail Sidebar */}
            {selectedNode && (
              <div className="w-56 flex-shrink-0">
                <NodeDetailDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--cyber-bg-panel)', border: '1px solid var(--cyber-border-subtle)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--cyber-border-muted)', background: 'var(--cyber-bg-accent)' }}>
                    {['Host', 'IP Address', 'Type', 'OS', 'Status', 'Last Seen', 'Open Alerts', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-widest"
                        style={{ color: 'var(--cyber-text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset, i) => {
                    const st = STATUS_STYLE[asset.status] || STATUS_STYLE.neutral;
                    return (
                      <motion.tr
                        key={asset.host}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="transition-colors cursor-pointer border-b"
                        style={{ borderColor: 'var(--cyber-border-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--cyber-bg-accent)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] font-medium" style={{ color: 'var(--cyber-text-bright)' }}>{asset.host}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px]" style={{ color: 'var(--cyber-text-muted)' }}>{asset.ip}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[9px] px-2 py-0.5 rounded"
                            style={{ background: 'var(--cyber-bg-deep)', color: 'var(--cyber-text-base)', border: '1px solid var(--cyber-border-muted)' }}>
                            {asset.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px]" style={{ color: 'var(--cyber-text-muted)' }}>{asset.os}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 font-mono text-[9px] px-2 py-0.5 rounded-full w-fit"
                            style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.text }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                              style={{ boxShadow: asset.status === 'critical' ? '0 0 5px rgba(255,45,85,0.6)' : 'none' }} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px]" style={{ color: 'var(--cyber-text-muted)' }}>{asset.lastSeen}</span>
                        </td>
                        <td className="px-4 py-3">
                          {asset.open > 0 ? (
                            <span className="font-mono text-[10px] font-bold" style={{ color: asset.open >= 5 ? 'var(--threat-critical)' : 'var(--threat-medium)' }}>
                              {asset.open}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px]" style={{ color: 'var(--cyber-accent-green)' }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button className="flex items-center gap-1 font-mono text-[9px] transition-colors"
                            style={{ color: 'var(--cyber-text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--cyber-accent-cyan)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--cyber-text-muted)'}>
                            Investigate <ArrowRight size={10} />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAssets.length === 0 && (
                <div className="py-12 text-center">
                  <Info size={24} className="mx-auto mb-2" style={{ color: 'var(--cyber-text-dim)' }} />
                  <p className="font-mono text-[11px]" style={{ color: 'var(--cyber-text-muted)' }}>No assets match your filters</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
