# Email Notification System - Setup Guide

## 🎉 Implementation Complete!

The email notification system has been successfully implemented. Here's what was built:

### ✅ What's Included

1. **Supabase Integration** - Email storage and preferences management
2. **Email Templates** - Professional HTML emails for auction events
3. **API Routes** - Email sending via Resend
4. **Cron Job** - Automated blockchain event monitoring
5. **Settings UI** - User-friendly email preference management

---

## 📋 Setup Instructions

### Step 1: Set Up Supabase Database

1. Go to your Supabase project: https://lvjdxhlfuddrvhcxpjqr.supabase.co
2. Navigate to **SQL Editor**
3. Run the SQL script from `supabase-schema.sql`:

```bash
# The file is located at:
e:\zama\fhevm-template\frontend-next\supabase-schema.sql
```

This will create the `email_preferences` table.

### Step 2: Verify Environment Variables

Your `.env.local` file is already configured with:
- ✅ Supabase URL and API key
- ✅ Resend API key
- ✅ Cron secret

### Step 3: Test the System Locally

1. **Restart your dev server**:
```bash
cd e:\zama\fhevm-template\frontend-next
npm run dev
```

2. **Test email registration**:
   - Connect your wallet
   - Go to Settings → Notifications
   - Enter your email address
   - Toggle notification preferences
   - Click "Save Email"

3. **Verify in Supabase**:
   - Go to Supabase → Table Editor → `email_preferences`
   - You should see your wallet address and email

### Step 4: Test Email Sending (Manual)

You can manually trigger the cron job to test email sending:

```bash
curl http://localhost:3000/api/cron/check-events \
  -H "Authorization: Bearer fhe-auction-cron-secret-2024"
```

**Note**: This will only send emails if there are actual `AuctionEnded` events on the blockchain.

### Step 5: Deploy to Vercel

1. **Push your code to GitHub**
2. **Deploy to Vercel**
3. **Add environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)

4. **Vercel will automatically set up the cron job** based on `vercel.json`

---

## 🧪 Testing the Full Flow

### Test Scenario: Auction End Notification

1. **Create an auction** (as seller)
2. **Register your email** in Settings
3. **Place a bid** (as bidder, different wallet)
4. **Wait for auction to end** (or manually call `endAuction()`)
5. **Cron job runs** (within 60 seconds)
6. **Check your email** - You should receive:
   - Seller: "Your auction has ended"
   - Winner: "Congratulations! You won"
   - Other bidders: "Auction results available"

---

## 📧 Email Templates

Three email templates are included:

1. **Auction Ended (Seller)** - `auction_ended_seller`
2. **Winner Announcement** - `winner_announced`
3. **Auction Ended (Bidder)** - `auction_ended_bidder`

All emails include:
- FHE Auctions branding
- Auction details
- Call-to-action buttons
- Unsubscribe links

---

## 🔧 Troubleshooting

### Emails Not Sending?

1. **Check Resend Dashboard**: https://resend.com/emails
   - Verify API key is valid
   - Check email delivery status

2. **Check Cron Job Logs** (Vercel):
   - Go to Vercel → Deployments → Functions
   - Look for `/api/cron/check-events` logs

3. **Verify Supabase Connection**:
   - Check if email was saved in database
   - Verify notification preferences are enabled

### Cron Job Not Running?

1. **Local Development**: Cron jobs don't run automatically locally
   - Use manual trigger: `curl http://localhost:3000/api/cron/check-events -H "Authorization: Bearer fhe-auction-cron-secret-2024"`

2. **Production (Vercel)**: 
   - Cron jobs run automatically every minute
   - Check Vercel → Settings → Cron Jobs

### Database Errors?

1. **Run the SQL schema** in Supabase SQL Editor
2. **Check RLS policies** are enabled
3. **Verify API keys** in `.env.local`

---

## 📊 Monitoring

### Supabase Dashboard
- View all registered emails
- Check notification preferences
- Monitor database usage

### Resend Dashboard
- Track email delivery
- View bounce/spam rates
- Monitor API usage

### Vercel Logs
- Cron job execution logs
- API route errors
- Function invocations

---

## 🎯 Next Steps

1. **Customize email templates** in `lib/email-templates.ts`
2. **Add more notification types** (e.g., "Auction starting soon")
3. **Implement email verification** (optional)
4. **Add unsubscribe page** (optional)
5. **Set up custom domain** for Resend (for production)

---

## 🔐 Security Notes

- ✅ Email addresses are stored securely in Supabase
- ✅ Cron job requires secret token
- ✅ RLS policies protect user data
- ✅ Emails are never shared with third parties
- ✅ Users can delete their email anytime

---

## 📝 Files Created

- `lib/supabase.ts` - Supabase client and email functions
- `lib/email-templates.ts` - HTML email templates
- `app/api/send-notification/route.ts` - Email sending API
- `app/api/cron/check-events/route.ts` - Event monitoring cron job
- `supabase-schema.sql` - Database schema
- `vercel.json` - Cron job configuration
- `app/settings/page.tsx` - Updated with email UI

---

## 🚀 You're All Set!

The email notification system is ready to use. Just run the SQL schema in Supabase and you're good to go!

**Questions?** Check the implementation plan for more details.
