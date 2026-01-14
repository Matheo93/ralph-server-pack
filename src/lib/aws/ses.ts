import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses"

// SES client configuration
const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION || process.env.AWS_REGION || "eu-west-1",
})

const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL || "noreply@familyload.app"
const APP_NAME = "FamilyLoad"

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html, text, replyTo } = options
  const toAddresses = Array.isArray(to) ? to : [to]

  try {
    const command = new SendEmailCommand({
      Source: `${APP_NAME} <${FROM_EMAIL}>`,
      Destination: {
        ToAddresses: toAddresses,
      },
      ReplyToAddresses: replyTo ? [replyTo] : undefined,
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
          ...(text && {
            Text: {
              Data: text,
              Charset: "UTF-8",
            },
          }),
        },
      },
    })

    await sesClient.send(command)
    return true
  } catch (error) {
    console.error("SES sendEmail error:", error)
    return false
  }
}

// Email wrapper with base template
export function wrapEmailTemplate(
  content: string,
  previewText?: string
): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${previewText ? `<meta name="x-apple-disable-message-reformatting">` : ""}
  <title>FamilyLoad</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f4f5;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background-color: #3b82f6;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: bold;
      margin: 0;
    }
    .content {
      padding: 24px;
    }
    .footer {
      padding: 16px 24px;
      background-color: #f9fafb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .task-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      margin: 8px 0;
    }
    .task-title {
      font-weight: 600;
      color: #111827;
    }
    .task-meta {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-critical {
      background-color: #fee2e2;
      color: #dc2626;
    }
    .badge-high {
      background-color: #ffedd5;
      color: #ea580c;
    }
    .stat {
      text-align: center;
      padding: 12px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #111827;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #18181b; }
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</div>` : ""}
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>FamilyLoad</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>Cet email a été envoyé par FamilyLoad.</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications" style="color: #3b82f6;">
            Gérer mes notifications
          </a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}
