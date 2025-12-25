"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveEmailPreference, getEmailPreference, deleteEmailPreference } from "@/lib/supabase";
import {
    LayoutDashboard,
    Gavel,
    History,
    Wallet,
    Settings as SettingsIcon,
    Plus,
    ArrowLeft,
    User,
    Bell,
    Lock,
    Fingerprint,
    ShieldCheck,
    Smartphone,
    Mail,
    LogOut,
    Shield,
    BarChart3
} from "lucide-react";

const SidebarItem = ({ icon: Icon, label, active = false, href = "#" }: { icon: any, label: string, active?: boolean, href?: string }) => (
    <Link href={href} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-amber-500/10 text-amber-500 font-semibold shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <Icon size={20} />
        <span className="text-sm">{label}</span>
    </Link>
);

const InputWrapper = ({ label, required = false, children }: { label: string, required?: boolean, children: React.ReactNode }) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
            {label} {required && <span className="text-amber-500">*</span>}
        </label>
        {children}
    </div>
);

export default function SettingsPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security' | 'advanced'>('profile');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const [settings, setSettings] = useState({
        fheEngine: true,
        twoFactor: false,
        emailNotifications: true,
    });

    // Email notification state
    const [email, setEmail] = useState('');
    const [emailPreferences, setEmailPreferences] = useState({
        notify_auction_ended: true,
        notify_winner_announced: true,
        notify_auction_ending_soon: true,
        notify_outbid: false,
    });
    const [saving, setSaving] = useState(false);
    const [loadingEmail, setLoadingEmail] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Load email preferences when wallet connects
    useEffect(() => {
        if (address && mounted) {
            loadEmailPreferences();
        }
    }, [address, mounted]);

    async function loadEmailPreferences() {
        setLoadingEmail(true);
        try {
            const pref = await getEmailPreference(address!);
            if (pref) {
                setEmail(pref.email);
                setEmailPreferences({
                    notify_auction_ended: pref.notify_auction_ended,
                    notify_winner_announced: pref.notify_winner_announced,
                    notify_auction_ending_soon: pref.notify_auction_ending_soon,
                    notify_outbid: pref.notify_outbid,
                });
            }
        } catch (error) {
            console.error('Error loading email preferences:', error);
        } finally {
            setLoadingEmail(false);
        }
    }

    async function handleSaveEmail() {
        console.log('Save email clicked!', { email, address, emailPreferences });

        if (!email || !address) {
            alert('Please enter a valid email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        setSaving(true);
        try {
            console.log('Calling saveEmailPreference...');
            const result = await saveEmailPreference(address, email, emailPreferences);
            console.log('Save successful!', result);
            alert('✅ Email preferences saved successfully!');
        } catch (error: any) {
            console.error('Error saving email:', error);
            alert(`Failed to save email: ${error.message}`);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteEmail() {
        if (!address) return;

        if (confirm('Are you sure you want to remove your email and stop receiving notifications?')) {
            setSaving(true);
            try {
                await deleteEmailPreference(address);
                setEmail('');
                alert('Email removed successfully');
            } catch (error: any) {
                console.error('Error deleting email:', error);
                alert(`Failed to remove email: ${error.message}`);
            } finally {
                setSaving(false);
            }
        }
    }

    function toggleEmailPreference(key: keyof typeof emailPreferences) {
        setEmailPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    }

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file (JPG, PNG, etc.)');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }

            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    if (!mounted) {
        return <div className="min-h-screen bg-[#0a0a0a]" />;
    }

    return (
        <div className="flex min-h-screen bg-[#0a0a0a]">
            {/* Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 p-6 gap-8 fixed h-full bg-[#0a0a0a] z-50">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        <Gavel size={22} className="text-black" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">FHE Auction</span>
                </div>

                <nav className="flex flex-col gap-1.5 flex-1">
                    <SidebarItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
                    <SidebarItem icon={Gavel} label="Browse Auctions" href="/auctions" />
                    <SidebarItem icon={History} label="My Bids" href="/bids" />
                    <SidebarItem icon={BarChart3} label="Statistics" href="/statistics" />
                    <SidebarItem icon={Wallet} label="Wallet" href="/wallet" />
                    <SidebarItem icon={Plus} label="Create Auction" href="/auction/create" />
                    <SidebarItem icon={SettingsIcon} label="Settings" active href="/settings" />
                </nav>

                <div className="border-t border-white/10 pt-6 space-y-2">
                    <SidebarItem icon={Shield} label="Admin" href="/admin" />
                    <button onClick={() => router.push("/")} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-colors group">
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-6 lg:p-12 w-full max-w-[1600px] mx-auto overflow-x-hidden">
                <header className="mb-12">
                    <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-4 lg:hidden">
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-4xl lg:text-6xl font-serif text-white">
                        System <span className="text-amber-500 italic">Settings</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Configure your protocol preferences and security parameters.</p>
                </header>

                {!isConnected ? (
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-16 text-center">
                        <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Wallet Not Connected</h2>
                        <p className="text-slate-400 mb-6">Please connect your wallet to access settings.</p>
                        <button onClick={() => router.push("/")} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all">
                            Connect Wallet
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Settings Navigation */}
                        <div className="space-y-4">
                            <button
                                onClick={() => setActiveSection('profile')}
                                className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 font-bold group transition-all ${activeSection === 'profile' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-white border border-transparent hover:border-white/10'}`}
                            >
                                <User size={20} className="group-hover:scale-110 transition-transform" /> Profile Information
                            </button>
                            <button
                                onClick={() => setActiveSection('notifications')}
                                className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 font-bold transition-all ${activeSection === 'notifications' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-white border border-transparent hover:border-white/10'}`}
                            >
                                <Bell size={20} /> Notifications
                            </button>
                            <button
                                onClick={() => setActiveSection('security')}
                                className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 font-bold transition-all ${activeSection === 'security' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-white border border-transparent hover:border-white/10'}`}
                            >
                                <Lock size={20} /> Security & Privacy
                            </button>
                            <button
                                onClick={() => setActiveSection('advanced')}
                                className={`w-full p-4 rounded-2xl text-left flex items-center gap-3 font-bold transition-all ${activeSection === 'advanced' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-slate-400 hover:text-white border border-transparent hover:border-white/10'}`}
                            >
                                <Fingerprint size={20} /> Advanced (FHE)
                            </button>
                        </div>

                        {/* Settings Content */}
                        <div className="lg:col-span-2 space-y-12">
                            {activeSection === 'profile' && (
                                <section className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10">
                                    <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">Public Profile</h3>
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-6 pb-8 border-b border-white/5">
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1">
                                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-4 border-black overflow-hidden">
                                                    {avatarUrl ? (
                                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={40} className="text-amber-500" />
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <input
                                                    type="file"
                                                    id="avatar-upload"
                                                    accept="image/*"
                                                    onChange={handleAvatarChange}
                                                    className="hidden"
                                                />
                                                <label
                                                    htmlFor="avatar-upload"
                                                    className="px-6 py-2 bg-white text-black font-bold rounded-xl text-sm hover:bg-slate-200 transition-all cursor-pointer inline-block"
                                                >
                                                    Change Avatar
                                                </label>
                                                <p className="text-xs text-slate-500 mt-2">Recommended: 400x400px JPG or PNG. Max 5MB.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputWrapper label="Display Name">
                                                <input type="text" placeholder="CryptoWhale_01" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" />
                                            </InputWrapper>
                                            <InputWrapper label="Email Address">
                                                <input type="email" placeholder="whale@deepsea.io" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" />
                                            </InputWrapper>
                                        </div>

                                        <InputWrapper label="Wallet Address">
                                            <input type="text" value={address || ""} disabled className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-slate-400 font-mono text-sm cursor-not-allowed" />
                                        </InputWrapper>
                                    </div>
                                </section>
                            )}

                            {activeSection === 'notifications' && (
                                <section className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10">
                                    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Email Notifications</h3>
                                    <p className="text-sm text-slate-400 mb-8">Get notified about auction events via email</p>

                                    <div className="space-y-6">
                                        {/* Email Input */}
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Mail className="text-amber-500" size={20} />
                                                <h4 className="text-white font-bold">Email Address</h4>
                                                {loadingEmail && <span className="text-xs text-slate-500">(Loading...)</span>}
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="your@email.com"
                                                disabled={loadingEmail}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all mb-3 disabled:opacity-50"
                                            />
                                            <p className="text-xs text-slate-500">We'll send auction updates to this address. Your email is stored securely and never shared.</p>

                                            {email && (
                                                <div className="flex gap-3 mt-4">
                                                    <button
                                                        onClick={handleSaveEmail}
                                                        disabled={saving}
                                                        className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-all disabled:opacity-50"
                                                    >
                                                        {saving ? 'Saving...' : 'Save Email'}
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteEmail}
                                                        disabled={saving}
                                                        className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-sm transition-all border border-red-500/20 disabled:opacity-50"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Notification Preferences */}
                                        <div className="space-y-3">
                                            {[
                                                { title: 'Auction Ended (Seller)', desc: 'Get notified when your auction ends', key: 'notify_auction_ended' as const },
                                                { title: 'Winner Announcement', desc: 'Get notified when you win an auction', key: 'notify_winner_announced' as const },
                                                { title: 'Auction Ending Soon', desc: 'Reminder 1 hour before auction ends', key: 'notify_auction_ending_soon' as const },
                                                { title: 'Outbid Alert', desc: 'Get notified when someone outbids you', key: 'notify_outbid' as const },
                                            ].map((pref, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2.5 bg-white/5 rounded-xl text-slate-400">
                                                            <Bell size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold text-sm tracking-tight">{pref.title}</p>
                                                            <p className="text-[10px] text-slate-500">{pref.desc}</p>
                                                        </div>
                                                    </div>
                                                    <div
                                                        onClick={() => toggleEmailPreference(pref.key)}
                                                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${emailPreferences[pref.key] ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-800'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${emailPreferences[pref.key] ? 'left-7' : 'left-1'}`}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Privacy Notice */}
                                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                            <p className="text-xs text-blue-400 leading-relaxed">
                                                🔒 <strong>Privacy:</strong> Email notifications are optional. You can unsubscribe anytime from the settings page or email links.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {activeSection === 'security' && (
                                <section className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10">
                                    <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">Security Preferences</h3>
                                    <div className="space-y-6">
                                        {[
                                            { title: 'Enable FHE Engine', desc: 'Secure local encryption for all bids before submission.', icon: ShieldCheck, key: 'fheEngine' as const },
                                            { title: 'Two-Factor Auth', desc: 'Additional layer of security for high-value withdrawals.', icon: Smartphone, key: 'twoFactor' as const },
                                        ].map((pref, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-white/5 rounded-xl text-slate-400">
                                                        <pref.icon size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-sm tracking-tight">{pref.title}</p>
                                                        <p className="text-[10px] text-slate-500">{pref.desc}</p>
                                                    </div>
                                                </div>
                                                <div
                                                    onClick={() => toggleSetting(pref.key)}
                                                    className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${settings[pref.key] ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings[pref.key] ? 'left-7' : 'left-1'}`}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {activeSection === 'advanced' && (
                                <section className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10">
                                    <h3 className="text-2xl font-bold text-white mb-8 tracking-tight">Advanced FHE Settings</h3>
                                    <div className="space-y-6">
                                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                            <div className="flex items-start gap-4">
                                                <ShieldCheck className="text-emerald-400 mt-1 flex-shrink-0" size={24} />
                                                <div>
                                                    <p className="text-emerald-400 font-bold text-lg tracking-tight mb-2">FHE Engine Status</p>
                                                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                                        Fully Homomorphic Encryption (FHE) is currently <span className="text-emerald-400 font-bold">ENABLED</span>.
                                                        All your bids are encrypted locally before being submitted to the blockchain.
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div className="bg-black/20 p-3 rounded-lg">
                                                            <p className="text-slate-500 uppercase font-bold mb-1">Encryption Type</p>
                                                            <p className="text-white font-mono">TFHE</p>
                                                        </div>
                                                        <div className="bg-black/20 p-3 rounded-lg">
                                                            <p className="text-slate-500 uppercase font-bold mb-1">Key Size</p>
                                                            <p className="text-white font-mono">2048-bit</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-white font-bold mb-2">Privacy Level</p>
                                            <p className="text-xs text-slate-500 mb-4">Choose how much information is visible on-chain</p>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all">
                                                <option value="maximum" className="bg-[#0a0a0a]">Maximum Privacy (Recommended)</option>
                                                <option value="balanced" className="bg-[#0a0a0a]">Balanced</option>
                                                <option value="minimal" className="bg-[#0a0a0a]">Minimal Privacy</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Save Buttons */}
                            <div className="flex justify-end gap-4">
                                <button className="px-8 py-4 text-slate-400 font-bold hover:text-white transition-colors">Discard Changes</button>
                                <button className="px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl">Save Configuration</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <footer className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-xs font-medium uppercase tracking-widest pb-10">
                    <p>© 2025 FHE Auction Protocol. All rights reserved.</p>
                    <div className="flex gap-8">
                        <a href="/docs" className="hover:text-amber-500 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-amber-500 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-amber-500 transition-colors">Status</a>
                    </div>
                </footer>
            </main>
        </div>
    );
}
