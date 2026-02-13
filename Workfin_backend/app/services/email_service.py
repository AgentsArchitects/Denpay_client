"""
SendGrid Email Service
Handles sending invitation emails for WorkFin Admin, Client Admin, Practice Users, and Clinicians
Aligned with the comprehensive invitation system
"""
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SendGrid"""

    def __init__(self):
        self.api_key = settings.SENDGRID_API_KEY
        self.from_email = settings.SENDGRID_FROM_EMAIL
        self.from_name = settings.SENDGRID_FROM_NAME
        self.frontend_url = settings.FRONTEND_URL

    async def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        plain_text_content: str = None
    ) -> bool:
        """
        Send an email via SendGrid

        Args:
            to_email: Recipient email address
            to_name: Recipient name
            subject: Email subject
            html_content: HTML email content
            plain_text_content: Plain text fallback (optional)

        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            to = To(to_email, to_name)

            # Create Mail object
            if plain_text_content:
                mail = Mail(
                    from_email=Email(self.from_email, self.from_name),
                    to_emails=to,
                    subject=subject,
                    plain_text_content=Content("text/plain", plain_text_content),
                    html_content=Content("text/html", html_content)
                )
            else:
                mail = Mail(
                    from_email=Email(self.from_email, self.from_name),
                    to_emails=to,
                    subject=subject,
                    html_content=Content("text/html", html_content)
                )

            # Check if API key is configured
            if not self.api_key or self.api_key == "" or self.api_key == "your-sendgrid-api-key-here":
                logger.warning(f"SendGrid API key not configured. Email not sent to {to_email}")
                return False

            # Send email
            sg = SendGridAPIClient(self.api_key)
            response = sg.send(mail)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email to {to_email}. Status: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return False

    async def send_workfin_admin_invitation(
        self,
        to_email: str,
        to_name: str,
        invited_by_name: str,
        invitation_token: str
    ) -> bool:
        """
        Send invitation email to a new Workfin Admin

        Args:
            to_email: Recipient email address
            to_name: Full name of the invitee
            invited_by_name: Name of person who invited
            invitation_token: Unique invitation token

        Returns:
            True if email sent successfully, False otherwise
        """
        accept_url = f"{self.frontend_url}/auth/accept-invitation?token={invitation_token}&type=workfin_admin"

        subject = "Welcome to My WorkFin - Account Activation"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; }}
                .credentials-box {{
                    background-color: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .warning-box {{
                    background-color: #FEF3C7;
                    border-left: 4px solid #F59E0B;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4F46E5;
                    color: white !important;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 10px 0;
                    font-weight: bold;
                }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>My WorkFin</h1>
                </div>
                <div class="content">
                    <p><strong>Welcome to My WorkFin!</strong> We're excited to have you on board.</p>
                    <p>Your account has been successfully set up, and you can now access our platform using the following credentials:</p>

                    <div class="credentials-box">
                        <p style="margin: 5px 0;"><strong>Username:</strong> {to_email}</p>
                        <p style="margin: 5px 0;"><strong>Password generation/Account Activation Link:</strong></p>
                        <div style="text-align: center; margin-top: 15px;">
                            <a href="{accept_url}" class="button">Activate Account & Set Password</a>
                        </div>
                    </div>

                    <div class="warning-box">
                        <p style="margin: 0; color: #92400E;"><strong>IMPORTANT:</strong> This activation link will expire in <strong>24 hours</strong>. Please activate your account as soon as possible to avoid having to request a new invitation.</p>
                    </div>

                    <p>Please log in at <a href="https://app.workfin.co.uk" style="color: #4F46E5;">https://app.workfin.co.uk</a> and update your password to ensure the security of your account.</p>

                    <p>If you encounter any issues or have questions, feel free to reach out to our support team.</p>

                    <p>We look forward to helping you streamline your experience with My WorkFin!</p>

                    <p style="margin-top: 30px;"><strong>Customer Support Team</strong></p>
                </div>
                <div class="footer">
                    <p>© 2026 My WorkFin. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"""
Welcome to My WorkFin! We're excited to have you on board.

Your account has been successfully set up, and you can now access our platform using the following credentials:

Username: {to_email}
Password generation/Account Activation Link: {accept_url}

IMPORTANT: This activation link will expire in 24 hours. Please activate your account as soon as possible to avoid having to request a new invitation.

Please log in at https://app.workfin.co.uk and update your password to ensure the security of your account.

If you encounter any issues or have questions, feel free to reach out to our support team.

We look forward to helping you streamline your experience with My WorkFin!

Customer Support Team

---
© 2026 My WorkFin. All rights reserved.
        """

        return await self.send_email(to_email, to_name, subject, html_content, plain_text)

    async def send_client_admin_invitation(
        self,
        to_email: str,
        to_name: str,
        client_name: str,
        invited_by_name: str,
        invitation_token: str
    ) -> bool:
        """
        Send invitation email to a new Client Admin

        Args:
            to_email: Recipient email address
            to_name: Full name of the invitee
            client_name: Name of the client organization
            invited_by_name: Name of person who invited
            invitation_token: Unique invitation token

        Returns:
            True if email sent successfully, False otherwise
        """
        accept_url = f"{self.frontend_url}/auth/accept-invitation?token={invitation_token}&type=client_admin"

        subject = f"Welcome to Workfin Denpay - {client_name}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4F46E5;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .info-box {{ background-color: #e0e7ff; padding: 15px; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Workfin Denpay</h1>
                </div>
                <div class="content">
                    <h2>Welcome to Workfin Denpay!</h2>
                    <p>Hi {to_name},</p>
                    <p><strong>{invited_by_name}</strong> has set up your organization on Workfin Denpay and invited you to be the <strong>Client Administrator</strong> for <strong>{client_name}</strong>.</p>

                    <div class="info-box">
                        <h3>What you can do as Client Admin:</h3>
                        <ul>
                            <li>Manage practices and practice users</li>
                            <li>Onboard and manage clinicians</li>
                            <li>Configure integrations (Xero, PMS systems)</li>
                            <li>View financial reports and paysheets</li>
                            <li>Approve payments and operations</li>
                        </ul>
                    </div>

                    <p>Click the button below to accept your invitation and set up your account:</p>
                    <div style="text-align: center;">
                        <a href="{accept_url}" class="button">Accept Invitation & Set Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #4F46E5;">{accept_url}</p>
                    <p><em>This invitation will expire in 7 days.</em></p>
                </div>
                <div class="footer">
                    <p>© 2026 Workfin Denpay. All rights reserved.</p>
                    <p>Need help? Contact support@workfin.co.uk</p>
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"""
        Welcome to Workfin Denpay!

        Hi {to_name},

        {invited_by_name} has set up your organization on Workfin Denpay and invited you to be the Client Administrator for {client_name}.

        What you can do as Client Admin:
        - Manage practices and practice users
        - Onboard and manage clinicians
        - Configure integrations (Xero, PMS systems)
        - View financial reports and paysheets
        - Approve payments and operations

        Click the link below to accept your invitation and set up your account:
        {accept_url}

        This invitation will expire in 7 days.

        © 2026 Workfin Denpay. All rights reserved.
        Need help? Contact support@workfin.co.uk
        """

        return await self.send_email(to_email, to_name, subject, html_content, plain_text)

    async def send_practice_user_invitation(
        self,
        to_email: str,
        to_name: str,
        practice_name: str,
        role_type: str,
        invited_by_name: str,
        invitation_token: str
    ) -> bool:
        """
        Send invitation email to a new Practice User

        Args:
            to_email: Recipient email address
            to_name: Full name of the invitee
            practice_name: Name of the practice
            role_type: Role type (e.g., "Practice Manager", "Finance Operations")
            invited_by_name: Name of person who invited
            invitation_token: Unique invitation token

        Returns:
            True if email sent successfully, False otherwise
        """
        accept_url = f"{self.frontend_url}/auth/accept-invitation?token={invitation_token}&type=practice_user"

        # Format role type for display
        role_display = role_type.replace("_", " ").title()

        subject = f"Invitation to {practice_name} - Workfin Denpay"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4F46E5; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4F46E5;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .info-box {{ background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Workfin Denpay</h1>
                </div>
                <div class="content">
                    <h2>You've been invited to {practice_name}</h2>
                    <p>Hi {to_name},</p>
                    <p><strong>{invited_by_name}</strong> has invited you to join <strong>{practice_name}</strong> on Workfin Denpay as a <strong>{role_display}</strong>.</p>

                    <div class="info-box">
                        <p><strong>Your Role:</strong> {role_display}</p>
                        <p><strong>Practice:</strong> {practice_name}</p>
                    </div>

                    <p>Workfin Denpay helps you manage clinician payments, track working hours, and integrate with practice management systems seamlessly.</p>

                    <p>Click the button below to accept your invitation and create your account:</p>
                    <div style="text-align: center;">
                        <a href="{accept_url}" class="button">Accept Invitation</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #4F46E5;">{accept_url}</p>
                    <p><em>This invitation will expire in 7 days.</em></p>
                </div>
                <div class="footer">
                    <p>© 2026 Workfin Denpay. All rights reserved.</p>
                    <p>Need help? Contact support@workfin.co.uk</p>
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"""
        You've been invited to {practice_name}

        Hi {to_name},

        {invited_by_name} has invited you to join {practice_name} on Workfin Denpay as a {role_display}.

        Your Role: {role_display}
        Practice: {practice_name}

        Workfin Denpay helps you manage clinician payments, track working hours, and integrate with practice management systems seamlessly.

        Click the link below to accept your invitation and create your account:
        {accept_url}

        This invitation will expire in 7 days.

        © 2026 Workfin Denpay. All rights reserved.
        Need help? Contact support@workfin.co.uk
        """

        return await self.send_email(to_email, to_name, subject, html_content, plain_text)

    async def send_clinician_invitation(
        self,
        to_email: str,
        to_name: str,
        practice_names: list,
        invited_by_name: str,
        invitation_token: str
    ) -> bool:
        """
        Send invitation email to a new Clinician

        Args:
            to_email: Recipient email address
            to_name: Full name of the clinician
            practice_names: List of practice names the clinician is associated with
            invited_by_name: Name of person who invited
            invitation_token: Unique invitation token

        Returns:
            True if email sent successfully, False otherwise
        """
        accept_url = f"{self.frontend_url}/auth/accept-invitation?token={invitation_token}&type=clinician"

        # Format practice list
        if len(practice_names) == 1:
            practices_text = practice_names[0]
        elif len(practice_names) == 2:
            practices_text = f"{practice_names[0]} and {practice_names[1]}"
        else:
            practices_text = ", ".join(practice_names[:-1]) + f", and {practice_names[-1]}"

        subject = "Welcome to Workfin Denpay - Clinician Portal Access"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #10b981; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; }}
                .button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #10b981;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
                .info-box {{ background-color: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Workfin Denpay</h1>
                    <p>Clinician Portal</p>
                </div>
                <div class="content">
                    <h2>Welcome to Workfin Denpay!</h2>
                    <p>Hi {to_name},</p>
                    <p><strong>{invited_by_name}</strong> has set up your clinician profile on Workfin Denpay.</p>

                    <div class="info-box">
                        <p><strong>Your Practice(s):</strong> {practices_text}</p>
                    </div>

                    <h3>What you can do in the Clinician Portal:</h3>
                    <ul>
                        <li>View your paysheets and payment history</li>
                        <li>Track your working hours across practices</li>
                        <li>Review treatment summaries and billing</li>
                        <li>Update your personal information</li>
                        <li>Access tax and payment documents</li>
                    </ul>

                    <p>Click the button below to accept your invitation and set up your account:</p>
                    <div style="text-align: center;">
                        <a href="{accept_url}" class="button">Accept Invitation & Create Account</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #10b981;">{accept_url}</p>
                    <p><em>This invitation will expire in 7 days.</em></p>
                </div>
                <div class="footer">
                    <p>© 2026 Workfin Denpay. All rights reserved.</p>
                    <p>Need help? Contact support@workfin.co.uk</p>
                </div>
            </div>
        </body>
        </html>
        """

        plain_text = f"""
        Welcome to Workfin Denpay!

        Hi {to_name},

        {invited_by_name} has set up your clinician profile on Workfin Denpay.

        Your Practice(s): {practices_text}

        What you can do in the Clinician Portal:
        - View your paysheets and payment history
        - Track your working hours across practices
        - Review treatment summaries and billing
        - Update your personal information
        - Access tax and payment documents

        Click the link below to accept your invitation and set up your account:
        {accept_url}

        This invitation will expire in 7 days.

        © 2026 Workfin Denpay. All rights reserved.
        Need help? Contact support@workfin.co.uk
        """

        return await self.send_email(to_email, to_name, subject, html_content, plain_text)

    # Legacy method name for backward compatibility
    async def send_client_invitation(
        self,
        to_email: str,
        first_name: str,
        last_name: str,
        invitation_token: str,
        client_name: str,
        invited_by_name: str = "WorkFin Team"
    ) -> bool:
        """
        Legacy method - redirects to send_client_admin_invitation
        Kept for backward compatibility with existing code
        """
        to_name = f"{first_name} {last_name}"
        return await self.send_client_admin_invitation(
            to_email=to_email,
            to_name=to_name,
            client_name=client_name,
            invited_by_name=invited_by_name,
            invitation_token=invitation_token
        )


# Singleton instance
email_service = EmailService()
