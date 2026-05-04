/**
 * Email Notification Service for Batch Recalls
 * Sends critical recall notifications to supply chain participants
 */

import nodemailer from 'nodemailer';
import { BatchRecall, RecallNotification } from '@/types/recall';

// SMTP Configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send recall notification email to a single recipient
 */
export async function sendRecallNotificationEmail(
  recall: BatchRecall,
  recipient: { name: string; email: string; type: string }
): Promise<boolean> {
  try {
    const subject = `🚨 URGENT: ${recall.recallClass} Product Recall - ${recall.batchName}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; }
            .alert-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
            .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin: 15px 0; }
            .info-label { font-weight: bold; }
            .action-required { background-color: #fff7ed; border: 2px solid #ea580c; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ PRODUCT RECALL NOTIFICATION</h1>
              <p style="margin: 0; font-size: 18px;">${recall.recallClass}</p>
            </div>

            <div class="content">
              <h2>Dear ${recipient.name},</h2>
              
              <div class="alert-box">
                <strong>IMMEDIATE ACTION REQUIRED</strong><br>
                This is an official notification of a product recall affecting pharmaceutical products you may have in your inventory or supply chain.
              </div>

              <h3>Recall Details</h3>
              <div class="info-grid">
                <div class="info-label">Recall ID:</div>
                <div>${recall.id}</div>
                
                <div class="info-label">Batch ID:</div>
                <div>${recall.batchId}</div>
                
                <div class="info-label">Product Name:</div>
                <div>${recall.batchName}</div>
                
                <div class="info-label">Manufacturer:</div>
                <div>${recall.manufacturer}</div>
                
                <div class="info-label">Classification:</div>
                <div><strong>${recall.recallClass}</strong></div>
                
                <div class="info-label">Date Initiated:</div>
                <div>${new Date(recall.recallDate).toLocaleDateString()}</div>
                
                <div class="info-label">Affected Lots:</div>
                <div>${recall.affectedLotNumbers.join(', ')}</div>
              </div>

              <h3>Reason for Recall</h3>
              <p>${recall.reason}</p>

              <h3>Health Hazard Evaluation</h3>
              <div class="alert-box">
                ${recall.healthHazard}
              </div>

              <div class="action-required">
                <h3 style="margin-top: 0;">REQUIRED ACTIONS</h3>
                <p><strong>Recommended Action:</strong> ${recall.recommendedAction}</p>
                <p><strong>Recall Strategy:</strong> ${recall.recallStrategy}</p>
                
                <ol>
                  <li>Immediately identify and segregate all affected products</li>
                  <li>Cease distribution of recalled products</li>
                  <li>Implement the recommended action (${recall.recommendedAction})</li>
                  <li>Document the quantity of affected products in your possession</li>
                  <li>Respond to this notification within 24 hours</li>
                  <li>Contact downstream customers if applicable</li>
                </ol>
              </div>

              <h3>How to Respond</h3>
              <p>Please log in to the MediTrustChain platform to:</p>
              <ul>
                <li>Acknowledge receipt of this notification</li>
                <li>Report units on hand</li>
                <li>Confirm action taken</li>
                <li>Upload disposal/return documentation</li>
              </ul>

              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard/recalls" class="button">
                Respond to Recall
              </a>

              <h3>Contact Information</h3>
              <p>
                For questions or assistance, please contact:<br>
                <strong>Email:</strong> ${process.env.SMTP_FROM_EMAIL}<br>
                <strong>Recall ID:</strong> ${recall.id}
              </p>

              ${recall.fdaNotified ? `
                <div class="alert-box">
                  <strong>FDA Notification:</strong> This recall has been reported to the FDA.
                  ${recall.recallNumber ? `FDA Recall Number: ${recall.recallNumber}` : ''}
                </div>
              ` : ''}
            </div>

            <div class="footer">
              <p>
                <strong>Important Notice:</strong> This is an official product recall notification. 
                Immediate action is required to ensure patient safety and regulatory compliance.
              </p>
              <p>
                This email was sent by MediTrustChain Pharmaceutical Supply Chain Management System.<br>
                Do not reply directly to this email. Use the platform to submit your response.
              </p>
              <p>
                © ${new Date().getFullYear()} MediTrustChain. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
URGENT: PRODUCT RECALL NOTIFICATION - ${recall.recallClass}

Recall ID: ${recall.id}
Batch ID: ${recall.batchId}
Product: ${recall.batchName}
Manufacturer: ${recall.manufacturer}
Classification: ${recall.recallClass}
Date: ${new Date(recall.recallDate).toLocaleDateString()}

REASON FOR RECALL:
${recall.reason}

HEALTH HAZARD:
${recall.healthHazard}

REQUIRED ACTION: ${recall.recommendedAction}

AFFECTED LOT NUMBERS: ${recall.affectedLotNumbers.join(', ')}

IMMEDIATE ACTIONS REQUIRED:
1. Immediately identify and segregate all affected products
2. Cease distribution of recalled products
3. Implement the recommended action
4. Document quantity of affected products
5. Respond within 24 hours
6. Contact downstream customers

Please log in to MediTrustChain to respond: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard/recalls

For assistance: ${process.env.SMTP_FROM_EMAIL}

---
This is an official recall notification. Immediate action required.
© ${new Date().getFullYear()} MediTrustChain
    `;

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'MediTrustChain Recalls'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipient.email,
      subject: subject,
      text: textBody,
      html: htmlBody,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    });

    console.log(`✅ Recall notification sent to ${recipient.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send recall notification to ${recipient.email}:`, error);
    return false;
  }
}

/**
 * Send bulk recall notifications to all participants
 */
export async function sendBulkRecallNotifications(
  recall: BatchRecall,
  recipients: Array<{ name: string; email: string; type: string }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const success = await sendRecallNotificationEmail(recall, recipient);
    if (success) {
      sent++;
    } else {
      failed++;
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed };
}

/**
 * Send recall acknowledgment confirmation
 */
export async function sendRecallAcknowledgmentEmail(
  notification: RecallNotification,
  recall: BatchRecall
): Promise<boolean> {
  try {
    const subject = `Recall Acknowledgment Received - ${recall.id}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Recall Acknowledgment Confirmed</h2>
            <p>Dear ${notification.recipientName},</p>
            <p>
              Thank you for acknowledging the recall notification for:
            </p>
            <ul>
              <li><strong>Recall ID:</strong> ${recall.id}</li>
              <li><strong>Batch:</strong> ${recall.batchId}</li>
              <li><strong>Product:</strong> ${recall.batchName}</li>
              <li><strong>Acknowledged:</strong> ${new Date(notification.acknowledgedAt!).toLocaleString()}</li>
            </ul>
            <p>
              Please complete the required actions and submit your response through the MediTrustChain platform.
            </p>
            <p>Best regards,<br>MediTrustChain Team</p>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'MediTrustChain'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: notification.recipientEmail,
      subject: subject,
      html: htmlBody,
    });

    return true;
  } catch (error) {
    console.error('Failed to send acknowledgment email:', error);
    return false;
  }
}

/**
 * Send recall completion notification
 */
export async function sendRecallCompletionEmail(
  recall: BatchRecall,
  recipients: Array<{ name: string; email: string }>
): Promise<boolean> {
  try {
    const subject = `Recall Completed - ${recall.id}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #22c55e; color: white; padding: 20px; text-align: center;">
              <h1>✅ Recall Successfully Completed</h1>
            </div>
            <div style="padding: 20px; background-color: #f9fafb; margin-top: 20px;">
              <h2>Recall Termination Notice</h2>
              <p><strong>Recall ID:</strong> ${recall.id}</p>
              <p><strong>Batch:</strong> ${recall.batchId}</p>
              <p><strong>Product:</strong> ${recall.batchName}</p>
              <p><strong>Completed:</strong> ${recall.completedAt ? new Date(recall.completedAt).toLocaleString() : 'N/A'}</p>
              
              <h3>Summary</h3>
              <ul>
                <li>Units Distributed: ${recall.unitsDistributed.toLocaleString()}</li>
                <li>Units Recovered: ${recall.unitsRecovered.toLocaleString()}</li>
                <li>Response Rate: ${recall.responseRate}%</li>
              </ul>
              
              <p>
                Thank you for your cooperation in this recall process. All required actions have been completed 
                and this recall has been officially terminated.
              </p>
              
              <p>Best regards,<br>MediTrustChain Recall Management Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    for (const recipient of recipients) {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'MediTrustChain'}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: recipient.email,
        subject: subject,
        html: htmlBody,
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to send completion email:', error);
    return false;
  }
}
