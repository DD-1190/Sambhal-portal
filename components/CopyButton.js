'use client';
import { useState } from 'react';

export default function CopyButton({ targetId }) {
  const [msg, setMsg] = useState('');
  async function copy() {
    const el = document.getElementById(targetId);
    try {
      await navigator.clipboard.writeText(el.value);
      setMsg('Copied.');
    } catch {
      el.select();
      setMsg('Select and copy the text.');
    }
  }
  return (
    <span className="row">
      <button type="button" className="btn primary" onClick={copy}>Copy summary</button>
      <span className="note" role="status">{msg}</span>
    </span>
  );
}
