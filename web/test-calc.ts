import { calculateTotals } from './src/lib/documents';

const testData = {
    line_items: [
        { hours: 1, unit_price: 800, amount: 800 }
    ],
    discount: 20,
    discount_type: "amount",
    gst_percent: 20,
    gst_type: "percent"
};

const result = calculateTotals(testData);
console.log(JSON.stringify(result, null, 2));
