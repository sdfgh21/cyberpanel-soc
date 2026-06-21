const express = require('express');
const axios   = require('axios');
const https   = require('https');
const dns     = require('dns').promises;
const { getDbProxy }     = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const db     = getDbProxy();

// ── Security Headers Check ────────────────────────────────────
const SECURITY_HEADERS = [
  { name:'strict-transport-security', label:'HSTS',                     weight:15 },
  { name:'content-security-policy',   label:'Content-Security-Policy',  weight:20 },
  { name:'x-frame-options',           label:'X-Frame-Options',          weight:10 },
  { name:'x-content-type-options',    label:'X-Content-Type-Options',   weight:10 },
  { name:'referrer-policy',           label:'Referrer-Policy',          weight:8  },
  { name:'permissions-policy',        label:'Permissions-Policy',       weight:7  },
  { name:'x-xss-protection',          label:'X-XSS-Protection',         weight:5  },
  { name:'cross-origin-opener-policy',label:'CORP',                     weight:5  },
];

// ── Technology fingerprinting from headers ────────────────────
function detectTech(headers, body='') {
  const techs = [];
  const h = JSON.stringify(headers).toLowerCase();
  const b = (body||'').toLowerCase();

  if (h.includes('nginx'))         techs.push({ name:'Nginx',         category:'server'  });
  if (h.includes('apache'))        techs.push({ name:'Apache',        category:'server'  });
  if (h.includes('iis'))           techs.push({ name:'IIS',           category:'server'  });
  if (h.includes('cloudflare'))    techs.push({ name:'Cloudflare',    category:'cdn'     });
  if (h.includes('x-powered-by'))  {
    const powered = headers['x-powered-by']||'';
    if (powered.toLowerCase().includes('php'))   techs.push({ name:`PHP (${powered})`,   category:'language' });
    if (powered.toLowerCase().includes('asp'))   techs.push({ name:`ASP.NET (${powered})`,category:'framework'});
    if (powered.toLowerCase().includes('express'))techs.push({ name:'Express.js',         category:'framework'});
  }
  if (b.includes('wp-content') || b.includes('wordpress')) techs.push({ name:'WordPress', category:'cms' });
  if (b.includes('drupal'))        techs.push({ name:'Drupal',        category:'cms'     });
  if (b.includes('joomla'))        techs.push({ name:'Joomla',        category:'cms'     });
  if (b.includes('react'))         techs.push({ name:'React',         category:'frontend'});
  if (b.includes('next.js') || b.includes('__next')) techs.push({ name:'Next.js', category:'framework' });
  if (b.includes('angular'))       techs.push({ name:'Angular',       category:'frontend'});
  if (b.includes('vue'))           techs.push({ name:'Vue.js',        category:'frontend'});
  if (h.includes('set-cookie') && (h.includes('phpsessid'))) techs.push({ name:'PHP Sessions', category:'language'});

  return techs;
}

// ── SSL Check ─────────────────────────────────────────────────
async function checkSSL(hostname) {
  return new Promise((resolve) => {
    const req = https.request({ host: hostname, port: 443, method: 'HEAD', rejectUnauthorized: false }, (res) => {
      const cert = res.socket.getPeerCertificate();
      if (!cert || !cert.valid_to) return resolve({ valid: false, error: 'No certificate' });
      const expiry   = new Date(cert.valid_to);
      const now      = new Date();
      const daysLeft = Math.ceil((expiry - now) / (1000*60*60*24));
      resolve({
        valid:     true,
        subject:   cert.subject?.CN || hostname,
        issuer:    cert.issuer?.O   || 'Unknown',
        expiry:    expiry.toISOString(),
        daysLeft,
        expired:   daysLeft <= 0,
        expiringSoon: daysLeft <= 30,
        protocol:  res.socket.getProtocol?.() || 'TLS',
      });
    });
    req.on('error', (e) => resolve({ valid: false, error: e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ valid: false, error: 'Timeout' }); });
    req.end();
  });
}

// ── Recommendations engine ────────────────────────────────────
function generateRecommendations(headers, ssl, techs, reputation) {
  const recs = [];

  // SSL recommendations
  if (!ssl.valid) {
    recs.push({ priority:'P1', severity:'critical', category:'SSL/TLS', title:'Invalid SSL Certificate', description:'The site has no valid SSL certificate', fix:'Install a valid SSL certificate using Let\'s Encrypt:\ncertbot --nginx -d yourdomain.com' });
  } else if (ssl.expired) {
    recs.push({ priority:'P1', severity:'critical', category:'SSL/TLS', title:'SSL Certificate Expired', description:`Certificate expired ${Math.abs(ssl.daysLeft)} days ago`, fix:'Renew immediately:\ncertbot renew --force-renewal' });
  } else if (ssl.expiringSoon) {
    recs.push({ priority:'P2', severity:'high', category:'SSL/TLS', title:`SSL Expires in ${ssl.daysLeft} Days`, description:'Certificate expiring soon may cause browser warnings', fix:`Renew certificate:\ncertbot renew` });
  }

  // Header recommendations
  const missingHeaders = SECURITY_HEADERS.filter(h => !headers[h.name]);
  for (const h of missingHeaders) {
    const fixes = {
      'strict-transport-security':  'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
      'content-security-policy':    'add_header Content-Security-Policy "default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\';" always;',
      'x-frame-options':            'add_header X-Frame-Options "DENY" always;',
      'x-content-type-options':     'add_header X-Content-Type-Options "nosniff" always;',
      'referrer-policy':            'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
      'permissions-policy':         'add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;',
      'x-xss-protection':           'add_header X-XSS-Protection "1; mode=block" always;',
      'cross-origin-opener-policy': 'add_header Cross-Origin-Opener-Policy "same-origin" always;',
    };
    const priority = h.weight >= 15 ? 'P1' : h.weight >= 8 ? 'P2' : 'P3';
    const severity  = h.weight >= 15 ? 'critical' : h.weight >= 8 ? 'high' : 'medium';
    recs.push({
      priority, severity, category: 'Security Headers',
      title:       `Missing ${h.label} header`,
      description: `The ${h.label} security header is not set, leaving the site vulnerable`,
      fix:         `Add to nginx.conf inside server {}:\n${fixes[h.name] || `add_header ${h.label} "value";`}`,
    });
  }

  // Tech-specific CVE hints
  const wp = techs.find(t => t.name === 'WordPress');
  if (wp) {
    recs.push({ priority:'P2', severity:'high', category:'CMS', title:'WordPress Detected', description:'WordPress installations require regular updates to avoid known CVEs', fix:'Update WordPress, themes and plugins:\nwp core update && wp plugin update --all' });
  }

  // Reputation
  if (reputation?.abuseipdb && reputation.abuseipdb.abuseConfidenceScore > 50) {
    recs.push({ priority:'P1', severity:'critical', category:'Reputation', title:'IP Flagged as Malicious', description:`AbuseIPDB confidence: ${reputation.abuseipdb.abuseConfidenceScore}%`, fix:'Investigate and mitigate abuse from this IP. Contact hosting provider.' });
  }

  return recs.sort((a,b) => a.priority.localeCompare(b.priority));
}

// ── Scoring ───────────────────────────────────────────────────
function calculateScore(headers, ssl, reputation, techs) {
  let score = 100;
  const breakdown = {};

  // SSL (25 pts)
  let sslScore = 25;
  if (!ssl.valid)       sslScore = 0;
  else if (ssl.expired) sslScore = 0;
  else if (ssl.expiringSoon) sslScore = 10;
  breakdown.ssl = sslScore;
  score -= (25 - sslScore);

  // Headers (50 pts)
  const maxHeaderScore = SECURITY_HEADERS.reduce((acc,h)=>acc+h.weight,0);
  let headerScore = 0;
  for (const h of SECURITY_HEADERS) {
    if (headers[h.name]) headerScore += h.weight;
  }
  breakdown.headers = Math.round((headerScore/maxHeaderScore)*50);
  score -= (50 - breakdown.headers);

  // Reputation (25 pts)
  let repScore = 25;
  if (reputation?.abuseipdb) {
    const conf = reputation.abuseipdb.abuseConfidenceScore || 0;
    repScore = Math.round(25 * (1 - conf/100));
  }
  breakdown.reputation = repScore;
  score -= (25 - repScore);

  score = Math.max(0, Math.min(100, score));
  const grade = score>=90?'A':score>=80?'B':score>=70?'C':score>=60?'D':'F';

  return { score, grade, breakdown };
}

// ── Main scan ─────────────────────────────────────────────────
async function scanWebsite(url, userId) {
  let parsedUrl;
  try {
    if (!url.startsWith('http')) url = 'https://' + url;
    parsedUrl = new URL(url);
  } catch { throw new Error('Invalid URL format'); }

  const hostname = parsedUrl.hostname;
  const result = { url, hostname, timestamp: new Date().toISOString(), steps: [] };

  // Step 1: DNS
  result.steps.push({ step: 'DNS Resolution', status: 'running' });
  try {
    const ips   = await dns.resolve4(hostname).catch(()=>[]);
    const ipv6  = await dns.resolve6(hostname).catch(()=>[]);
    result.dns  = { ips, ipv6, hostname };
    result.steps[0].status = 'done';
    result.steps[0].data   = `Resolved to ${[...ips,...ipv6].join(', ')||'N/A'}`;
  } catch (e) {
    result.dns = { error: e.message };
    result.steps[0].status = 'error';
  }

  // Step 2: HTTP Headers + Tech detection
  result.steps.push({ step: 'HTTP Headers & Technology', status: 'running' });
  let responseHeaders = {};
  let responseBody    = '';
  try {
    const resp = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': 'CyberPanel-Security-Scanner/2.1' },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });
    responseHeaders = {};
    Object.entries(resp.headers).forEach(([k,v]) => { responseHeaders[k.toLowerCase()] = v; });
    responseBody = typeof resp.data === 'string' ? resp.data.slice(0,5000) : '';
    result.httpStatus = resp.status;
    result.steps[1].status = 'done';
    result.steps[1].data   = `HTTP ${resp.status}`;
  } catch (e) {
    result.steps[1].status = 'error';
    result.steps[1].data   = e.message;
  }

  // Step 3: SSL
  result.steps.push({ step: 'SSL/TLS Certificate', status: 'running' });
  const ssl = parsedUrl.protocol === 'https:' ? await checkSSL(hostname) : { valid: false, error: 'Not HTTPS' };
  result.ssl = ssl;
  result.steps[2].status = 'done';
  result.steps[2].data   = ssl.valid ? `Valid · Expires in ${ssl.daysLeft} days` : `Invalid: ${ssl.error}`;

  // Step 4: Tech detection
  const techs = detectTech(responseHeaders, responseBody);
  result.technologies = techs;

  // Step 5: Security headers analysis
  result.steps.push({ step: 'Security Headers Analysis', status: 'running' });
  const headerResults = SECURITY_HEADERS.map(h => ({
    ...h, present: !!responseHeaders[h.name], value: responseHeaders[h.name] || null
  }));
  result.headers      = headerResults;
  result.steps[3].status = 'done';
  result.steps[3].data   = `${headerResults.filter(h=>h.present).length}/${headerResults.length} headers present`;

  // Step 6: Reputation check
  result.steps.push({ step: 'IP Reputation Check', status: 'running' });
  const reputation = {};
  const ip = result.dns?.ips?.[0];
  if (ip && process.env.ABUSEIPDB_API_KEY) {
    try {
      const { data } = await axios.get('https://api.abuseipdb.com/api/v2/check', {
        headers: { Key: process.env.ABUSEIPDB_API_KEY, Accept: 'application/json' },
        params:  { ipAddress: ip, maxAgeInDays: 90 },
        timeout: 8000,
      });
      reputation.abuseipdb = data.data;
    } catch { reputation.abuseipdb = null; }
  }
  result.reputation = reputation;
  result.steps[4].status = 'done';
  result.steps[4].data   = reputation.abuseipdb
    ? `Abuse confidence: ${reputation.abuseipdb.abuseConfidenceScore}%`
    : 'No API key configured';

  // Step 7: Score + Recommendations
  result.steps.push({ step: 'Security Score & Recommendations', status: 'running' });
  const { score, grade, breakdown } = calculateScore(responseHeaders, ssl, reputation, techs);
  const recommendations = generateRecommendations(responseHeaders, ssl, techs, reputation);
  result.score           = score;
  result.grade           = grade;
  result.breakdown       = breakdown;
  result.recommendations = recommendations;
  result.steps[5].status = 'done';
  result.steps[5].data   = `Score: ${score}/100 (Grade ${grade}) · ${recommendations.length} recommendations`;

  // Save to DB
  db.prepare('INSERT INTO scan_results (url,score,grade,ssl_info,headers,reputation,recommendations,raw,scanned_by) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(url, score, grade, JSON.stringify(ssl), JSON.stringify(headerResults), JSON.stringify(reputation),
      JSON.stringify(recommendations), JSON.stringify(result), userId||'system');

  return result;
}

// ── Routes ────────────────────────────────────────────────────
router.post('/scan', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url?.trim()) return res.status(400).json({ error: 'URL required' });
  try {
    const result = await scanWebsite(url.trim(), req.user.username);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history', authMiddleware, (req, res) => {
  const scans = db.prepare('SELECT id,url,score,grade,scanned_by,created_at FROM scan_results ORDER BY created_at DESC LIMIT 20').all();
  res.json(scans);
});

router.get('/:id', authMiddleware, (req, res) => {
  const scan = db.prepare('SELECT * FROM scan_results WHERE id=?').get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json({ ...scan, ssl_info: JSON.parse(scan.ssl_info||'{}'), headers: JSON.parse(scan.headers||'[]'),
    reputation: JSON.parse(scan.reputation||'{}'), recommendations: JSON.parse(scan.recommendations||'[]'), raw: JSON.parse(scan.raw||'{}') });
});

router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM scan_results WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
