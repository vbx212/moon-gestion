const { EmbedBuilder } = require("discord.js");
function embed(title, description, color = 0x8b5cf6) { return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description).setTimestamp(); }
function has(member, permission) { return Boolean(member && member.permissions && member.permissions.has(permission)); }
function parseDuration(input) { const m = /^(\\d+)(s|m|h|d)$/i.exec(input || ""); if (!m) return null; const ms = Number(m[1]) * ({s:1000,m:60000,h:3600000,d:86400000})[m[2].toLowerCase()]; return ms > 0 && ms <= 28 * 86400000 ? ms : null; }
async function log(guild, cfg, title, description, color = 0x64748b) { if (!cfg.logsChannelId) return; const ch = guild.channels.cache.get(cfg.logsChannelId); if (ch && ch.isTextBased()) await ch.send({ embeds: [embed(title, description, color)] }).catch(() => {}); }
module.exports = { embed, has, parseDuration, log };
