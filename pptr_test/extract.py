import fitz

doc = fitz.open('test_invoice.pdf')
page = doc[0]

text = page.get_text("text")

with open('extracted.txt', 'w', encoding='utf-8') as f:
    f.write("--- get_text('text') ---\n")
    f.write(text)
    f.write("\n\n--- get_text('words') ---\n")
    for w in page.get_text("words"):
        f.write(str(w) + "\n")
