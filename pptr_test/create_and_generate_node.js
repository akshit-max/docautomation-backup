const http = require('http');

const data = JSON.stringify({
  title: "Test Invoice 20",
  template_type: "invoice",
  content: {
    project_name: "TEST PROJECT",
    client_name: "TEST CLIENT",
    line_items: [
        {description: "FRONTEND", hours: "15", unit_price: 20, amount: 300},
        {description: "BACKEND", hours: "20", "unit_price": 20, "amount": 400},
        {description: "DATABASE", "hours": "20", "unit_price": 5, "amount": 100}
    ],
    subtotal: 800,
    discount: 20,
    taxable_amount: 780,
    gst_percent: 10,
    gst_amount: 78,
    total: 858
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/doc/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const json = JSON.parse(body);
    console.log("Created doc id:", json.id);
    
    // Now request PDF generation from backend
    http.get(`http://localhost:8000/generate-pdf/${json.id}`, res2 => {
        let pdfData = [];
        res2.on('data', chunk => pdfData.push(chunk));
        res2.on('end', () => {
            const buffer = Buffer.concat(pdfData);
            require('fs').writeFileSync(`test_${json.id}.pdf`, buffer);
            console.log(`PDF saved to test_${json.id}.pdf`);
        });
    });
  });
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
