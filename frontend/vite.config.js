import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

// Custom plugin to serve WASM with correct MIME type and redirect to public
function wasmPlugin() {
    return {
        name: 'wasm-redirect',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                // Set correct MIME type for all WASM files
                if (req.url?.endsWith('.wasm')) {
                    res.setHeader('Content-Type', 'application/wasm');
                }

                // Redirect node_modules WASM to public folder
                if (req.url?.includes('node_modules') && req.url?.endsWith('.wasm')) {
                    const wasmFile = req.url.split('/').pop();
                    req.url = '/' + wasmFile;
                }

                next();
            });
        },
    };
}

export default defineConfig({
    plugins: [
        wasmPlugin(),
        nodePolyfills({
            include: ['buffer', 'crypto', 'stream', 'util', 'process'],
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
        wasm(),
        topLevelAwait(),
    ],
    build: {
        target: 'esnext',
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                auctions: path.resolve(__dirname, 'pages/auctions.html'),
                createAuction: path.resolve(__dirname, 'pages/create-auction.html'),
                auctionDetail: path.resolve(__dirname, 'pages/auction-detail.html'),
                myDashboard: path.resolve(__dirname, 'pages/my-dashboard.html'),
                admin: path.resolve(__dirname, 'pages/admin/admin.html'),
            },
        },
    },
    optimizeDeps: {
        include: ['keccak', 'readable-stream', 'buffer', 'fetch-retry'],
        exclude: ['tfhe', 'tkms', '@zama-fhe/relayer-sdk'],
        esbuildOptions: {
            target: 'esnext',
        },
    },
    resolve: {
        alias: {
            // Alias WASM files to public folder
            'tfhe/tfhe_bg.wasm': path.resolve(__dirname, 'public/tfhe_bg.wasm'),
            'tkms/kms_lib_bg.wasm': path.resolve(__dirname, 'public/kms_lib_bg.wasm'),
        },
    },
    server: {
        // ✅ Allow only your ngrok host
        allowedHosts: [
            'sheepish-jared-interword.ngrok-free.dev',
        ],
        // COOP/COEP headers removed - they can interfere with CDN script loading
        fs: {
            allow: ['..', 'node_modules', 'public'],
        },
    },
    assetsInclude: ['**/*.wasm'],
});
