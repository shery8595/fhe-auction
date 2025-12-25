// Test file to check subgraph schema
import { getAuctions, getStatistics, getActiveAuctions } from './subgraph';

async function testSubgraph() {
    console.log('Testing subgraph queries...\n');

    try {
        // Test 1: Get auctions
        console.log('1. Testing getAuctions()...');
        const auctions = await getAuctions(5, 0);
        console.log('✅ Success:', JSON.stringify(auctions, null, 2));
    } catch (error: any) {
        console.log('❌ Error:', error.message);
    }

    try {
        // Test 2: Get active auctions
        console.log('\n2. Testing getActiveAuctions()...');
        const active = await getActiveAuctions(5);
        console.log('✅ Success:', JSON.stringify(active, null, 2));
    } catch (error: any) {
        console.log('❌ Error:', error.message);
    }

    try {
        // Test 3: Get statistics
        console.log('\n3. Testing getStatistics()...');
        const stats = await getStatistics();
        console.log('✅ Success:', JSON.stringify(stats, null, 2));
    } catch (error: any) {
        console.log('❌ Error:', error.message);
    }
}

testSubgraph();
