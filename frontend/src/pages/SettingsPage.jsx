import React, { useState } from 'react';
import { Settings, Bell, User, Save, TestTube, Key, Database, Globe } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="glass-card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2 border-b border-gray-800/60 pb-3">
        <Icon className="w-4 h-4 text-cyber-400" /> {title}
      </h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [passwords, setPasswords]             = useState({ current:'', newPass:'', confirm:'' });
  const [saving, setSaving]                   = useState(false);
  const [testingDiscord, setTestingDiscord]   = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    if (passwords.newPass.length < 6)            { toast.error('Min 6 characters'); return; }
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: passwords.current, newPassword: passwords.newPass });
      toast.success('Password changed');
      setPasswords({ current:'', newPass:'', confirm:'' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const testDiscord = async () => {
    setTestingDiscord(true);
    try { await api.post('/alerts/test-discord'); toast.success('Discord test sent!'); }
    catch (err) { toast.error(err.response?.data?.error || 'Not configured'); }
    finally { setTestingDiscord(false); }
  };

  const testTelegram = async () => {
    setTestingTelegram(true);
    try { await api.post('/telegram/test'); toast.success('Telegram test sent!'); }
    catch (err) { toast.error(err.response?.data?.error || 'Not configured'); }
    finally { setTestingTelegram(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyber-400" /> Settings
        </h1>
        <p className="text-xs text-gray-500 font-mono mt-0.5">Configure your CyberPanel instance</p>
      </div>

      <Section icon={User} title="Account">
        <div className="grid grid-cols-2 gap-3">
          {[['USERNAME', user?.username], ['EMAIL', user?.email], ['ROLE', user?.role]].map(([label, val]) => (
            <div key={label}>
              <div className="text-xs text-gray-500 font-mono mb-1">{label}</div>
              <div className={label==='ROLE' ? 'text-cyber-400 font-mono text-xs uppercase' : 'text-sm text-gray-200'}>{val}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Key} title="Change Password">
        <form onSubmit={changePassword} className="space-y-3">
          {[['CURRENT PASSWORD','current'],['NEW PASSWORD','newPass'],['CONFIRM NEW','confirm']].map(([label,field]) => (
            <div key={field}>
              <label className="text-xs text-gray-400 font-mono mb-1 block">{label}</label>
              <input type="password" value={passwords[field]}
                onChange={e => setPasswords(p => ({...p,[field]:e.target.value}))}
                className="input-dark" required />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </Section>

      <Section icon={Globe} title="API Keys — Add in Railway Backend Variables">
        <div className="space-y-2 text-xs">
          {[
            ['VIRUSTOTAL_API_KEY',  'https://virustotal.com/gui/my-apikey',  'FREE'],
            ['ABUSEIPDB_API_KEY',   'https://abuseipdb.com/account/api',     'FREE'],
            ['TELEGRAM_BOT_TOKEN',  'https://t.me/BotFather',                'FREE'],
            ['TELEGRAM_CHAT_ID',    'From getUpdates API call',              ''],
            ['DISCORD_WEBHOOK_URL', 'Discord channel → Integrations',        'FREE'],
          ].map(([key, hint, badge]) => (
            <div key={key} className="flex items-center justify-between bg-gray-800/40 rounded-lg px-3 py-2">
              <div>
                <code className="text-cyber-400 text-[11px]">{key}</code>
                <div className="text-gray-600 text-[10px] mt-0.5">{hint}</div>
              </div>
              {badge && (
                <span className="text-[10px] text-green-500 font-mono bg-green-900/20 border border-green-800/30 px-2 py-0.5 rounded-full">{badge}</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Bell} title="Test Notifications">
        <div className="flex flex-wrap gap-3">
          <button onClick={testDiscord} disabled={testingDiscord} className="btn-ghost">
            <TestTube className="w-4 h-4" />{testingDiscord ? 'Sending...' : 'Test Discord'}
          </button>
          <button onClick={testTelegram} disabled={testingTelegram} className="btn-ghost">
            <TestTube className="w-4 h-4" />{testingTelegram ? 'Sending...' : 'Test Telegram'}
          </button>
        </div>
      </Section>

      <Section icon={Database} title="Data Sources & Refresh Schedule">
        <div className="space-y-1">
          {[
            ['BleepingComputer RSS',    'Every 30 min'],
            ['The Hacker News RSS',     'Every 30 min'],
            ['Dark Reading RSS',        'Every 30 min'],
            ['CISA Alerts RSS',         'Every 30 min'],
            ['Krebs on Security',       'Every 30 min'],
            ['Schneier on Security',    'Every 30 min'],
            ['NVD CVE API',             'Every 2 hours'],
            ['CISA KEV JSON',           'Daily 6:00 AM'],
            ['ThreatFox IOC Feed',      'Every 4 hours'],
            ['VirusTotal API',          'On demand'],
            ['AbuseIPDB API',           'On demand'],
          ].map(([name, interval]) => (
            <div key={name} className="flex items-center justify-between py-1.5 border-b border-gray-800/30 last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-gray-300">{name}</span>
              </div>
              <span className="text-[10px] text-gray-600 font-mono">{interval}</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="text-center text-xs text-gray-700 font-mono py-2">
        CyberPanel v2.1.0 — SOC Intelligence Platform
      </div>
    </div>
  );
}
