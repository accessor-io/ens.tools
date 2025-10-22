export interface NotificationConfig {
  enabled: boolean;
  emailEnabled: boolean;
  webhookEnabled: boolean;
  emailAddress?: string;
  webhookUrl?: string;
  alertDuration: number;
  maxVisibleAlerts: number;
  alertPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  notifyOnExpiration: boolean;
  notifyOnSecurityEvents: boolean;
  notifyOnMetadataChanges: boolean;
  notifyOnFailedTransactions: boolean;
}

export interface AlertPayload {
  type: 'security' | 'expiration' | 'metadata' | 'transaction' | 'general';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  domain?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class NotificationService {
  private config: NotificationConfig = {
    enabled: true,
    emailEnabled: false,
    webhookEnabled: false,
    alertDuration: 15000,
    maxVisibleAlerts: 5,
    alertPosition: 'top-right',
    notifyOnExpiration: true,
    notifyOnSecurityEvents: true,
    notifyOnMetadataChanges: false,
    notifyOnFailedTransactions: true,
  };

  constructor() {
    try {
      this.loadConfig();
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem('notificationConfig');
      if (saved) {
        try {
          this.config = { ...this.config, ...JSON.parse(saved) };
        } catch (e) {
          console.error('Failed to parse notification config:', e);
        }
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }
  }

  saveConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
    localStorage.setItem('notificationConfig', JSON.stringify(this.config));
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  async sendNotification(payload: AlertPayload): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.config.emailEnabled && this.config.emailAddress) {
      await this.sendEmail(payload);
    }

    if (this.config.webhookEnabled && this.config.webhookUrl) {
      await this.sendWebhook(payload);
    }
  }

  private async sendEmail(payload: AlertPayload): Promise<void> {
    if (!this.config.emailAddress) return;

    const emailBody = {
      to: this.config.emailAddress,
      subject: `[${payload.severity.toUpperCase()}] ${payload.title}`,
      html: this.formatEmailHtml(payload),
      text: this.formatEmailText(payload),
    };

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailBody),
      });

      if (!response.ok) {
        console.error('Failed to send email notification');
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  private async sendWebhook(payload: AlertPayload): Promise<void> {
    if (!this.config.webhookUrl) return;

    const webhookPayload = {
      username: 'ENS Enterprise System',
      embeds: [
        {
          title: payload.title,
          description: payload.message,
          color: this.getSeverityColor(payload.severity),
          fields: [
            {
              name: 'Type',
              value: payload.type,
              inline: true,
            },
            {
              name: 'Severity',
              value: payload.severity,
              inline: true,
            },
            ...(payload.domain
              ? [
                  {
                    name: 'Domain',
                    value: payload.domain,
                    inline: true,
                  },
                ]
              : []),
            {
              name: 'Timestamp',
              value: new Date(payload.timestamp).toISOString(),
              inline: false,
            },
          ],
          ...(payload.metadata && Object.keys(payload.metadata).length > 0
            ? {
                fields: [
                  ...payload.metadata,
                  {
                    name: 'Metadata',
                    value: JSON.stringify(payload.metadata, null, 2),
                    inline: false,
                  },
                ],
              }
            : {}),
        },
      ],
    };

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        console.error('Failed to send webhook notification');
      }
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }

  private formatEmailHtml(payload: AlertPayload): string {
    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#f59e0b',
      low: '#3b82f6',
      info: '#10b981',
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${severityColors[payload.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
            .severity { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">${payload.title}</h1>
              <span class="severity" style="background-color: rgba(255,255,255,0.2); margin-top: 8px;">${payload.severity}</span>
            </div>
            <div class="content">
              <p style="margin-top: 0;">${payload.message}</p>
              ${payload.domain ? `<p><strong>Domain:</strong> ${payload.domain}</p>` : ''}
              ${payload.metadata && Object.keys(payload.metadata).length > 0 ? `
                <div style="background-color: white; padding: 12px; border-radius: 4px; margin-top: 16px;">
                  <pre style="margin: 0; font-size: 12px; white-space: pre-wrap;">${JSON.stringify(payload.metadata, null, 2)}</pre>
                </div>
              ` : ''}
              <div class="footer">
                <p>ENS Enterprise Management System</p>
                <p>Alert generated at: ${new Date(payload.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private formatEmailText(payload: AlertPayload): string {
    return `
${payload.title}
Severity: ${payload.severity.toUpperCase()}
Type: ${payload.type}

${payload.message}

${payload.domain ? `Domain: ${payload.domain}\n` : ''}
${payload.metadata && Object.keys(payload.metadata).length > 0 ? `\nMetadata:\n${JSON.stringify(payload.metadata, null, 2)}\n` : ''}

---
ENS Enterprise Management System
Alert generated at: ${new Date(payload.timestamp).toLocaleString()}
    `.trim();
  }

  private getSeverityColor(severity: AlertPayload['severity']): number {
    const colors = {
      critical: 0xdc2626,
      high: 0xea580c,
      medium: 0xf59e0b,
      low: 0x3b82f6,
      info: 0x10b981,
    };
    return colors[severity];
  }

  shouldNotifyForEvent(eventType: AlertPayload['type']): boolean {
    switch (eventType) {
      case 'expiration':
        return this.config.notifyOnExpiration;
      case 'security':
        return this.config.notifyOnSecurityEvents;
      case 'metadata':
        return this.config.notifyOnMetadataChanges;
      case 'transaction':
        return this.config.notifyOnFailedTransactions;
      default:
        return true;
    }
  }
}

export const notificationService = new NotificationService();

