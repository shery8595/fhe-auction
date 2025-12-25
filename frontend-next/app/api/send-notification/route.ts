import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { getEmailTemplate } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        const { to, type, data } = await request.json();

        if (!to || !type || !data) {
            return NextResponse.json(
                { error: 'Missing required fields: to, type, data' },
                { status: 400 }
            );
        }

        // Get email template
        const emailContent = getEmailTemplate(type, data);

        console.log(`[Email] Attempting to send ${type} email to ${to}`);
        console.log(`[Email] Subject: ${emailContent.subject}`);

        // Send email via Resend
        const { data: emailData, error } = await resend.emails.send({
            from: 'FHE Auctions <send@oriontelexim.com>',
            to,
            subject: emailContent.subject,
            html: emailContent.html,
        });

        if (error) {
            console.error('[Email] Resend API error:', JSON.stringify(error, null, 2));
            return NextResponse.json({ error }, { status: 400 });
        }

        console.log(`[Email] ✅ Successfully sent to ${to}`);
        return NextResponse.json({ success: true, data: emailData });
    } catch (error: any) {
        console.error('Send notification error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        );
    }
}
