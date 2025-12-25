import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Email preference types
export interface EmailPreference {
    id?: string;
    wallet_address: string;
    email: string;
    notify_auction_ended: boolean;
    notify_winner_announced: boolean;
    notify_auction_ending_soon: boolean;
    notify_outbid: boolean;
    verified?: boolean;
    created_at?: string;
    updated_at?: string;
}

/**
 * Save or update email preference for a wallet
 */
export async function saveEmailPreference(
    walletAddress: string,
    email: string,
    preferences: Partial<EmailPreference>
) {
    const { data, error } = await supabase
        .from('email_preferences')
        .upsert({
            wallet_address: walletAddress.toLowerCase(),
            email,
            notify_auction_ended: preferences.notify_auction_ended ?? true,
            notify_winner_announced: preferences.notify_winner_announced ?? true,
            notify_auction_ending_soon: preferences.notify_auction_ending_soon ?? true,
            notify_outbid: preferences.notify_outbid ?? false,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get email preference for a wallet address
 */
export async function getEmailPreference(walletAddress: string): Promise<EmailPreference | null> {
    const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
}

/**
 * Get all users who want a specific notification type
 */
export async function getUsersForNotification(
    notificationType: 'notify_auction_ended' | 'notify_winner_announced' | 'notify_auction_ending_soon' | 'notify_outbid'
): Promise<EmailPreference[]> {
    const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq(notificationType, true);

    if (error) throw error;
    return data || [];
}

/**
 * Delete email preference for a wallet
 */
export async function deleteEmailPreference(walletAddress: string) {
    const { error } = await supabase
        .from('email_preferences')
        .delete()
        .eq('wallet_address', walletAddress.toLowerCase());

    if (error) throw error;
}

/**
 * Get email preferences for multiple wallet addresses
 */
export async function getEmailPreferencesForWallets(walletAddresses: string[]): Promise<EmailPreference[]> {
    const lowercaseAddresses = walletAddresses.map(addr => addr.toLowerCase());

    const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .in('wallet_address', lowercaseAddresses);

    if (error) throw error;
    return data || [];
}
