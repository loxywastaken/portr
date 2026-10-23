# Info Panels — bot / API side

The dashboard's **Info Panels** tab (`/dashboard/:guildId/panels`) builds rules, staff rules,
role information and server information panels. It already works on its own (drafts are kept
in the browser, and **Copy JSON** gives a ready-to-post message), but to **Save** and
**Publish** from the dashboard and to post panels with slash commands, the NexusBot server
needs the additions below.

`src/lib/panels.ts` is plain TypeScript with no imports — copy it into the server
(e.g. `apps/server/src/services/panels.ts`) so the bot and the dashboard share the same
types, generator (`generatePanel`) and embed builder (`buildMessages`).

## REST endpoints

All routes sit behind the existing auth + "can manage this guild" middleware and CSRF check,
exactly like `/guilds/:guildId/autorole`.

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/api/guilds/:guildId/panels` | — | `{ panels: { [kind]: InfoPanel } }` |
| `PUT` | `/api/guilds/:guildId/panels/:kind` | `{ panel: InfoPanel }` | `{ panel: InfoPanel }` |
| `POST` | `/api/guilds/:guildId/panels/:kind/publish` | `{ channelId, panel, messages }` | `{ messageIds: string[] }` |
| `GET` | `/api/guilds/:guildId/roles?all=true` | — | `{ roles: RoleSummary[] }` — **every** role, not only the ones below the bot |

`kind` is one of `rules`, `staff-rules`, `roles`, `server-info`.

Until these exist the dashboard detects the `404` and falls back gracefully, so they can be
shipped in any order.

### Validation (zod)

- `kind` must be one of the four kinds.
- `panel.sections.length <= 25`, `items.length <= 50` per section, strings capped
  (title 256, description/body 4000, item text 1000).
- `channelId` must be a text channel in this guild where the bot can `SendMessages` and
  `EmbedLinks`.
- **Ignore the client's `messages`** and rebuild them with `buildMessages(panel)` on the
  server — never send client-provided payloads straight to Discord.

### Storage

A `Panel` collection: `{ guildId, kind, panel, lastPublished?: { channelId, messageIds[] }, updatedAt }`
with a unique index on `{ guildId, kind }`.

### Publish handler (sketch)

```ts
import { buildMessages } from '../services/panels';

export async function publishPanel(req: Request, res: Response) {
  const { guildId, kind } = req.params;
  const { channelId, panel } = publishSchema.parse(req.body);

  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased() || !('guildId' in channel) || channel.guildId !== guildId) {
    throw new HttpError(400, 'Pick a text channel in this server.');
  }

  const messageIds: string[] = [];
  for (const message of buildMessages({ ...panel, kind })) {
    // allowed_mentions.parse = [] — role mentions render but never ping.
    const sent = await channel.send({ embeds: message.embeds, allowedMentions: { parse: [] } });
    messageIds.push(sent.id);
  }

  await PanelModel.updateOne(
    { guildId, kind },
    { panel: { ...panel, kind }, lastPublished: { channelId, messageIds } },
    { upsert: true },
  );
  res.json({ messageIds });
}
```

## Slash commands

| Command | What it does |
| --- | --- |
| `/rules` | Shows the saved server rules (ephemeral), so members can read them anywhere. |
| `/staffrules` | Shows the staff rules (ephemeral). Requires `ManageMessages`. |
| `/roleinfo [role]` | Shows the role information panel, or just the entry for one role. |
| `/serverinfo-panel` | Shows the server information panel (keeps the existing `/serverinfo` untouched). |
| `/panel post <type> <channel>` | Posts a saved panel to a channel. Requires `ManageGuild`. |
| `/panel generate <type> [style] [tone]` | Generates a panel from the server's roles with `generatePanel`, saves it and posts a preview (ephemeral) with **Post here** / **Edit in dashboard** buttons. Requires `ManageGuild`. |
| `/panel update <type>` | Re-posts the panel by editing the last published messages in place (no new messages, no lost pins). |

`/roleinfo role:@Developer` looks the role up in the saved `roles` panel and replies with
just that entry — handy for "how do I get this role?" questions.

### Example: `/panel post`

```ts
export default {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post and manage info panels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('post')
        .setDescription('Post a saved panel')
        .addStringOption((o) =>
          o.setName('type').setDescription('Which panel').setRequired(true).addChoices(
            { name: 'Server rules', value: 'rules' },
            { name: 'Staff rules', value: 'staff-rules' },
            { name: 'Role information', value: 'roles' },
            { name: 'Server information', value: 'server-info' },
          ),
        )
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Where to post').addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction<'cached'>) {
    const kind = interaction.options.getString('type', true) as PanelKind;
    const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText]);
    const doc = await PanelModel.findOne({ guildId: interaction.guildId, kind });
    if (!doc) {
      return interaction.reply({ content: 'No saved panel yet — build one in the dashboard first.', ephemeral: true });
    }
    for (const message of buildMessages(doc.panel)) {
      await channel.send({ embeds: message.embeds, allowedMentions: { parse: [] } });
    }
    return interaction.reply({ content: `Posted to ${channel}.`, ephemeral: true });
  },
};
```

Remember to run `npm run deploy:commands` after adding the commands.
