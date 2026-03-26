# Email Configuration for BHU Clearance System

To enable email notifications, add the following environment variables to your `.env` file:

```bash
# Email Service Configuration
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=BHU Clearance <noreply@bhu.edu.et>

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

## Gmail Setup Instructions

1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account settings > Security > App passwords
3. Generate a new app password for "BHU Clearance"
4. Use the app password as EMAIL_PASS

## Alternative SMTP Providers

### Outlook/Hotmail
```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

### SendGrid
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=YOUR_SENDGRID_API_KEY
```

## Installation

Install the required dependency:

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## Email Templates

The system includes professional email templates for:

- ✅ Step Approval notifications
- ❌ Step Rejection notifications  
- 🎉 Clearance Complete notifications
- 🔄 Re-check Request notifications

Each template includes:
- Professional BHU branding
- Reference IDs
- Action buttons/links
- Mobile-responsive design
