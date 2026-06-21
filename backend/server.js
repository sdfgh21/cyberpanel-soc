require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const cron        = require('node-cron');
const rateLimit   = require('express-rate-limit');

const { initDb } = require('./database');

const authRoutes                                      = require('./routes/auth');
const { router: newsRouter,   fetchAndCacheNews }     = require('./routes/news');
const { router: cvesRouter,   fetchRecentCVEs }       = require('./routes/cves');
const { router: kevRouter,    fetchKEV }              = require('./routes/kev');
const { router: alertsRouter }                        = require('./routes/alerts');
const { router: iocRouter,    fetchThreatFoxRecent }  = require('./routes/ioc');
const { router: vtRouter }                            = require('./routes/virustotal');
const { router: assetsRouter }                        = require('./routes/assets');
const { router: reportsRouter }                       = require('./routes/reports');
const { router: telegramRouter }                      = require('./routes/telegram');
const { rulesRouter, threatmapRouter }                = require('./routes/rules_threatmap');
const statsRouter                                     = require('./routes/stats');
const scannerRouter                                   = require('./routes/scanner');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 1000 }));

app.use('/api/auth',       authRoutes);
app.use('/api/news',       newsRouter);
app.use('/api/cves',       cvesRouter);
app.use('/api/kev',        kevRouter);
app.use('/api/alerts',     alertsRouter);
app.use('/api/ioc',        iocRouter);
app.use('/api/virustotal', vtRouter);
app.use('/api/assets',     assetsRouter);
app.use('/api/reports',    reportsRouter);
app.use('/api/telegram',   telegramRouter);
app.use('/api/rules',      rulesRouter);
app.use('/api/threatmap',  threatmapRouter);
app.use('/api/stats',      statsRouter);
app.use('/api/scanner',    scannerRouter);

app.get('/api/health', (req, res) =>
  res.json({ status:'ok', uptime:process.uptime(), timestamp:new Date().toISOString(), version:'2.1.0' })
);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: 'Internal server error' }); });

async function start() {
  await initDb();
  console.log('[INIT] Database ready');

  cron.schedule('*/30 * * * *', async () => { try { await fetchAndCacheNews(); }    catch(e) { console.error('[CRON]', e.message); } });
  cron.schedule('0 */2 * * *',  async () => { try { await fetchRecentCVEs(); }      catch(e) { console.error('[CRON]', e.message); } });
  cron.schedule('0 6 * * *',    async () => { try { await fetchKEV(); }             catch(e) { console.error('[CRON]', e.message); } });
  cron.schedule('0 */4 * * *',  async () => { try { await fetchThreatFoxRecent(); } catch(e) { console.error('[CRON]', e.message); } });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🛡️  CyberPanel v2.1 Backend → http://0.0.0.0:${PORT}`);
    console.log(`🔑  Login: admin / admin123\n`);
  });

  Promise.allSettled([fetchAndCacheNews(), fetchRecentCVEs(), fetchKEV(), fetchThreatFoxRecent()])
    .then(results => ['News','CVEs','KEV','IOC'].forEach((l,i) =>
      results[i].status==='fulfilled' ? console.log(`[INIT] ✓ ${l}`) : console.error(`[INIT] ✗ ${l}:`, results[i].reason?.message)
    ));
}

start().catch(err => { console.error('Fatal:', err); process.exit(1); });
