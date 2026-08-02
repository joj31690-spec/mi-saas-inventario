const { getProductProfitability } = require('./src/services/financialAnalyticsService');

async function main() {
  try {
    const data = await getProductProfitability();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
