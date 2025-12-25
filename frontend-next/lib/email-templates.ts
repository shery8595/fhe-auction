interface EmailTemplateData {
    auctionTitle: string;
    auctionAddress: string;
    auctionType?: string;
    winnerAddress?: string;
    winningBid?: string;
    bidCount?: number;
    endTime?: string;
}

export function getAuctionEndedSellerEmail(data: EmailTemplateData) {
    return {
        subject: `Your auction "${data.auctionTitle}" has ended`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auction Ended</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #333;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-block; background-color: #f59e0b; padding: 12px; border-radius: 12px; margin-bottom: 20px;">
                <span style="font-size: 24px;">🔨</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">Auction Ended</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0; margin: 0 0 24px;">
                Your auction <strong style="color: #ffffff;">"${data.auctionTitle}"</strong> has ended successfully!
              </p>
              
              <!-- Auction Details Box -->
              <div style="background-color: #0a0a0a; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Auction Type</td>
                    <td style="color: #ffffff; font-weight: 600; text-align: right;">${data.auctionType || 'FHE Auction'}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total Bids</td>
                    <td style="color: #f59e0b; font-weight: 600; text-align: right;">${data.bidCount || 0}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Contract</td>
                    <td style="color: #ffffff; font-family: monospace; font-size: 11px; text-align: right;">${data.auctionAddress.slice(0, 10)}...${data.auctionAddress.slice(-8)}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0; margin: 0 0 24px;">
                The winner will be revealed once you call the <code style="background-color: #0a0a0a; padding: 2px 6px; border-radius: 4px; color: #f59e0b;">revealWinner()</code> function on the auction contract.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://your-app.vercel.app/auction/${data.auctionAddress}" style="display: inline-block; background-color: #f59e0b; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      View Auction & Reveal Winner
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #333; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666;">
                FHE Auctions - Powered by Fully Homomorphic Encryption
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #555;">
                <a href="https://your-app.vercel.app/settings" style="color: #666; text-decoration: underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    };
}

export function getWinnerAnnouncementEmail(data: EmailTemplateData) {
    return {
        subject: `🎉 Congratulations! You won "${data.auctionTitle}"`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You Won!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #10b981;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b98120 0%, transparent 100%); border-radius: 16px 16px 0 0;">
              <div style="display: inline-block; background-color: #10b981; padding: 12px; border-radius: 12px; margin-bottom: 20px;">
                <span style="font-size: 32px;">🏆</span>
              </div>
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #10b981;">Congratulations!</h1>
              <p style="margin: 8px 0 0; font-size: 18px; color: #a0a0a0;">You won the auction!</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0; margin: 0 0 24px;">
                You are the winning bidder for <strong style="color: #ffffff;">"${data.auctionTitle}"</strong>
              </p>
              
              <!-- Winner Details Box -->
              <div style="background-color: #10b98110; border: 1px solid #10b98130; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Winning Bid</td>
                    <td style="color: #10b981; font-weight: bold; font-size: 20px; text-align: right;">${data.winningBid || 'TBD'}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Auction Type</td>
                    <td style="color: #ffffff; font-weight: 600; text-align: right;">${data.auctionType || 'FHE Auction'}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Contract</td>
                    <td style="color: #ffffff; font-family: monospace; font-size: 11px; text-align: right;">${data.auctionAddress.slice(0, 10)}...${data.auctionAddress.slice(-8)}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #0a0a0a; border-left: 3px solid #10b981; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #a0a0a0; line-height: 1.6;">
                  <strong style="color: #10b981;">Next Steps:</strong><br>
                  Visit the auction page to complete the transaction and claim your item.
                </p>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://your-app.vercel.app/auction/${data.auctionAddress}" style="display: inline-block; background-color: #10b981; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      View Auction & Claim Item
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #333; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666;">
                FHE Auctions - Powered by Fully Homomorphic Encryption
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #555;">
                <a href="https://your-app.vercel.app/settings" style="color: #666; text-decoration: underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    };
}

export function getAuctionEndedBidderEmail(data: EmailTemplateData) {
    return {
        subject: `Auction "${data.auctionTitle}" has ended`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auction Results</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #333;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-block; background-color: #3b82f6; padding: 12px; border-radius: 12px; margin-bottom: 20px;">
                <span style="font-size: 24px;">📊</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">Auction Results Available</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="font-size: 16px; line-height: 1.6; color: #a0a0a0; margin: 0 0 24px;">
                The auction <strong style="color: #ffffff;">"${data.auctionTitle}"</strong> has ended. Results are now available.
              </p>
              
              <!-- Auction Details Box -->
              <div style="background-color: #0a0a0a; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Auction Type</td>
                    <td style="color: #ffffff; font-weight: 600; text-align: right;">${data.auctionType || 'FHE Auction'}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Total Bids</td>
                    <td style="color: #3b82f6; font-weight: 600; text-align: right;">${data.bidCount || 0}</td>
                  </tr>
                  <tr>
                    <td style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Contract</td>
                    <td style="color: #ffffff; font-family: monospace; font-size: 11px; text-align: right;">${data.auctionAddress.slice(0, 10)}...${data.auctionAddress.slice(-8)}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0; margin: 0 0 24px;">
                View the auction page to see if you won and to claim your escrow if you didn't win.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://your-app.vercel.app/auction/${data.auctionAddress}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      View Results
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #333; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666;">
                FHE Auctions - Powered by Fully Homomorphic Encryption
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #555;">
                <a href="https://your-app.vercel.app/settings" style="color: #666; text-decoration: underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    };
}

export function getEmailTemplate(type: string, data: EmailTemplateData) {
    switch (type) {
        case 'auction_ended_seller':
            return getAuctionEndedSellerEmail(data);
        case 'winner_announced':
            return getWinnerAnnouncementEmail(data);
        case 'auction_ended_bidder':
            return getAuctionEndedBidderEmail(data);
        default:
            throw new Error(`Unknown email template type: ${type}`);
    }
}
