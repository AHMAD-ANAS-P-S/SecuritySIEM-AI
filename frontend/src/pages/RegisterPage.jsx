/* RegisterPage.jsx — Analyst access request form */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { PATHS } from '@routes/paths';

const INPUT_STYLE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#f0f9ff',
  outline: 'none',
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'analyst', accept: false });

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    navigate(PATHS.LOGIN);
  };

  return (
    <div>
      <div className="mb-8">
        <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-500">// SOC ACCESS REQUEST</span>
        <h2 className="text-2xl font-bold text-white mt-1">Request SOC Platform Access</h2>
        <p className="text-slate-500 text-sm mt-1">Submit your access request to the SIEM AI Security Operations Center.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { name: 'name',     label: 'Full Name',     type: 'text',     placeholder: 'John Smith' },
          { name: 'email',    label: 'Work Email',    type: 'email',    placeholder: 'analyst@company.com' },
          { name: 'password', label: 'Password',      type: 'password', placeholder: '••••••••' },
        ].map(field => (
          <div key={field.name}>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">{field.label}</label>
            <input name={field.name} type={field.type} value={form[field.name]} onChange={handleChange}
              placeholder={field.placeholder} required
              className="w-full rounded-lg px-4 py-3 text-sm transition-all"
              style={INPUT_STYLE}
              onFocus={e => e.target.style.borderColor = 'rgba(0,245,255,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
        ))}

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Role</label>
          <select name="role" value={form.role} onChange={handleChange}
            className="w-full rounded-lg px-4 py-3 text-sm" style={INPUT_STYLE}>
            <option value="analyst">Security Analyst</option>
            <option value="admin">SOC Admin</option>
            <option value="viewer">Read-Only Viewer</option>
          </select>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" name="accept" checked={form.accept} onChange={handleChange} className="rounded" />
          <span className="font-mono text-[10px] text-slate-500">
            I agree to the <span className="text-cyan-500">Terms of Service</span> and <span className="text-cyan-500">Security Policy</span>
          </span>
        </label>

        <button type="submit" disabled={loading || !form.accept}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-mono text-xs font-semibold uppercase tracking-widest mt-2 transition-all duration-200"
          style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', color: '#00f5ff', opacity: (loading || !form.accept) ? 0.5 : 1 }}>
          {loading ? <><Loader2 size={14} className="animate-spin" /> Creating Account...</> : <><ChevronRight size={14} /> Request Access</>}
        </button>
      </form>

      <div className="mt-6 text-center">
        <span className="font-mono text-[10px] text-slate-600">Already provisioned? </span>
        <Link to={PATHS.LOGIN} className="font-mono text-[10px] text-cyan-500 hover:text-cyan-300">Sign in →</Link>
      </div>
    </div>
  );
}
