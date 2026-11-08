const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(process.cwd(), 'data');
const file = path.join(dir, 'store.json');
const defaults = () => ({ prefix: 'c', logsChannelId: null, welcomeChannelId: null, autoRoleId: null, antiRaid: true, antiNuke: true, antiSpam: true, antiLinks: false, lockdown: false, whitelist: [], joins: [], warnings: {}, spam: {}, nukeActions: {} });
let data = {};
function save() { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function load() { fs.mkdirSync(dir, { recursive: true }); try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { data = {}; } }
function getGuild(id) { data[id] = { ...defaults(), ...(data[id] || {}) }; return data[id]; }
function updateGuild(id, patch) { const cfg = getGuild(id); Object.assign(cfg, patch); save(); return cfg; }
function addWarning(guildId, userId, entry) { const cfg = getGuild(guildId); (cfg.warnings[userId] ||= []).push(entry); save(); return cfg.warnings[userId]; }
load();
module.exports = { getGuild, updateGuild, addWarning, save };
