Got it. You're building the family budget in your "Budget 2026" Google Sheet (50/30/20, USD), and the "Plan" and "Spending" tabs are already set up. Today we'll add a **Remaining** column to the Plan tab that shows how much is left in each category. No macros or scripts, just one formula.

**Step 1: Add the "Remaining" formula**

I'll assume your **Plan** tab has the category names in **column A** (Housing in A2, Groceries in A3, and so on) and the limits in **column B**. On the **Spending** tab, Category is **column B** and Amount is **column C**, because the order there is Date | Category | Amount | Note.

1. Open the **Plan** tab.
2. Tap cell **C1** and type the header `Remaining`.
3. Tap cell **C2**, the row for your first category, and type:

   ```
   =B2-SUMIF(Spending!B:B, A2, Spending!C:C)
   ```

Here's what the formula means, read left to right:
- `B2` is this category's limit.
- `SUMIF(...)` adds up spending for this category only:
  - `Spending!B:B` tells it to look through the Category column on the Spending tab,
  - `A2` tells it to pick only the rows that match this category's name,
  - `Spending!C:C` tells it to add up the Amount for those rows.
- The limit minus the spending gives what's **left**.

4. Copy C2 down to the other categories. On a computer, drag the small square at the corner of the cell down to the last category. On a phone, tap C2, then **Copy**, then select the cells below it and **Paste**.

**Check it:** if Groceries has a 900 limit and you've logged 250 of grocery spending, Remaining should show **650**.

Try it and tell me what you see. If your columns are arranged differently, tell me which letters you use and I'll adjust the formula. Once it works, we'll do Step 2 and turn the cell red when it goes below 0.
