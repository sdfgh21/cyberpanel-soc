import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';

export default function Layout({ children }) {
  const [collapsed, setCollapsed]     = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); setPaletteOpen(p=>!p); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-950">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} onOpenPalette={() => setPaletteOpen(true)} />
      <main className={`flex-1 min-h-screen transition-all duration-200 ${collapsed?'ml-16':'ml-60'}`}>
        <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
