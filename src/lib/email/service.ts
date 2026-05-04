/**
 * Email notification service
 * Sends alerts for batch status changes
 */

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface BatchStatusEmailData {
  to: string;
  batchId: string;
  drugName: string;
  oldStatus: string;
  newStatus: string;
  actor: string;
  timestamp: string;
  recipientName: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@meditrustchain.com';
    this.fromName = process.env.SMTP_FROM_NAME || 'MediTrustChain';
    
    if (this.isConfigured()) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  }

  isConfigured(): boolean {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    );
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      console.warn('Email service not configured, skipping email send');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendBatchStatusChangeEmail(data: BatchStatusEmailData): Promise<void> {
    const statusColors: Record<string, string> = {
      approved: '#10b981',
      rejected: '#ef4444',
      'in-transit': '#3b82f6',
      delivered: '#8b5cf6',
      recalled: '#dc2626',
    };

    const color = statusColors[data.newStatus.toLowerCase()] || '#6b7280';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #008080 0%, #00a0a0 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .status-badge { display: inline-block; padding: 8px 16px; background: ${color}; color: white; border-radius: 6px; font-weight: bold; margin: 10px 0; }
    .info-row { padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .info-label { font-weight: 600; color: #6b7280; }
    .info-value { color: #111827; margin-top: 4px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #008080; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔔 Batch Status Update</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">MediTrustChain Supply Chain Alert</p>
    </div>
    
    <div class="content">
      <p>Hello ${data.recipientName},</p>
      
      <p>A batch in the MediTrustChain supply chain has been updated:</p>
      
      <div class="info-row">
        <div class="info-label">Batch ID:</div>
        <div class="info-value"><strong>${data.batchId}</strong></div>
      </div>
      
      <div class="info-row">
        <div class="info-label">Drug Name:</div>
        <div class="info-value">${data.drugName}</div>
      </div>
      
      <div class="info-row">
        <div class="info-label">Previous Status:</div>
        <div class="info-value">${data.oldStatus}</div>
      </div>
      
      <div class="info-row">
        <div class="info-label">New Status:</div>
        <div class="info-value"><span class="status-badge">${data.newStatus}</span></div>
      </div>
      
      <div class="info-row">
        <div class="info-label">Updated By:</div>
        <div class="info-value">${data.actor}</div>
      </div>
      
      <div class="info-row">
        <div class="info-label">Timestamp:</div>
        <div class="info-value">${new Date(data.timestamp).toLocaleString()}</div>
      </div>
      
      <p style="margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard" class="button">
          View in Dashboard
        </a>
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from MediTrustChain.</p>
      <p>Blockchain-verified pharmaceutical supply chain tracking.</p>
      <p style="margin-top: 10px; font-size: 10px;">
        This transaction is recorded on the Ethereum blockchain and cannot be altered.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
MediTrustChain - Batch Status Update

Hello ${data.recipientName},

A batch has been updated:

Batch ID: ${data.batchId}
Drug Name: ${data.drugName}
Previous Status: ${data.oldStatus}
New Status: ${data.newStatus}
Updated By: ${data.actor}
Timestamp: ${new Date(data.timestamp).toLocaleString()}

View more details in your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard

---
This is an automated notification from MediTrustChain.
Blockchain-verified pharmaceutical supply chain tracking.
    `;

    await this.sendEmail({
      to: data.to,
      subject: `[MediTrustChain] Batch ${data.batchId} - Status Update: ${data.newStatus}`,
      html,
      text,
    });
  }
}

// Export singleton
export const emailService = new EmailService();
