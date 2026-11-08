# 🌙 Moon Gestion

Bot Discord de gestion en Node.js + Discord.js v14, avec préfixe `c`.

## Installation

- Node.js 20 ou supérieur
- `npm install`
- Définir `DISCORD_TOKEN` dans les variables secrètes de l'hébergeur (ne jamais publier le token)
- `npm start`

Active **Message Content Intent** et **Server Members Intent** dans le portail développeur Discord. Donne au bot uniquement les permissions nécessaires et place son rôle au-dessus des rôles qu'il doit gérer.

## Commandes prévues

`chelp`, `cping`, `cserver`, `cban`, `ckick`, `cmute`, `cunmute`, `cwarn`, `cwarns`, `cclear`, `cslowmode`, `csetlogs`, `csetwelcome`, `cautorole`, `cticketpanel`, `csecurity`, `cantiraid`, `cantinuke`, `cantispam`, `cantilinks`, `cwhitelist`, `clockdown`, `cunlock`, `cprefix`.

## Données et sécurité

Les réglages sont conservés dans `data/store.json`. Ce dossier est ignoré par Git : utilise un disque persistant et des sauvegardes sur l'hébergeur. Les protections automatiques ne garantissent pas une sécurité absolue. Teste-les d'abord sur un serveur privé. L'anti-nuke ne restaure pas les éléments supprimés.

**GitHub stocke le code mais n'exécute pas le bot.** Il faut un hébergeur séparé pour le faire fonctionner en continu. Un hébergement gratuit 24/7 n'est pas garanti.