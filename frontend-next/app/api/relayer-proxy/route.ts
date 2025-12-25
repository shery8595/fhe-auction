import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route to bypass CORS restrictions when calling Zama Relayer from localhost
 * The Zama Relayer doesn't allow direct calls from localhost origins
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('🔄 Proxying relayer request...');

        // Forward the request to the Zama Relayer
        const response = await fetch('https://relayer.testnet.zama.org/decrypt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Relayer error:', errorText);
            return NextResponse.json(
                { error: `Relayer error: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('✅ Relayer response received');

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('❌ Proxy error:', error);
        return NextResponse.json(
            { error: error.message || 'Proxy request failed' },
            { status: 500 }
        );
    }
}
