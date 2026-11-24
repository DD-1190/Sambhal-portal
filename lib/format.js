export const rs = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const num = (n, d = 1) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: d });
export const pct = (a, b) => (b ? Math.min(999, Math.round((a / b) * 100)) : 0);
export const barClass = (p) => (p >= 100 ? 'bad' : p >= 80 ? 'warn' : '');
export const dt = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '-';
