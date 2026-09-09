const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function run() {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        headless: true
    });
    
    const page = await browser.newPage();
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
/* Mimic the layout CSS */
@font-face {
  font-family: 'TT Hoves';
  src: url('http://localhost:3000/static/fonts/tt_hoves_pro/regular.ttf') format('truetype');
}
*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
body { font-family: 'TT Hoves', sans-serif; margin: 0; padding: 20px; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: 5px; font-size: 10pt; text-align: left; }
td.r { text-align: right; }
td.lc { text-align: right; padding-right: 20px; }
td.ac { text-align: right; }
</style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th style="width:50%;">Description</th>
        <th class="r" style="width:12%;">Hours</th>
        <th class="r" style="width:19%;">Unit Price</th>
        <th class="r" style="width:19%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>FRONTEND</td>
        <td class="r">15</td>
        <td class="r">₹20</td>
        <td class="r">₹300</td>
      </tr>
      <tr>
        <td>BACKEND</td>
        <td class="r">20</td>
        <td class="r">₹20</td>
        <td class="r">₹400</td>
      </tr>
      <tr>
        <td>DATABASE</td>
        <td class="r">20</td>
        <td class="r">₹5</td>
        <td class="r">₹100</td>
      </tr>
    </tbody>
    <tfoot>
      <tr><td colspan="2"></td><td class="lc">Subtotal</td><td class="ac">₹800</td></tr>
      <tr><td colspan="2"></td><td class="lc">Discount</td><td class="ac">-₹20</td></tr>
      <tr><td colspan="2"></td><td class="lc">Taxable</td><td class="ac">₹780</td></tr>
      <tr><td colspan="2"></td><td class="lc">GST</td><td class="ac">₹80</td></tr>
      <tr><td colspan="2"></td><td class="lc">Total</td><td class="ac">₹880</td></tr>
    </tfoot>
  </table>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: 'test_invoice.pdf', format: 'A4' });
    await browser.close();
    console.log("Created test_invoice.pdf");
}

run().catch(console.error);
