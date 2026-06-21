const express = require('express');
const axios   = require('axios');
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();

function detectType(s) {
  if (/^[a-fA-F0-9]{32}$/.test(s)||/^[a-fA-F0-9]{40}$/.test(s)||/^[a-fA-F0-9]{64}$/.test(s)) return 'files';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return 'ip_addresses';
  if (/^https?:\/\//i.test(s)) return 'urls';
  if (/^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$/.test(s)) return 'domains';
  return null;
}

async function vtLookup(indicator) {
  const key  = process.env.VIRUSTOTAL_API_KEY;
  if (!key) return { error: 'VIRUSTOTAL_API_KEY not configured in Railway Variables' };
  const s    = indicator.trim();
  const type = detectType(s);
  if (!type) return { error: `Cannot detect type for "${s}". Use IP, domain, URL, or hash.` };
  let endpoint = type === 'urls'
    ? `urls/${Buffer.from(s).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')}`
    : `${type}/${encodeURIComponent(s)}`;
  try {
    const { data } = await axios.get(`https://www.virustotal.com/api/v3/${endpoint}`,
      { headers: { 'x-apikey': key }, timeout: 15000 });
    const attr  = data.data?.attributes || {};
    const stats = attr.last_analysis_stats || {};
    const result = {
      indicator: s,
      indicator_type: type==='ip_addresses'?'ip':type==='files'?'hash':type==='urls'?'url':'domain',
      malicious: stats.malicious||0, suspicious: stats.suspicious||0,
      undetected: stats.undetected||0, harmless: stats.harmless||0,
      reputation: attr.reputation||0, country: attr.country||null,
      owner: attr.as_owner||attr.registrar||null, tags: attr.tags||[],
    };
    const ex = db.prepare('SELECT id FROM vt_cache WHERE indicator=?').get(s);
    if (ex) {
      db.prepare('UPDATE vt_cache SET malicious=?,suspicious=?,undetected=?,harmless=?,reputation=?,country=?,owner=?,tags=?,queried_at=CURRENT_TIMESTAMP WHERE indicator=?')
        .run(result.malicious,result.suspicious,result.undetected,result.harmless,result.reputation,result.country,result.owner,JSON.stringify(result.tags),s);
    } else {
      db.prepare('INSERT INTO vt_cache (indicator,indicator_type,malicious,suspicious,undetected,harmless,reputation,country,owner,tags) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(s,result.indicator_type,result.malicious,result.suspicious,result.undetected,result.harmless,result.reputation,result.country,result.owner,JSON.stringify(result.tags));
    }
    return result;
  } catch (err) {
    if (err.response?.status===404) return { error: `Not found in VirusTotal: ${s}` };
    if (err.response?.status===401) return { error: 'Invalid VirusTotal API key' };
    if (err.response?.status===400) return { error: `Invalid format: "${s}"` };
    if (err.response?.status===429) return { error: 'Rate limit reached. Wait 1 minute.' };
    return { error: err.message };
  }
}

router.post('/scan', authMiddleware, async (req, res) => {
  const { indicator } = req.body;
  if (!indicator?.trim()) return res.status(400).json({ error: 'indicator required' });
  const result = await vtLookup(indicator.trim());
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

router.get('/history', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT id,indicator,indicator_type,malicious,suspicious,undetected,harmless,reputation,country,owner,tags,queried_at FROM vt_cache ORDER BY queried_at DESC LIMIT 50').all();
  res.json(rows.map(r => ({ ...r, tags: JSON.parse(r.tags||'[]') })));
});

module.exports = { router, vtLookup };
