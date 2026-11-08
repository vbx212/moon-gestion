require("dotenv").config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField: P, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent } = require("discord.js");
const store = require("./store");
if (!process.env.DISCORD_TOKEN) { console.error("DISCORD_TOKEN manquant"); process.exit(1); }
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildModeration], partials: [Partials.Channel, Partials.Message] });
const makeEmbed = (title, desc, color) => new EmbedBuilder().setColor(color || 0x8b5cf6).setTitle(title).setDescription(desc).setTimestamp();
const has = (m, p) => m.memberPermissions && m.memberPermissions.has(p);
const reply = (m, title, desc, color) => m.reply({ embeds: [makeEmbed(title, desc, color)] }).catch(() => {});
const trusted = (g, c, id) => id === g.ownerId || c.whitelist.includes(id);
async function log(g, c, title, desc) { const ch = c.logsChannelId && g.channels.cache.get(c.logsChannelId); if (ch && ch.isTextBased()) await ch.send({ embeds: [makeEmbed(title, desc, 0x64748b)] }).catch(() => {}); }
async function lock(g, c, reason) { if (c.lockdown) return; store.updateGuild(g.id, { lockdown: true }); for (const ch of g.channels.cache.filter(x => x.type === ChannelType.GuildText).values()) await ch.permissionOverwrites.edit(g.roles.everyone, { SendMessages: false }, { reason }).catch(() => {}); await log(g, c, "🔒 Verrouillage activé", reason); }
async function unlock(g, c) { for (const ch of g.channels.cache.filter(x => x.type === ChannelType.GuildText).values()) await ch.permissionOverwrites.edit(g.roles.everyone, { SendMessages: null }).catch(() => {}); store.updateGuild(g.id, { lockdown: false }); await log(g, c, "🔓 Verrouillage désactivé", "Permissions @everyone remises à neutre. Vérifie les salons."); }

client.once("ready", () => { console.log("Moon Gestion connecté : " + client.user.tag); client.user.setActivity("c help | Moon Gestion"); });

client.on("guildMemberAdd", async member => {
  const c = store.getGuild(member.guild.id), now = Date.now();
  c.joins = c.joins.filter(t => now - t < 15000); c.joins.push(now); store.save();
  if (c.antiRaid && c.joins.length >= 8) await lock(member.guild, c, "Arrivées massives détectées en 15 secondes.");
  if (c.autoRoleId) { const role = member.guild.roles.cache.get(c.autoRoleId); if (role && role.position < member.guild.members.me.roles.highest.position) await member.roles.add(role).catch(() => {}); }
  if (c.welcomeChannelId) { const ch = member.guild.channels.cache.get(c.welcomeChannelId); if (ch && ch.isTextBased()) await ch.send({ embeds: [makeEmbed("🌙 Bienvenue !", "Bienvenue " + member + " sur **" + member.guild.name + "** ! Tu es notre " + member.guild.memberCount + "e membre.")] }).catch(() => {}); }
  await log(member.guild, c, "📥 Arrivée", member.user.tag);
});
client.on("guildMemberRemove", member => log(member.guild, store.getGuild(member.guild.id), "📤 Départ", member.user.tag));
client.on("messageDelete", msg => { if (msg.guild && !msg.author?.bot) log(msg.guild, store.getGuild(msg.guild.id), "🗑️ Message supprimé", "Auteur : " + (msg.author?.tag || "inconnu") + "\nSalon : " + msg.channel + "\nContenu : " + (msg.content || "indisponible").slice(0, 800)); });
client.on("messageUpdate", (oldMsg, newMsg) => { if (newMsg.guild && !newMsg.author?.bot && oldMsg.content !== newMsg.content) log(newMsg.guild, store.getGuild(newMsg.guild.id), "✏️ Message modifié", "Auteur : " + newMsg.author.tag + "\nAvant : " + (oldMsg.content || "").slice(0, 300) + "\nAprès : " + (newMsg.content || "").slice(0, 300)); });

client.on("messageCreate", async m => {
  if (!m.guild || m.author.bot) return;
  const c = store.getGuild(m.guild.id), prefix = c.prefix || "c";
  if (c.antiSpam) {
    const key = m.guild.id + ":" + m.author.id, now = Date.now();
    const recent = (c.spam[key] || []).filter(t => now - t < 6000); recent.push(now); c.spam[key] = recent; store.save();
    if (recent.length >= 6 && !trusted(m.guild, c, m.author.id) && !has(m, P.ManageMessages)) {
      await m.delete().catch(() => {}); if (m.member?.moderatable) await m.member.timeout(60000, "Anti-spam Moon Gestion").catch(() => {});
      await log(m.guild, c, "🚫 Anti-spam", m.author.tag + " a envoyé trop de messages rapidement."); return;
    }
  }
  if (c.antiLinks && /(https?:\/\/|discord\.gg\/)/i.test(m.content) && !has(m, P.ManageMessages) && !trusted(m.guild, c, m.author.id)) { await m.delete().catch(() => {}); return; }
  if (!m.content.toLowerCase().startsWith(prefix)) return;
  const a = m.content.slice(prefix.length).trim().split(/\s+/), cmd = (a.shift() || "").toLowerCase(), target = m.mentions.members.first();
  const admin = has(m, P.ManageGuild);
  try {
    switch (cmd) {
      case "help": case "aide":
        return reply(m, "🌙 Moon Gestion — Commandes", "Général : cping, cserver, cbotinfo, cprefix !\nModération : cban @membre, ckick @membre, cmute @membre 10m, cunmute @membre, cwarn @membre, cwarns @membre, cclear 20, cslowmode 5\nConfiguration : csetlogs #salon, csetwelcome #salon, cautorole @role\nSécurité : cantiraid on/off, cantinuke on/off, cantispam on/off, cantilinks on/off, cwhitelist add/remove @membre, csecurity, clockdown, cunlock\nTickets : cticketpanel");
      case "ping": return reply(m, "🏓 Pong", "Latence : " + client.ws.ping + " ms");
      case "server": return reply(m, "🏠 " + m.guild.name, "Membres : " + m.guild.memberCount + "\nSalons : " + m.guild.channels.cache.size);
      case "botinfo": return reply(m, "🤖 Moon Gestion", "Serveurs : " + client.guilds.cache.size + "\nDiscord.js : v14");
      case "prefix":
        if (!admin) return reply(m, "⛔ Refusé", "Permission Gérer le serveur requise.");
        if (!a[0] || a[0].length > 3) return reply(m, "Utilisation", "cprefix !");
        store.updateGuild(m.guild.id, { prefix: a[0] }); return reply(m, "✅ Préfixe changé", "Nouveau préfixe : " + a[0]);
      case "ban": case "kick":
        if (!has(m, cmd === "ban" ? P.BanMembers : P.KickMembers)) return reply(m, "⛔ Refusé", "Permission de modération manquante.");
        if (!target) return reply(m, "Utilisation", "c" + cmd + " @membre [raison]");
        if (target.id === m.author.id || target.id === m.guild.ownerId || (cmd === "ban" && !target.bannable) || (cmd === "kick" && !target.kickable)) return reply(m, "Action impossible", "Vérifie la hiérarchie des rôles.");
        if (cmd === "ban") await target.ban({ reason: a.slice(1).join(" ") || "Aucune raison" }); else await target.kick(a.slice(1).join(" ") || "Aucune raison");
        await log(m.guild, c, "Modération : " + cmd, target.user.tag + " par " + m.author.tag);
        return reply(m, "✅ " + cmd, target.user.tag);
      case "mute": {
        if (!has(m, P.ModerateMembers) || !target) return reply(m, "Utilisation", "cmute @membre 10m [raison]");
        const mt = /^(\d+)(s|m|h|d)$/i.exec(a[1] || ""); if (!mt) return reply(m, "Durée invalide", "Exemple : 10m, 2h, 1d.");
        const ms = Number(mt[1]) * ({s:1000,m:60000,h:3600000,d:86400000})[mt[2].toLowerCase()];
        if (ms < 1000 || ms > 28 * 86400000) return reply(m, "Durée invalide", "Maximum 28 jours.");
        await target.timeout(ms, a.slice(2).join(" ") || "Modération"); return reply(m, "🔇 Timeout", target.user.tag);
      }
      case "unmute":
        if (!has(m, P.ModerateMembers) || !target) return reply(m, "Utilisation", "cunmute @membre");
        await target.timeout(null); return reply(m, "🔊 Timeout retiré", target.user.tag);
      case "warn":
        if (!has(m, P.ModerateMembers) || !target) return reply(m, "Utilisation", "cwarn @membre [raison]");
        { const list = store.addWarning(m.guild.id, target.id, { reason: a.slice(1).join(" ") || "Aucune raison", by: m.author.id, date: Date.now() }); await log(m.guild, c, "⚠️ Avertissement", target.user.tag + " — " + list.length); return reply(m, "⚠️ Avertissement ajouté", target.user.tag + " en a " + list.length + "."); }
      case "warns":
        if (!target) return reply(m, "Utilisation", "cwarns @membre");
        { const list = c.warnings[target.id] || []; return reply(m, "📋 Avertissements", list.length ? list.map((w,i) => (i+1) + ". " + w.reason).join("\n") : "Aucun avertissement."); }
      case "clear": {
        if (!has(m, P.ManageMessages)) return reply(m, "⛔ Refusé", "Permission Gérer les messages requise.");
        const n = Number(a[0]); if (!Number.isInteger(n) || n < 1 || n > 99) return reply(m, "Utilisation", "cclear 20 (1 à 99)");
        const deleted = await m.channel.bulkDelete(n + 1, true); return reply(m, "🧹 Nettoyage", Math.max(0, deleted.size - 1) + " messages supprimés.");
      }
      case "slowmode": {
        if (!has(m, P.ManageChannels)) return reply(m, "⛔ Refusé", "Permission Gérer les salons requise.");
        const n = Number(a[0]); if (!Number.isInteger(n) || n < 0 || n > 21600) return reply(m, "Utilisation", "cslowmode 5");
        await m.channel.setRateLimitPerUser(n); return reply(m, "🐢 Slowmode", n + " seconde(s).");
      }
      case "setlogs": case "setwelcome":
        if (!admin) return reply(m, "⛔ Refusé", "Permission Gérer le serveur requise.");
        { const ch = m.mentions.channels.first(); if (!ch) return reply(m, "Utilisation", "c" + cmd + " #salon"); store.updateGuild(m.guild.id, { [cmd === "setlogs" ? "logsChannelId" : "welcomeChannelId"]: ch.id }); return reply(m, "✅ Configuration", "Salon défini : " + ch); }
      case "autorole":
        if (!admin || !m.mentions.roles.first()) return reply(m, "Utilisation", "cautorole @role");
        store.updateGuild(m.guild.id, { autoRoleId: m.mentions.roles.first().id }); return reply(m, "✅ Auto-rôle", "Rôle configuré : " + m.mentions.roles.first());
      case "antiraid": case "antinuke": case "antispam": case "antilinks": {
        if (!admin) return reply(m, "⛔ Refusé", "Permission Gérer le serveur requise.");
        if (!["on","off"].includes(a[0])) return reply(m, "Utilisation", "c" + cmd + " on|off");
        const key = {antiraid:"antiRaid",antinuke:"antiNuke",antispam:"antiSpam",antilinks:"antiLinks"}[cmd];
        store.updateGuild(m.guild.id, { [key]: a[0] === "on" }); return reply(m, "🛡️ Protection", key + " : " + a[0].toUpperCase());
      }
      case "security": return reply(m, "🛡️ Sécurité", "Anti-raid : " + c.antiRaid + "\nAnti-nuke : " + c.antiNuke + "\nAnti-spam : " + c.antiSpam + "\nAnti-liens : " + c.antiLinks);
      case "whitelist": {
        if (!admin || !["add","remove"].includes(a[0]) || !m.mentions.users.first()) return reply(m, "Utilisation", "cwhitelist add|remove @membre");
        const id = m.mentions.users.first().id, set = new Set(c.whitelist); a[0] === "add" ? set.add(id) : set.delete(id);
        store.updateGuild(m.guild.id, { whitelist: [...set] }); return reply(m, "✅ Whitelist", "Liste de confiance mise à jour.");
      }
      case "lockdown":
        if (!admin) return reply(m, "⛔ Refusé", "Permission Gérer le serveur requise.");
        await lock(m.guild, c, "Verrouillage manuel par " + m.author.tag); return reply(m, "🔒 Verrouillage", "Salons textuels verrouillés. Vérifie les permissions.");
      case "unlock":
        if (!admin) return reply(m, "⛔ Refusé", "Permission Gérer le serveur requise.");
        await unlock(m.guild, c); return reply(m, "🔓 Déverrouillage", "Vérifie les permissions des salons.");
      case "ticketpanel": {
        if (!admin) return reply(m, "⛔ Refusé", "Permission Gérer le serveur requise.");
        const menu = new StringSelectMenuBuilder().setCustomId("moon_ticket_type").setPlaceholder("Choisis le motif du ticket").addOptions(
          {label:"Support",value:"Support",emoji:"🛟"},{label:"Recrutement",value:"Recrutement",emoji:"👥"},
          {label:"Partenariat",value:"Partenariat",emoji:"🤝"},{label:"Signalement",value:"Signalement",emoji:"🚨"},
          {label:"Boutique",value:"Boutique",emoji:"🛒"},{label:"Autre",value:"Autre",emoji:"📩"}
        );
        await m.channel.send({ embeds:[makeEmbed("🎫 Centre de support","Choisis une catégorie dans le menu pour ouvrir un ticket privé.")], components:[new ActionRowBuilder().addComponents(menu)] });
        return reply(m, "✅ Panneau publié", "Le menu de tickets est en place.");
      }
      default: return;
    }
  } catch (err) { console.error(err); return reply(m, "❌ Erreur", "Vérifie les permissions du bot et la hiérarchie des rôles.", 0xef4444); }
});

client.on("interactionCreate", async i => {
  if (i.isStringSelectMenu() && i.customId === "moon_ticket_type") {
    const g = i.guild; if (!g) return;
    const old = g.channels.cache.find(ch => ch.topic === "moon-ticket:" + i.user.id);
    if (old) return i.reply({ content:"Tu as déjà un ticket : " + old, ephemeral:true });
    await i.deferReply({ ephemeral:true });
    try {
      const ch = await g.channels.create({
        name:"ticket-" + i.user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,70),
        type:ChannelType.GuildText, topic:"moon-ticket:" + i.user.id,
        permissionOverwrites:[
          {id:g.roles.everyone.id,deny:[P.ViewChannel]},
          {id:i.user.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.AttachFiles]},
          {id:client.user.id,allow:[P.ViewChannel,P.SendMessages,P.ManageChannels,P.ReadMessageHistory]}
        ]
      });
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("moon_ticket_close").setLabel("Fermer le ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger));
      await ch.send({content:String(i.user),embeds:[makeEmbed("🎫 Ticket — " + i.values[0],"Explique ta demande ici, le staff te répondra dès que possible.")],components:[row]});
      await i.editReply("Ticket créé : " + ch);
    } catch(e) { console.error(e); await i.editReply("Création impossible : vérifie la permission Gérer les salons."); }
  }
  if (i.isButton() && i.customId === "moon_ticket_close") {
    const ch = i.channel, owner = ch.topic && ch.topic.startsWith("moon-ticket:") ? ch.topic.split(":")[1] : null;
    if (!owner) return i.reply({content:"Ticket introuvable.",ephemeral:true});
    if (i.user.id !== owner && !i.memberPermissions.has(P.ManageChannels)) return i.reply({content:"Seul l'auteur ou le staff peut fermer ce ticket.",ephemeral:true});
    await i.reply("Ticket fermé. Suppression dans 5 secondes."); setTimeout(() => ch.delete("Ticket fermé").catch(() => {}), 5000);
  }
});

client.on("guildAuditLogEntryCreate", async (entry, g) => {
  const c = store.getGuild(g.id);
  if (!c.antiNuke || !entry.executorId || trusted(g,c,entry.executorId)) return;
  const watched = [AuditLogEvent.ChannelDelete,AuditLogEvent.RoleDelete,AuditLogEvent.MemberBanAdd,AuditLogEvent.WebhookCreate,AuditLogEvent.WebhookDelete,AuditLogEvent.BotAdd];
  if (!watched.includes(entry.action)) return;
  const key = entry.executorId + ":" + entry.action, now = Date.now();
  const recent = (c.nukeActions[key] || []).filter(t => now - t < 10000); recent.push(now); c.nukeActions[key] = recent; store.save();
  await log(g,c,"🚨 Anti-nuke","Action sensible : " + entry.action + " par <@" + entry.executorId + "> (" + recent.length + " en 10 secondes).");
  if (recent.length >= 3) { const member = await g.members.fetch(entry.executorId).catch(() => null); if (member?.moderatable) await member.timeout(3600000,"Moon Gestion : actions sensibles répétées").catch(() => {}); }
});
client.on("error", console.error);
process.on("unhandledRejection", console.error);
client.login(process.env.DISCORD_TOKEN);


// MOON_STATUS_SERVER — petite page web + endpoint pour le contrôle externe
const http = require("node:http");
const statusServer = http.createServer((req, res) => {
  const path = (req.url || "/").split("?")[0];
  const online = client.isReady();
  const status = {
    name: "Moon Gestion",
    status: online ? "online" : "starting",
    botOnline: online,
    botTag: online ? client.user.tag : null,
    servers: online ? client.guilds.cache.size : 0,
    uptimeSeconds: Math.floor(process.uptime())
  };

  if (path === "/health" || path === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    return res.end(JSON.stringify(status));
  }

  if (path !== "/") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Page introuvable");
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Moon Gestion — Statut</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#30205a,#0b0b12 60%);color:#f5f3ff;font-family:Arial,sans-serif}.card{width:min(100%,520px);padding:34px;border:1px solid #ffffff20;border-radius:24px;background:#171522eF;box-shadow:0 20px 70px #0008;text-align:center}.moon{font-size:48px}.tag{color:#b9a5ff;font-size:12px;letter-spacing:3px;text-transform:uppercase}.state{display:inline-flex;align-items:center;gap:9px;margin:22px 0;padding:10px 16px;border-radius:30px;background:#ffffff12}.dot{width:9px;height:9px;border-radius:50%;background:#fbbf24}.online .dot{background:#34d399;box-shadow:0 0 12px #34d399}.offline .dot{background:#f87171}h1{margin:10px 0;font-size:30px}.muted{color:#aaa6ba;line-height:1.6}.stats{display:flex;justify-content:center;gap:12px;margin-top:24px}.stat{flex:1;padding:15px;border-radius:14px;background:#ffffff0c}.num{font-size:23px;font-weight:bold}.label{margin-top:5px;color:#aaa6ba;font-size:12px}.foot{margin-top:25px;color:#777286;font-size:12px}
</style>
</head>
<body><main class="card">
<div class="moon">🌙</div><div class="tag">Moon Community</div><h1>Moon Gestion</h1>
<div id="state" class="state"><span class="dot"></span><strong id="stateText">Vérification...</strong></div>
<p class="muted" id="message">État du bot Discord en cours de vérification.</p>
<div class="stats"><div class="stat"><div class="num" id="servers">—</div><div class="label">Serveurs</div></div><div class="stat"><div class="num" id="uptime">—</div><div class="label">Temps actif</div></div></div>
<div class="foot">Actualisation automatique • Moon Gestion</div>
</main>
<script>
async function refresh(){try{const r=await fetch('/api/status',{cache:'no-store'});const d=await r.json();const box=document.getElementById('state');box.className='state '+(d.botOnline?'online':'offline');document.getElementById('stateText').textContent=d.botOnline?'Bot en ligne':'Bot en démarrage';document.getElementById('message').textContent=d.botOnline?'Moon Gestion est connecté à Discord.':'Le site répond, le bot se connecte à Discord.';document.getElementById('servers').textContent=d.servers;const s=d.uptimeSeconds;document.getElementById('uptime').textContent=s>=3600?Math.floor(s/3600)+' h':Math.floor(s/60)+' min';}catch(e){document.getElementById('state').className='state offline';document.getElementById('stateText').textContent='Statut indisponible';document.getElementById('message').textContent='Impossible de récupérer le statut pour le moment.';}}
refresh();setInterval(refresh,30000);
</script></body></html>`);
});
statusServer.listen(Number(process.env.PORT) || 10000, "0.0.0.0", () => {
  console.log("Page de statut Moon Gestion disponible sur le port " + (process.env.PORT || 10000));
});
