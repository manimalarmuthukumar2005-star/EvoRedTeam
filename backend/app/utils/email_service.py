import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def get_config() -> Dict[str, Any]:
        """Dynamically retrieves email and SMTP configuration from current environment."""
        smtp_host = os.getenv("SMTP_HOST", "").strip()
        smtp_port_raw = os.getenv("SMTP_PORT", "587").strip()
        try:
            smtp_port = int(smtp_port_raw)
        except (ValueError, TypeError):
            smtp_port = 587

        smtp_user = os.getenv("SMTP_USER", "").strip()
        smtp_password = os.getenv("SMTP_PASSWORD", os.getenv("SMTP_PASS", "")).strip()
        # If Gmail SMTP and password contains spaces (e.g. 'xxxx xxxx xxxx xxxx'), strip spaces
        if "gmail" in smtp_host.lower() and " " in smtp_password:
            smtp_password = smtp_password.replace(" ", "")

        smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
        smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes") or smtp_port == 465

        from_addr = os.getenv("EMAIL_FROM_ADDRESS", smtp_user or "no-reply@evoredteam.lab").strip()
        api_key = os.getenv("EMAIL_PROVIDER_API_KEY", "").strip()
        base_url = os.getenv("APP_BASE_URL", "http://localhost:5173").strip().rstrip("/")

        return {
            "smtp_host": smtp_host,
            "smtp_port": smtp_port,
            "smtp_user": smtp_user,
            "smtp_password": smtp_password,
            "smtp_use_tls": smtp_use_tls,
            "smtp_use_ssl": smtp_use_ssl,
            "email_from": from_addr,
            "api_key": api_key,
            "app_base_url": base_url
        }

    @staticmethod
    def is_configured() -> bool:
        """Checks if either a real SMTP server or an HTTP email provider is configured."""
        cfg = EmailService.get_config()
        has_smtp = bool(cfg["smtp_host"] and cfg["smtp_user"] and cfg["smtp_password"])
        has_api = bool(cfg["api_key"] and cfg["email_from"])
        return has_smtp or has_api

    @staticmethod
    async def send_password_reset_email(to_email: str, raw_token: str) -> Dict[str, Any]:
        """
        Dispatches a security-hardened password reset email with both HTML and plaintext bodies.
        Supports standard SMTP (STARTTLS/SSL) and REST API (Resend) providers.
        """
        cfg = EmailService.get_config()
        reset_link = f"{cfg['app_base_url']}/reset-password?token={raw_token}"
        subject = "EvoRedTeam Laboratory — Password Reset Verification"
        from_address = cfg["email_from"] or "no-reply@evoredteam.lab"
        
        plain_text = f"""Hello,

We received a request to reset your password for your EvoRedTeam Autonomous Safety Lab account.

Click the link below or copy it into your browser to set a new password (valid for 30 minutes):
{reset_link}

If you did not request a password reset, you can safely ignore this email — your account remains secure.

— The EvoRedTeam Safety Engineering Team
https://evoredteam.lab
"""

        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #070a09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #070a09; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #0d1418; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #1e293b; text-align: center;">
                            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: rgba(13, 148, 136, 0.15); border: 1px solid rgba(13, 148, 136, 0.4); border-radius: 12px; font-size: 20px; color: #14b8a6; margin-bottom: 12px;">
                                &#x1F512;
                            </div>
                            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em;">EvoRedTeam Laboratory</h1>
                            <p style="margin: 4px 0 0 0; font-size: 11px; font-family: monospace; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Autonomous Evolutionary Red-Teaming</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px;">
                            <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">Password Reset Request</h2>
                            <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                                We received a request to reset the password associated with <strong style="color: #14b8a6;">{to_email}</strong>. Click the verification button below to set a new password.
                            </p>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 28px 0;">
                                <a href="{reset_link}" style="display: inline-block; padding: 12px 28px; background-color: #0d9488; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; font-family: monospace; border-radius: 10px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);">
                                    RESET PASSWORD &rarr;
                                </a>
                            </div>

                            <p style="margin: 24px 0 0 0; font-size: 11px; font-family: monospace; color: #64748b; line-height: 1.5;">
                                This security link is single-use and will expire in <strong>30 minutes</strong>.<br>
                                If you did not make this request, you can safely disregard this message.
                            </p>
                            
                            <div style="margin-top: 20px; padding: 12px; background: #070a09; border: 1px solid #1e293b; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 10px; color: #64748b;">
                                Direct Link: <a href="{reset_link}" style="color: #14b8a6; text-decoration: none;">{reset_link}</a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 32px; background-color: #080c0e; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; font-family: monospace; color: #475569;">
                            EvoRedTeam Safety Engine &bull; Automated Security Delivery
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        # 1. Real SMTP Provider Delivery (Gmail, Outlook, SendGrid, Amazon SES, Mailgun, etc.)
        if cfg["smtp_host"] and cfg["smtp_user"] and cfg["smtp_password"]:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"EvoRedTeam Laboratory <{from_address}>"
                msg["To"] = to_email
                msg["Date"] = formatdate(localtime=True)
                msg["Message-ID"] = make_msgid(domain="evoredteam.lab")

                part1 = MIMEText(plain_text, "plain", "utf-8")
                part2 = MIMEText(html_body, "html", "utf-8")
                msg.attach(part1)
                msg.attach(part2)

                if cfg["smtp_use_ssl"]:
                    with smtplib.SMTP_SSL(cfg["smtp_host"], cfg["smtp_port"], timeout=12.0) as server:
                        server.login(cfg["smtp_user"], cfg["smtp_password"])
                        server.sendmail(from_address, [to_email], msg.as_string())
                else:
                    with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"], timeout=12.0) as server:
                        if cfg["smtp_use_tls"]:
                            server.starttls()
                        server.login(cfg["smtp_user"], cfg["smtp_password"])
                        server.sendmail(from_address, [to_email], msg.as_string())

                logger.info("Successfully sent password reset email via SMTP (%s:%d) to %s", cfg["smtp_host"], cfg["smtp_port"], to_email)
                return {
                    "sent": True,
                    "provider": "smtp",
                    "configured": True,
                    "reset_link": reset_link
                }
            except Exception as e:
                logger.error("SMTP delivery failed to %s: %s", to_email, e)

        # 2. Resend / HTTP REST Email API Provider Delivery
        if cfg["api_key"] and cfg["email_from"]:
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {cfg['api_key']}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "from": f"EvoRedTeam Laboratory <{from_address}>",
                            "to": [to_email],
                            "subject": subject,
                            "text": plain_text,
                            "html": html_body
                        }
                    )
                    if resp.status_code in (200, 201):
                        logger.info("Successfully sent password reset email via Resend to %s", to_email)
                        return {
                            "sent": True,
                            "provider": "resend",
                            "configured": True,
                            "reset_link": reset_link
                        }
                    else:
                        logger.warning("Resend provider returned HTTP %s: %s", resp.status_code, resp.text)
            except Exception as e:
                logger.error("HTTP email delivery failed: %s", e)

        # 3. Development / Local Fallback Console Simulator
        logger.info("\n=======================================================")
        logger.info("  [EVOREDTEAM TRANSACTIONAL EMAIL DISPATCH]")
        logger.info("  TO: %s", to_email)
        logger.info("  FROM: %s", from_address)
        logger.info("  SUBJECT: %s", subject)
        logger.info("  PASSWORD RESET LINK:")
        logger.info("  %s", reset_link)
        logger.info("=======================================================\n")

        return {
            "sent": True,
            "provider": "development_console",
            "configured": EmailService.is_configured(),
            "reset_link": reset_link,
            "note": "Email logged to server console (SMTP_HOST or EMAIL_PROVIDER_API_KEY not configured)."
        }
