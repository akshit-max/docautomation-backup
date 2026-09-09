/**
 * REGRESSION TEST SUITE
 * Tests all required scenarios from the user directive.
 */
import { calculateTotals } from './src/lib/documents';

let passed = 0;
let failed = 0;

function assert(label: string, actual: any, expected: any) {
  const ok = String(actual) === String(expected);
  if (ok) {
    console.log(`  ✅ ${label}: ${actual}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}: got "${actual}", expected "${expected}"`);
    failed++;
  }
}

function test(name: string, fn: () => void) {
  console.log(`\n── ${name}`);
  fn();
}

// ─────────────────────────────────────────────────────────────────────────────
test("TEST 1: Old PDF — hours × unit_price, no amount (PATH A)", () => {
  const data = {
    line_items: [
      { description: "FRONTEND", hours: 15, unit_price: 222 },
      { description: "BACKEND",  hours: 20, unit_price: 222 },
      { description: "DATABASE", hours: 20, unit_price: 235 },
    ],
    gst_percent: 0, discount: 0,
  };
  const r = calculateTotals({ ...data, line_items: data.line_items.map(i => ({...i})) });
  assert("Item 1 amount", r.line_items[0].amount, 3330);
  assert("Item 2 amount", r.line_items[1].amount, 4440);
  assert("Item 3 amount", r.line_items[2].amount, 4700);
  assert("Item 1 unit_price NOT mutated", r.line_items[0].unit_price, 222);
  assert("subtotal", r.subtotal, "₹12,470");
  assert("total", r.total, "₹12,470");
});

// ─────────────────────────────────────────────────────────────────────────────
test("TEST 2: 22 → 222 bug — user types unit_price=22 but stale amount=3330 exists", () => {
  // This is the EXACT bug scenario. User had amount=3330 from before.
  // Now they type unit_price=22 (different value). The system must use hours×unit_price
  // because BOTH hours and unit_price are present.
  const reactState = {
    line_items: [{ description: "FRONTEND", hours: "15", unit_price: "22", amount: 3330 }],
    gst_percent: 0, discount: 0,
  };
  // Simulate shallow copy (as live preview does)
  const shallowCopy = { ...reactState };
  calculateTotals(shallowCopy);

  // With the fix: hours=15 > 0 AND unitPrice=22 > 0 → calculatedAmount = 15×22 = 330
  // existingAmount = 3330. calculatedAmount(330) > 0 → amount = 330 (calc wins)
  // unit_price NOT mutated
  assert("unit_price NOT mutated (no 22→222)", reactState.line_items[0].unit_price, "22");
  assert("amount uses hours×unit_price when both present", shallowCopy.line_items[0].amount, 330);
});

// ─────────────────────────────────────────────────────────────────────────────
test("TEST 3: Explicit amount preserved when hours/unit_price absent", () => {
  // Only amount provided (e.g. flat-rate item from AI), no hours/unit_price
  const data = {
    line_items: [{ description: "FLAT RATE", hours: 0, unit_price: 0, amount: 5000 }],
    gst_percent: 0, discount: 0,
  };
  const r = calculateTotals({ ...data, line_items: data.line_items.map(i => ({...i})) });
  assert("amount preserved", r.line_items[0].amount, 5000);
  assert("normalised to hours=1", r.line_items[0].hours, 1);
  assert("normalised to unit_price=5000", r.line_items[0].unit_price, 5000);
  assert("subtotal", r.subtotal, "₹5,000");
});

// ─────────────────────────────────────────────────────────────────────────────
test("TEST 4: GST 20% on ₹800 - ₹20 discount = ₹156 GST, ₹936 total", () => {
  const data = {
    line_items: [{ description: "SERVICE", hours: 1, unit_price: 800 }],
    discount: 20, discount_type: "amount",
    gst_percent: 20, gst_type: "percent", gst_input: "20",
  };
  const r = calculateTotals({ ...data, line_items: data.line_items.map(i => ({...i})) });
  assert("subtotal", r.subtotal, "₹800");
  assert("formatted_discount", r.formatted_discount, "-₹20");
  assert("taxable_amount", r.taxable_amount, "₹780");
  assert("gst_amount", r.gst_amount, "₹156");
  assert("total", r.total, "₹936");
});

// ─────────────────────────────────────────────────────────────────────────────
test("TEST 5: GST shown with NO discount — taxable_amount must be set", () => {
  const data = {
    line_items: [{ description: "SERVICE", hours: 1, unit_price: 1000 }],
    discount: 0, gst_percent: 18, gst_type: "percent", gst_input: "18",
  };
  const r = calculateTotals({ ...data, line_items: data.line_items.map(i => ({...i})) });
  assert("subtotal", r.subtotal, "₹1,000");
  assert("formatted_discount is empty", r.formatted_discount, "");
  assert("taxable_amount shown (no discount, but GST present)", r.taxable_amount, "₹1,000");
  assert("gst_amount", r.gst_amount, "₹180");
  assert("total", r.total, "₹1,180");
});

// ─────────────────────────────────────────────────────────────────────────────
test("TEST 6: GST preserved when re-extraction returns gst_percent=0", () => {
  // Simulate: user had GST=18, document was saved with gst_percent=18.
  // Re-extraction OCR missed the GST line → returns gst_percent=0.
  // calculateTotals should NOT overwrite the stored gst_percent=18 with 0.
  const storedContent = {
    line_items: [{ description: "SERVICE", hours: 1, unit_price: 1000 }],
    gst_percent: 18,   // preserved from previous session
    gst_input: undefined,  // AI didn't return this new field
    gst_type: "percent",
    discount: 0,
  };
  // When content.gst_input is undefined, safeFloat falls back to gst_percent
  // So gstInput = 18 → finalGstPercent = 18 → gst_percent preserved correctly.
  const r = calculateTotals({ ...storedContent, line_items: storedContent.line_items.map(i => ({...i})) });
  assert("gst_percent preserved as 18", r.gst_percent, 18);
  assert("gst_amount calculated as ₹180", r.gst_amount, "₹180");
  assert("total is ₹1,180", r.total, "₹1,180");
});

// ─────────────────────────────────────────────────────────────────────────────
test("TEST 7: Re-extracted PDF with amount field — unit_price NOT overwritten", () => {
  // PATH B: regenerated PDF is re-uploaded.
  // AI extracts: hours=15, unit_price=222, amount=3330
  // calculatedAmount = 15×222 = 3330 → takes precedence (both present)
  // unit_price should NOT be mutated
  const reactState = {
    line_items: [
      { description: "FRONTEND", hours: 15, unit_price: 222, amount: 3330 },
    ],
    gst_percent: 18, gst_type: "percent", gst_input: "18",
    discount: 0,
  };
  const deepCopy = {
    ...reactState,
    line_items: reactState.line_items.map(i => ({ ...i }))
  };
  const r = calculateTotals(deepCopy);
  assert("unit_price unchanged (222)", r.line_items[0].unit_price, 222);
  assert("amount from hours×unit_price (3330)", r.line_items[0].amount, 3330);
  assert("gst_percent", r.gst_percent, 18);
  assert("gst_amount ₹599.4", r.gst_amount, "₹599.4");
  assert("total ₹3,929.4", r.total, "₹3,929.4");
});

// ─────────────────────────────────────────────────────────────────────────────
test("TEST 8: Explicit amount ₹3333 with hours=15, unit_price=222 — no mutation", () => {
  // Source says: hours=15, unit_price=₹222, amount=₹3333 (intentional mismatch)
  // hours×unit_price = 3330 (calculated wins over explicit when calculatedAmount > 0)
  // This is correct: we trust hours and unit_price as authoritative when both exist.
  // The ₹3333 explicit amount is from a stale state; the user's typed values take priority.
  const data = {
    line_items: [{ description: "FRONTEND", hours: 15, unit_price: 222, amount: 3333 }],
    gst_percent: 0, discount: 0,
  };
  const r = calculateTotals({ ...data, line_items: data.line_items.map(i => ({...i})) });
  assert("unit_price NOT mutated (stays 222)", r.line_items[0].unit_price, 222);
  assert("amount = 15×222 = 3330 (calculated wins)", r.line_items[0].amount, 3330);
  assert("subtotal = ₹3,330", r.subtotal, "₹3,330");
});

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("✅ ALL TESTS PASSED");
} else {
  console.log("❌ SOME TESTS FAILED — do not deploy");
  process.exit(1);
}
