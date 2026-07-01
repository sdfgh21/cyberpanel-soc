import React, { useState, useEffect } from 'react';
import { Search, Shield, Globe, CheckCircle, XCircle,
         Clock, ChevronDown, ChevronUp, Download, Trash2,
         ExternalLink, AlertTriangle, Zap, Lock } from 'lucide-react';
import api from '../utils/api';
import { timeAgo, formatDate } from '../utils/helpers.jsx';
import toast from 'react-hot-toast';

const GRADE_COLORS = { A:'text-green-400', B:'text-cyber-400', C:'text-yellow-400', D:'text-orange-400', F:'text-red-400' };
const GRADE_BG     = { A:'bg-green-900/30 border-green-700/40', B:'bg-cyber-900/30 border-cyber-700/40', C:'bg-yellow-900/30 border-yellow-700/40', D:'bg-orange-900/30 border-orange-700/40', F:'bg-red-900/30 border-red-700/40' };
const SEV_COLORS   = { critical:'text-red-400', high:'text-orange-400', medium:'text-yellow-400', low:'text-green-400' };
const PRIO_COLORS  = { P1:'text-red-400 bg-red-900/20 border-red-800/30', P2:'text-orange-400 bg-orange-900/20 border-orange-800/30', P3:'text-yellow-400 bg-yellow-900/20 border-yellow-800/30' };
const PRIO_RGB     = { P1:[239,68,68], P2:[249,115,22], P3:[234,179,8] };

// ── jsPDF via CDN (avoids Vite import issues) ─────────────────
let _jsPDFCache = null;
async function loadJsPDF() {
  if (_jsPDFCache) return _jsPDFCache;
  if (window.jspdf?.jsPDF) { _jsPDFCache = window.jspdf.jsPDF; return _jsPDFCache; }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      _jsPDFCache = window.jspdf?.jsPDF;
      _jsPDFCache ? resolve(_jsPDFCache) : reject(new Error('jsPDF not available'));
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF from CDN'));
    document.head.appendChild(script);
  });
}

// ── PDF Generator ─────────────────────────────────────────────
async function generateDevisPDF(devis) {
  try {
    toast.loading('Génération du PDF...', { id: 'pdf' });
    const JsPDF = await loadJsPDF();
    const doc   = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, M = 15, CW = W - M * 2;
    let y = 20;

    const checkPage = (needed = 20) => { if (y + needed > 275) { doc.addPage(); y = 20; } };

    // ── Header ──
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 48, 'F');
    doc.setFillColor(4, 47, 46);
    doc.rect(0, 0, 5, 48, 'F');

    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CyberPanel', M + 2, 16);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 184, 166);
    doc.text('SOC Security Services', M + 2, 23);
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`Devis N : ${devis.numero}`, M + 2, 31);
    doc.text(`Date : ${devis.date}   Validite : ${devis.validite}`, M + 2, 37);
    doc.text(`Client : ${devis.client}`, M + 2, 43);

    doc.setFillColor(20, 184, 166);
    doc.roundedRect(W - M - 32, 8, 32, 32, 3, 3, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('DEVIS', W - M - 16, 20, { align: 'center' });
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('REMEDIATION', W - M - 16, 27, { align: 'center' });
    doc.text('SECURITE', W - M - 16, 33, { align: 'center' });
    y = 56;

    // ── Résumé ──
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(M, y, CW, 18, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 184, 166);
    doc.text('RESUME EXECUTIF', M + 4, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    const resume = `Suite a l'audit de securite du site ${devis.client}, nous avons identifie ${devis.lignes.length} point(s) a corriger.`;
    doc.text(doc.splitTextToSize(resume, CW - 8), M + 4, y + 12);
    y += 24;

    // ── Table header ──
    doc.setFillColor(15, 23, 42);
    doc.rect(M, y, CW, 8, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    const C = { num:M+3, prio:M+11, prest:M+27, cat:M+115, ht:M+143, tva:M+160, ttc:M+177 };
    doc.text('#', C.num, y+5.5); doc.text('PRIO', C.prio, y+5.5);
    doc.text('PRESTATION', C.prest, y+5.5); doc.text('CATEGORIE', C.cat, y+5.5);
    doc.text('HT', C.ht, y+5.5); doc.text('TVA', C.tva, y+5.5); doc.text('TTC', C.ttc, y+5.5);
    y += 9;

    // ── Table rows ──
    devis.lignes.forEach((l, i) => {
      const pRGB  = PRIO_RGB[l.priorite] || [107,114,128];
      const tL    = doc.splitTextToSize(l.titre || '', 85);
      const dL    = doc.splitTextToSize(l.description || '', 85);
      const rowH  = Math.max(16, (tL.length + dL.length) * 4 + 8);
      checkPage(rowH + 2);
      doc.setFillColor(i%2===0?30:22, i%2===0?41:32, i%2===0?59:49);
      doc.rect(M, y, CW, rowH, 'F');
      doc.setFillColor(...pRGB); doc.rect(M, y, 2, rowH, 'F');
      doc.setFontSize(7.5); doc.setFont('helvetica','normal');
      doc.setTextColor(100,116,139); doc.text(String(l.numero), C.num, y+6);
      doc.setFillColor(...pRGB); doc.roundedRect(C.prio-0.5, y+2, 13, 5, 1, 1, 'F');
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(7);
      doc.text(l.priorite, C.prio+6, y+5.8, { align:'center' });
      doc.setTextColor(226,232,240); doc.setFont('helvetica','bold'); doc.setFontSize(8);
      doc.text(tL, C.prest, y+6);
      doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139); doc.setFontSize(7);
      doc.text(dL, C.prest, y + 6 + tL.length * 4);
      doc.setTextColor(20,184,166); doc.setFontSize(7.5);
      doc.text(l.categorie || '', C.cat, y+6);
      doc.setFont('helvetica','normal'); doc.setTextColor(200,210,220); doc.setFontSize(8);
      doc.text(`${l.prix_ht} EUR`, C.ht, y+6);
      doc.setTextColor(100,116,139); doc.text(`${l.tva} EUR`, C.tva, y+6);
      doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
      doc.text(`${l.prix_ttc} EUR`, C.ttc, y+6);
      y += rowH + 1;
    });

    // ── Totals ──
    checkPage(22); y += 3;
    doc.setFillColor(4, 47, 46);
    doc.roundedRect(M, y, CW, 18, 2, 2, 'F');
    const tX = W - M;
    doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184);
    doc.text('Total HT', tX-88, y+6);
    doc.setFont('helvetica','bold'); doc.setTextColor(226,232,240);
    doc.text(`${devis.total_ht} EUR`, tX-88, y+13);
    doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184);
    doc.text('TVA 20%', tX-55, y+6);
    doc.setFont('helvetica','bold'); doc.setTextColor(100,116,139);
    doc.text(`${devis.total_tva} EUR`, tX-55, y+13);
    doc.setFont('helvetica','normal'); doc.setTextColor(148,163,184);
    doc.text('TOTAL TTC', tX-18, y+6, { align:'right' });
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(20,184,166);
    doc.text(`${devis.total_ttc} EUR`, tX-18, y+15, { align:'right' });
    y += 24;

    // ── Fix details ──
    const fixItems = devis.lignes.filter(l => l.fix);
    if (fixItems.length > 0) {
      checkPage(16);
      doc.setFillColor(15,23,42); doc.rect(M, y, CW, 8, 'F');
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(20,184,166);
      doc.text('DETAIL DES CORRECTIFS TECHNIQUES', M+4, y+5.5);
      y += 10;
      fixItems.forEach(l => {
        const pRGB  = PRIO_RGB[l.priorite] || [107,114,128];
        const fixL  = doc.splitTextToSize(l.fix, CW - 16);
        const bH    = fixL.length * 4 + 12;
        checkPage(bH + 3);
        doc.setFillColor(22,32,49); doc.roundedRect(M, y, CW, bH, 2, 2, 'F');
        doc.setFillColor(...pRGB); doc.rect(M, y, 3, bH, 'F');
        doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(...pRGB);
        doc.text(`${l.priorite} -- ${l.titre}`, M+7, y+6);
        doc.setFont('courier','normal'); doc.setFontSize(6.5); doc.setTextColor(20,184,166);
        doc.text(fixL, M+7, y+11);
        y += bH + 3;
      });
    }

    // ── Conditions ──
    checkPage(16); y += 3;
    doc.setFillColor(22,32,49); doc.roundedRect(M, y, CW, 14, 2, 2, 'F');
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105);
    doc.text(devis.conditions || '', M+4, y+5);
    doc.text("Les prix sont indicatifs. Tout avenant fera l'objet d'un nouveau devis.", M+4, y+10);

    // ── Footer ──
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p);
      doc.setFillColor(15,23,42); doc.rect(0,285,W,12,'F');
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(71,85,105);
      doc.text(`CyberPanel SOC -- Devis ${devis.numero} -- ${devis.date}`, M, 291);
      doc.text(`Page ${p} / ${n}`, W-M, 291, { align:'right' });
    }

    doc.save(`devis-${devis.numero}-${devis.client}.pdf`);
    toast.success('Devis PDF téléchargé !', { id:'pdf' });
  } catch(err) {
    console.error('PDF error:', err);
    toast.error('Erreur PDF: ' + err.message, { id:'pdf' });
  }
}

// ── Sub-components ────────────────────────────────────────────
function ScoreGauge({ score, grade }) {
  const color = {A:'#22c55e',B:'#14b8a6',C:'#eab308',D:'#f97316',F:'#ef4444'}[grade]||'#6b7280';
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3"/>
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score} ${100-score}`} strokeLinecap="round"/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold font-mono ${GRADE_COLORS[grade]}`}>{grade}</span>
        <span className="text-[10px] text-gray-500 font-mono">{score}/100</span>
      </div>
    </div>
  );
}

function RecommendationCard({ rec, index }) {
  const [open, setOpen] = useState(index < 2);
  return (
    <div className={`rounded-lg border p-3 ${PRIO_COLORS[rec.priority]?.split(' ').slice(1).join(' ')||'bg-gray-800/30 border-gray-700/40'}`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setOpen(!open)}>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${PRIO_COLORS[rec.priority]}`}>{rec.priority}</span>
        <span className={`text-[10px] font-mono ${SEV_COLORS[rec.severity]||'text-gray-400'}`}>{rec.severity?.toUpperCase()}</span>
        <span className="text-xs font-medium text-gray-200 flex-1">{rec.title}</span>
        <span className="text-[10px] text-gray-500 font-mono">{rec.category}</span>
        {open?<ChevronUp className="w-3.5 h-3.5 text-gray-600"/>:<ChevronDown className="w-3.5 h-3.5 text-gray-600"/>}
      </div>
      {open && (
        <div className="mt-3 space-y-2 fade-in-up">
          <p className="text-xs text-gray-400">{rec.description}</p>
          {rec.fix && <div className="bg-gray-900/60 rounded p-3"><pre className="text-xs text-cyber-400 font-mono whitespace-pre-wrap">{rec.fix}</pre></div>}
        </div>
      )}
    </div>
  );
}

function DevisSection({ devis }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/40">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold font-mono text-cyber-400">{devis.numero}</span>
            <span className="text-[10px] text-gray-500 font-mono uppercase bg-gray-800/60 px-2 py-0.5 rounded">Devis de remédiation</span>
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">Émis le {devis.date} · Valable jusqu'au {devis.validite} · {devis.client}</div>
        </div>
        <button onClick={()=>generateDevisPDF(devis)} className="btn-primary">
          <Download className="w-4 h-4"/>Télécharger PDF
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/40 rounded-lg p-4 text-center border border-gray-700/30">
          <div className="text-xl font-bold font-mono text-white">{devis.total_ht} €</div>
          <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">Total HT</div>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-4 text-center border border-gray-700/30">
          <div className="text-xl font-bold font-mono text-gray-400">{devis.total_tva} €</div>
          <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">TVA 20%</div>
        </div>
        <div className="bg-cyber-900/30 rounded-lg p-4 text-center border border-cyber-700/40">
          <div className="text-2xl font-bold font-mono text-cyber-400">{devis.total_ttc} €</div>
          <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">Total TTC</div>
        </div>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800/40 text-[10px] font-mono text-gray-500 uppercase">
              <th className="px-3 py-2.5 text-left w-8">#</th>
              <th className="px-3 py-2.5 text-left w-16">Prio.</th>
              <th className="px-3 py-2.5 text-left">Prestation</th>
              <th className="px-3 py-2.5 text-left w-28">Catégorie</th>
              <th className="px-3 py-2.5 text-right w-16">HT</th>
              <th className="px-3 py-2.5 text-right w-16">TVA</th>
              <th className="px-3 py-2.5 text-right w-20">TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {devis.lignes.map((l,i)=>(
              <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                <td className="px-3 py-3 text-xs text-gray-500 font-mono">{l.numero}</td>
                <td className="px-3 py-3"><span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${PRIO_COLORS[l.priorite]}`}>{l.priorite}</span></td>
                <td className="px-3 py-3">
                  <div className="text-xs font-medium text-gray-200">{l.titre}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{l.description}</div>
                  {l.fix&&<div className="mt-1.5 bg-gray-900/60 rounded px-2 py-1.5"><pre className="text-[10px] text-cyber-500 font-mono whitespace-pre-wrap">{l.fix}</pre></div>}
                </td>
                <td className="px-3 py-3"><span className="text-[10px] font-mono text-cyber-700 bg-cyber-900/30 border border-cyber-800/30 px-1.5 py-0.5 rounded-full">{l.categorie}</span></td>
                <td className="px-3 py-3 text-right text-xs font-mono text-gray-300">{l.prix_ht} €</td>
                <td className="px-3 py-3 text-right text-xs font-mono text-gray-500">{l.tva} €</td>
                <td className="px-3 py-3 text-right text-xs font-mono font-bold text-white">{l.prix_ttc} €</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-800/30 border-t border-gray-700/60">
              <td colSpan="4" className="px-3 py-3 text-[10px] text-gray-600 font-mono italic">{devis.conditions}</td>
              <td className="px-3 py-3 text-right"><div className="text-[10px] text-gray-500 font-mono">HT</div><div className="text-sm font-bold font-mono text-gray-200">{devis.total_ht} €</div></td>
              <td className="px-3 py-3 text-right"><div className="text-[10px] text-gray-500 font-mono">TVA</div><div className="text-sm font-bold font-mono text-gray-400">{devis.total_tva} €</div></td>
              <td className="px-3 py-3 text-right"><div className="text-[10px] text-gray-500 font-mono">TTC</div><div className="text-lg font-bold font-mono text-cyber-400">{devis.total_ttc} €</div></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ScanResult({ result }) {
  const [section, setSection] = useState('overview');
  const TABS = ['overview','headers','ssl','techs','reputation','recommendations','devis'];
  return (
    <div className="glass-card overflow-hidden fade-in-up">
      <div className="p-5 border-b border-gray-800/60 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-cyber-400"/>{result.hostname}</h2>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">{result.url} · {formatDate(result.timestamp)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-center px-4 py-2 rounded-lg border ${GRADE_BG[result.grade]}`}>
            <div className={`text-2xl font-bold font-mono ${GRADE_COLORS[result.grade]}`}>{result.grade}</div>
            <div className="text-[10px] text-gray-500 font-mono">{result.score}/100</div>
          </div>
          {result.devis&&(
            <div className="text-center px-4 py-2 rounded-lg border border-cyber-700/40 bg-cyber-900/20 cursor-pointer" onClick={()=>setSection('devis')}>
              <div className="text-lg font-bold font-mono text-cyber-400">{result.devis.total_ttc} €</div>
              <div className="text-[10px] text-gray-500 font-mono">Devis TTC</div>
            </div>
          )}
        </div>
      </div>
      <div className="flex overflow-x-auto border-b border-gray-800/60 bg-gray-800/20">
        {TABS.map(t=>(
          <button key={t} onClick={()=>setSection(t)}
            className={`px-4 py-2.5 text-xs font-mono capitalize whitespace-nowrap transition-colors ${section===t?'text-cyber-400 border-b-2 border-cyber-400 bg-cyber-900/20':'text-gray-500 hover:text-gray-300'}`}>
            {t==='devis'?'💶 Devis':t}
            {t==='recommendations'&&result.recommendations?.length>0&&<span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{result.recommendations.length}</span>}
            {t==='devis'&&result.devis&&<span className="ml-1.5 bg-cyber-600 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{result.devis.total_ttc}€</span>}
          </button>
        ))}
      </div>
      <div className="p-5">
        {section==='overview'&&(
          <div className="space-y-5">
            <div className="flex items-center gap-6 flex-wrap">
              <ScoreGauge score={result.score} grade={result.grade}/>
              <div className="flex-1 space-y-3">
                {result.breakdown&&Object.entries(result.breakdown).map(([k,v])=>(
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 w-24 capitalize">{k}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${v>=20?'bg-green-500':v>=12?'bg-yellow-500':'bg-red-500'}`} style={{width:`${(v/25)*100}%`}}/>
                    </div>
                    <span className="text-xs font-mono text-gray-400 w-12 text-right">{v}/25</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {result.steps?.map((s,i)=>(
                <div key={i} className="flex items-center gap-3 text-xs">
                  {s.status==='done'&&<CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0"/>}
                  {s.status==='error'&&<XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>}
                  {s.status==='running'&&<Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse"/>}
                  <span className="text-gray-300 font-medium">{s.step}</span>
                  <span className="text-gray-600 font-mono">→ {s.data}</span>
                </div>
              ))}
            </div>
            {result.dns?.ips?.length>0&&(
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 font-mono uppercase mb-2">DNS</div>
                <div className="flex flex-wrap gap-2">{result.dns.ips.map((ip,i)=><span key={i} className="text-xs font-mono text-cyber-400 bg-cyber-900/20 px-2 py-0.5 rounded">{ip}</span>)}</div>
              </div>
            )}
          </div>
        )}
        {section==='headers'&&(
          <div className="space-y-1">
            <div className="flex justify-between mb-3">
              <span className="text-xs text-gray-500">{result.headers?.filter(h=>h.present).length||0}/{result.headers?.length||0} headers</span>
              <div className="flex gap-3 text-[10px] font-mono"><span className="text-green-400">✓ {result.headers?.filter(h=>h.present).length||0}</span><span className="text-red-400">✗ {result.headers?.filter(h=>!h.present).length||0}</span></div>
            </div>
            {result.headers?.map((h,i)=>(
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-800/40 last:border-0">
                {h.present?<CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0"/>:<XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>}
                <div className="flex-1 min-w-0"><div className="text-xs font-mono text-gray-300">{h.label}</div>{h.present&&h.value&&<div className="text-[10px] text-gray-600 truncate font-mono">{h.value}</div>}</div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${h.present?'text-green-400 bg-green-900/20':'text-red-400 bg-red-900/20'}`}>{h.present?'✓ Present':'✗ Missing'}</span>
              </div>
            ))}
          </div>
        )}
        {section==='ssl'&&(
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${result.ssl?.valid?'bg-green-900/20 border-green-800/30':'bg-red-900/20 border-red-800/30'}`}>
              {result.ssl?.valid?<CheckCircle className="w-6 h-6 text-green-400"/>:<XCircle className="w-6 h-6 text-red-400"/>}
              <div><div className={`text-sm font-semibold ${result.ssl?.valid?'text-green-400':'text-red-400'}`}>{result.ssl?.valid?'Valid SSL Certificate':`Invalid: ${result.ssl?.error}`}</div>{result.ssl?.valid&&<div className="text-xs text-gray-400">{result.ssl.subject} — {result.ssl.issuer}</div>}</div>
            </div>
            {result.ssl?.valid&&(
              <div className="grid grid-cols-2 gap-3">
                {[['Expiry',formatDate(result.ssl.expiry)],['Days Left',`${result.ssl.daysLeft} days`],['Protocol',result.ssl.protocol||'TLS'],['Status',result.ssl.expired?'❌ Expired':result.ssl.expiringSoon?'⚠️ Expiring Soon':'✅ Valid']].map(([l,v])=>(
                  <div key={l} className="bg-gray-800/40 rounded-lg p-3"><div className="text-[10px] text-gray-500 font-mono uppercase">{l}</div><div className="text-xs text-gray-200 mt-1 font-mono">{v}</div></div>
                ))}
              </div>
            )}
          </div>
        )}
        {section==='techs'&&(
          <div>{!result.technologies?.length?<p className="text-gray-600 font-mono text-sm">No technologies detected</p>:(<div className="flex flex-wrap gap-2">{result.technologies.map((t,i)=><div key={i} className="bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2"><div className="text-xs font-medium text-gray-200">{t.name}</div><div className="text-[10px] text-gray-500 font-mono capitalize">{t.category}</div></div>)}</div>)}</div>
        )}
        {section==='reputation'&&(
          <div>{result.reputation?.abuseipdb?(<div className={`p-4 rounded-lg border ${result.reputation.abuseipdb.abuseConfidenceScore>50?'bg-red-900/20 border-red-800/30':'bg-green-900/20 border-green-800/30'}`}><div className="text-sm font-semibold text-gray-200 mb-3">AbuseIPDB</div><div className="grid grid-cols-2 gap-3 text-xs font-mono">{[['IP',result.reputation.abuseipdb.ipAddress],['Score',`${result.reputation.abuseipdb.abuseConfidenceScore}%`],['Reports',result.reputation.abuseipdb.totalReports||0],['ISP',result.reputation.abuseipdb.isp||'—'],['Country',result.reputation.abuseipdb.countryCode||'—'],['Usage',result.reputation.abuseipdb.usageType||'—']].map(([l,v])=>(<div key={l}><span className="text-gray-500">{l}: </span><span className="text-gray-200">{v}</span></div>))}</div></div>):(<div className="text-center py-8"><Shield className="w-10 h-10 text-gray-700 mx-auto mb-2"/><p className="text-gray-500 font-mono text-sm">Add <code className="text-cyber-400">ABUSEIPDB_API_KEY</code> in Railway Variables</p></div>)}</div>
        )}
        {section==='recommendations'&&(
          <div className="space-y-3">{!result.recommendations?.length?(<div className="text-center py-8"><CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2"/><p className="text-green-400 font-mono">No issues found!</p></div>):(<><div className="flex gap-2 text-xs font-mono mb-3 flex-wrap">{['P1','P2','P3'].map(p=>{const c=result.recommendations.filter(r=>r.priority===p).length;return c?<span key={p} className={`px-2 py-0.5 rounded border ${PRIO_COLORS[p]}`}>{p}: {c}</span>:null;})}</div>{result.recommendations.map((rec,i)=><RecommendationCard key={i} rec={rec} index={i}/>)}</>)}</div>
        )}
        {section==='devis'&&(result.devis?<DevisSection devis={result.devis}/>:<div className="text-center py-8 text-gray-600 font-mono">No devis available</div>)}
      </div>
    </div>
  );
}

export default function ScannerPage() {
  const [url, setUrl]           = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult]     = useState(null);
  const [history, setHistory]   = useState([]);

  useEffect(()=>{ api.get('/scanner/history').then(r=>setHistory(r.data)).catch(()=>{}); },[]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setScanning(true); setResult(null);
    try {
      const {data} = await api.post('/scanner/scan',{url:url.trim()});
      setResult(data);
      setHistory(h=>[{id:Date.now(),url:data.url,score:data.score,grade:data.grade,created_at:data.timestamp},...h].slice(0,20));
      toast.success(`Grade ${data.grade} · Devis: ${data.devis?.total_ttc||0}€ TTC`);
    } catch(err){ toast.error(err.response?.data?.error||'Scan failed'); }
    finally{ setScanning(false); }
  };

  return (
    <div className="space-y-5">
      <div className="relative glass-card overflow-hidden border border-cyber-800/30">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyber-900/20 rounded-full blur-3xl"/>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl"/>
        </div>
        <div className="relative p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-900/60 border border-cyber-700/50 mb-4">
              <Shield className="w-8 h-8 text-cyber-400"/>
            </div>
            <h1 className="text-2xl font-bold text-white">Web Security Scanner</h1>
            <p className="text-gray-500 font-mono text-sm mt-1">Analyse complète · Score A–F · Devis PDF automatique</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {[{icon:Globe,label:'DNS & IPs'},{icon:Lock,label:'SSL/TLS'},{icon:AlertTriangle,label:'Security Headers'},{icon:Zap,label:'Technologies'},{icon:Shield,label:'IP Reputation'},{icon:CheckCircle,label:'Score A–F'},{icon:Download,label:'Devis PDF'}].map(({icon:Icon,label})=>(
              <div key={label} className="flex items-center gap-1.5 bg-gray-800/60 border border-gray-700/40 rounded-full px-3 py-1 text-[11px] font-mono text-gray-400">
                <Icon className="w-3 h-3 text-cyber-500"/>{label}
              </div>
            ))}
          </div>
          <form onSubmit={handleScan} className="flex gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"/>
              <input type="text" value={url} onChange={e=>setUrl(e.target.value)}
                placeholder="https://exemple.com ou exemple.com"
                className="w-full bg-gray-800/80 border border-gray-600/60 rounded-xl px-4 py-3.5 pl-12 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyber-500 focus:ring-2 focus:ring-cyber-500/20 transition-all text-sm font-mono"
                autoFocus/>
            </div>
            <button type="submit" disabled={scanning||!url.trim()}
              className="bg-cyber-600 hover:bg-cyber-500 disabled:opacity-50 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors flex items-center gap-2 text-sm whitespace-nowrap">
              {scanning?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span className="font-mono">Analyse...</span></>:<><Search className="w-4 h-4"/>Analyser</>}
            </button>
          </form>
        </div>
      </div>

      {scanning&&(
        <div className="glass-card p-10 text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-cyber-500/20 animate-ping"/>
            <div className="absolute inset-2 rounded-full border-2 border-cyber-400/30 animate-ping" style={{animationDelay:'0.3s'}}/>
            <div className="absolute inset-4 rounded-full border-2 border-cyber-300/40 animate-ping" style={{animationDelay:'0.6s'}}/>
            <Shield className="absolute inset-0 m-auto w-10 h-10 text-cyber-400 animate-pulse"/>
          </div>
          <p className="text-cyber-400 font-mono font-semibold">Analyse : {url}</p>
          <div className="flex flex-wrap justify-center gap-3 text-[10px] font-mono text-gray-600">
            {['DNS','SSL','Headers','Technologies','Reputation','Score','Devis PDF'].map(s=>(
              <span key={s} className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-cyber-500 rounded-full animate-pulse"/>{s}</span>
            ))}
          </div>
        </div>
      )}

      {result&&!scanning&&<ScanResult result={result}/>}

      {history.length>0&&(
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800/60 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyber-400"/>
            <span className="text-sm font-semibold text-gray-300">Historique</span>
            <span className="text-xs text-gray-600 font-mono ml-auto">{history.length} scans</span>
          </div>
          <div className="divide-y divide-gray-800/40">
            {history.map(scan=>(
              <div key={scan.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors">
                <div className={`text-base font-bold font-mono w-8 text-center ${GRADE_COLORS[scan.grade]}`}>{scan.grade}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{scan.url}</div>
                  <div className="text-[10px] text-gray-600 font-mono">{scan.score}/100 · {timeAgo(scan.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={async()=>{try{const{data}=await api.get(`/scanner/${scan.id}`);setResult(data.raw||data);}catch{toast.error('Failed');}}} className="text-gray-600 hover:text-cyber-400"><ExternalLink className="w-4 h-4"/></button>
                  <button onClick={async()=>{await api.delete(`/scanner/${scan.id}`);setHistory(h=>h.filter(x=>x.id!==scan.id));toast.success('Supprimé');}} className="text-gray-600 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
