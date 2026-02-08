
import { AnalyticsService } from '../src/services/analytics-service';

const ORG = 'org-1';

async function generate() {
    console.log('--- PRODUCTS CSV ---');
    const productsCsv = await AnalyticsService.getProductProfitabilityCsv(ORG);
    console.log(productsCsv);

    console.log('\n--- ORDERS CSV ---');
    const ordersCsv = await AnalyticsService.getOrderProfitabilityCsv(ORG);
    console.log(ordersCsv);
}

generate().catch(console.error);
