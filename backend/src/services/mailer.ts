import nodemailer from "nodemailer";

export interface SentMagicLinkRecord {
  toEmail: string;
  verifyUrl: string;
  rawToken: string;
  sentAt: number;
}

// Fila em memória dos últimos links enviados (útil para desenvolvimento local e testes automatizados)
export const lastSentMagicLinks: SentMagicLinkRecord[] = [];

export function resetMailerForTests(): void {
  lastSentMagicLinks.length = 0;
}

function getSiteUrl(): string {
  if (process.env.VITE_SITE_URL)
    return process.env.VITE_SITE_URL.replace(/\/$/, "");
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production")
    return "https://gabarito.sistema.pro.br";
  return "http://localhost:5173";
}

let transporter: nodemailer.Transporter | null = null;

function getMailTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

export interface SendMagicLinkOptions {
  toEmail: string;
  rawToken: string;
  targetRoute?: string;
}

export async function sendMagicLinkEmail(
  options: SendMagicLinkOptions,
): Promise<{ ok: boolean; verifyUrl: string }> {
  const { toEmail, rawToken, targetRoute } = options;
  const siteUrl = getSiteUrl();

  const queryParams = new URLSearchParams({ token: rawToken });
  if (targetRoute && targetRoute.startsWith("/")) {
    queryParams.set("redirect", targetRoute);
  }

  const verifyUrl = `${siteUrl}/auth/verify?${queryParams.toString()}`;

  // Sempre grava no buffer local para inspeção/dev/testes
  lastSentMagicLinks.unshift({
    toEmail,
    verifyUrl,
    rawToken,
    sentAt: Date.now(),
  });
  if (lastSentMagicLinks.length > 50) {
    lastSentMagicLinks.pop();
  }

  const textBody = `============================================================
  📝 GabaritoWEB — Correção Online de Provas
============================================================

Olá!

Você solicitou um link de acesso sem senha para entrar no GabaritoWEB
e visualizar seu histórico de gabaritos e submissões.

Para entrar instantaneamente na sua conta, acesse o link abaixo:

${verifyUrl}

------------------------------------------------------------
INFORMAÇÕES DE SEGURANÇA:
• Este link é de USO ÚNICO e expira automaticamente em 15 MINUTOS.
• Não compartilhe este link com outras pessoas.
• Se você não solicitou este acesso, ignore esta mensagem.
  Nenhuma alteração foi realizada na sua conta.
------------------------------------------------------------

© 2026 GabaritoWEB • Correção Inteligente de Provas
https://gabarito.sistema.pro.br`;

  const htmlBody = `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Seu link de acesso ao GabaritoWEB</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #020617;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      padding: 0;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    a {
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 16px !important;
      }
      .content-card {
        padding: 24px 20px !important;
      }
      .btn-primary {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; color: #f8fafc;">
  <!-- Wrapper Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #020617; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Email Container -->
        <table role="presentation" class="email-container" width="540" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; width: 100%;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #082f49; border: 1px solid #0369a1; border-radius: 12px; padding: 8px 12px; vertical-align: middle;">
                    <span style="font-size: 20px; line-height: 1;">📝</span>
                  </td>
                  <td style="padding-left: 10px; vertical-align: middle;">
                    <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #38bdf8;">Gabarito<span style="color: #ffffff;">WEB</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td class="content-card" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 36px 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);">
              
              <!-- Badge de Tempo -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #082f49; border: 1px solid #0284c7; border-radius: 9999px; padding: 4px 12px;">
                    <span style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ Válido por 15 minutos</span>
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.3;">
                Seu link de acesso
              </h1>

              <!-- Intro Text -->
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #94a3b8; line-height: 1.6;">
                Olá! Você solicitou acesso ao <strong style="color: #f1f5f9;">GabaritoWEB</strong>. Clique no botão abaixo para entrar de forma segura sem precisar de senha:
              </p>

              <!-- Action Button CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" target="_blank" class="btn-primary" style="display: block; width: 100%; text-align: center; box-sizing: border-box; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); background-color: #0284c7; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 15px 24px; border-radius: 12px; border: 1px solid #38bdf8; box-shadow: 0 4px 14px 0 rgba(2, 132, 199, 0.35);">
                      Entrar no GabaritoWEB &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link Fallback Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; margin-top: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #cbd5e1;">
                      Se o botão não funcionar, copie e cole este endereço:
                    </p>
                    <p style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; line-height: 1.5; word-break: break-all; color: #38bdf8;">
                      ${verifyUrl}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b;">
                <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                  🔒 <strong>Dica de Segurança:</strong> Este link é exclusivo para seu e-mail e só pode ser usado uma única vez. Se você não solicitou este acesso, ignore esta mensagem com segurança.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 28px; padding-bottom: 12px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #475569;">
                GabaritoWEB &bull; Correção online de provas ágil e descomplicada
              </p>
              <p style="margin: 0; font-size: 11px; color: #334155;">
                &copy; 2026 GabaritoWEB &bull; <a href="${siteUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">gabarito.sistema.pro.br</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // 1. Provedor Cloudflare Email Sending API (Prioritário)
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfApiToken = process.env.CLOUDFLARE_EMAIL_API_TOKEN;
  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS || "admin@notifications.sistema.pro.br";
  const fromName = process.env.EMAIL_FROM_NAME || "GabaritoWEB";
  const fromFormatted = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  if (cfAccountId && cfApiToken) {
    try {
      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/email/sending/send`;
      const response = await fetch(cfUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromFormatted,
          to: toEmail,
          subject: "Seu link de acesso ao GabaritoWEB",
          text: textBody,
          html: htmlBody,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error(
          "[GabaritoWEB Mailer] Erro Cloudflare Email Sending API:",
          errJson,
        );
        throw new Error(
          `Falha ao enviar e-mail via Cloudflare (${response.status}): ${JSON.stringify(errJson)}`,
        );
      }

      return { ok: true, verifyUrl };
    } catch (error) {
      console.error(
        "[GabaritoWEB Mailer] Falha ao enviar e-mail via Cloudflare API:",
        error,
      );
      throw error;
    }
  }

  // 2. Provedor SMTP legado (se configurado)
  const mailTransporter = getMailTransporter();
  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: fromFormatted,
        to: toEmail,
        subject: "Seu link de acesso ao GabaritoWEB",
        text: textBody,
        html: htmlBody,
      });
      return { ok: true, verifyUrl };
    } catch (error) {
      console.error(
        "[GabaritoWEB Mailer] Falha ao enviar e-mail via SMTP:",
        error,
      );
      throw error;
    }
  }

  // 3. Fallback: Ambiente de desenvolvimento ou sem credenciais
  console.log(`\n======================================================`);
  console.log(`[GabaritoWEB Mailer] Magic Link para: ${toEmail}`);
  console.log(`Link de acesso: ${verifyUrl}`);
  console.log(`Válido por 15 minutos.`);
  console.log(`======================================================\n`);

  return { ok: true, verifyUrl };
}
