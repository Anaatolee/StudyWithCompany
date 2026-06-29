import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Échappe le HTML pour éviter qu'un message utilisateur ne casse la mise en page
// (ou n'injecte du markup) dans l'email.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export async function sendModerationAlert(opts: {
  reportedUsername: string;
  reporterUsername: string;
  reason: string;
  description: string | null;
  lastMessages: { content: string; created_at: string }[] | null;
}) {
  const { reportedUsername, reporterUsername, reason, description, lastMessages } = opts;

  // Bloc « derniers messages » (ou note si aucun message capturé)
  const messagesHtml = lastMessages && lastMessages.length > 0
    ? lastMessages
        .map(
          (m) => `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eef1f4;color:#8a97a5;font-size:12px;white-space:nowrap;vertical-align:top;">
              ${formatDate(m.created_at)}
            </td>
            <td style="padding:6px 10px;border-bottom:1px solid #eef1f4;color:#19222e;font-size:13px;">
              ${escapeHtml(m.content)}
            </td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="padding:10px;color:#8a97a5;font-size:13px;font-style:italic;">
         Aucun message récent capturé pour cet utilisateur dans la salle.
       </td></tr>`;

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e9ef;border-radius:14px;overflow:hidden;">
    <div style="background:#2F7DC4;padding:18px 22px;">
      <span style="color:#ffffff;font-size:17px;font-weight:700;">🚩 Nouveau signalement</span>
    </div>
    <div style="padding:22px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        <tr>
          <td style="padding:6px 0;color:#5b6b7b;font-size:13px;width:140px;">Utilisateur signalé</td>
          <td style="padding:6px 0;color:#19222e;font-size:14px;font-weight:700;">@${escapeHtml(reportedUsername)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#5b6b7b;font-size:13px;">Signalé par</td>
          <td style="padding:6px 0;color:#19222e;font-size:14px;">@${escapeHtml(reporterUsername)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#5b6b7b;font-size:13px;">Motif</td>
          <td style="padding:6px 0;color:#19222e;font-size:14px;font-weight:600;">${escapeHtml(reason)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#5b6b7b;font-size:13px;vertical-align:top;">Détails</td>
          <td style="padding:6px 0;color:#19222e;font-size:14px;">${description ? escapeHtml(description) : "—"}</td>
        </tr>
      </table>

      <p style="color:#5b6b7b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;">
        Derniers messages de l'utilisateur signalé
      </p>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #eef1f4;border-radius:8px;">
        ${messagesHtml}
      </table>

      <p style="color:#8a97a5;font-size:12px;margin:18px 0 0;">
        Consulte la table <strong>reports</strong> dans Supabase pour l'historique complet.
      </p>
    </div>
  </div>`;

  const text =
    `Nouveau signalement\n` +
    `Utilisateur signalé : @${reportedUsername}\n` +
    `Signalé par : @${reporterUsername}\n` +
    `Motif : ${reason}\n` +
    `Détails : ${description ?? "—"}\n\n` +
    `Derniers messages :\n` +
    (lastMessages && lastMessages.length > 0
      ? lastMessages.map((m) => `  [${formatDate(m.created_at)}] ${m.content}`).join("\n")
      : "  (aucun message capturé)");

  await resend.emails.send({
    from: "StudyWithCompany <alertes@studywithcompany.com>",
    to: process.env.MODERATION_EMAIL!,
    subject: `🚩 Signalement : @${reportedUsername} — ${reason}`,
    html,
    text,
  });
}
