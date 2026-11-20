Got it. You're building a monthly family budget in Google Sheets ("Budget 2026") using the 50/30/20 rule, with $5,400/month income and limits already set on the **Plan** tab. Spending gets logged on the **Spending** tab (Date | Category | Amount | Note). Today's job is adding a **Remaining** column to Plan, then the red warning, then a chart. No apps, no macros.

Let's start with **Step 1: the "Remaining" formula.**

I'm assuming your **Plan** tab looks like this. If yours is different, tell me and I'll adjust:

| | A | B |
|---|---|---|
| 1 | Category | Limit |
| 2 | Housing | ... |
| 3 | Groceries | ... |
| ... | ... | ... |

On the **Spending** tab, Category is column **B** and Amount is column **C**.

**1. Add the header**
On the Plan tab, click cell **C1** and type `Remaining`.

**2. Type the formula for the first category**
Click cell **C2** (next to Housing) and type this exactly:

```
=B2-SUMIF(Spending!B:B, A2, Spending!C:C)
```

Press Enter.

**What it means, piece by piece:**
- `B2` is the limit for Housing.
- `SUMIF(...)` adds up everything you've spent on Housing. It has three parts:
  - `Spending!B:B` tells it to look down the Category column on the Spending tab.
  - `A2` tells it which category to find ("Housing").
  - `Spending!C:C` tells it which numbers to add: the Amount column.
- The minus sign takes what you've spent away from your limit. The result is what you have left.

**3. Copy it down to the other categories**
Click C2 again. A small blue square appears in the bottom-right corner of the cell. Drag it down to the last category (Other). Sheets updates the formula for each row on its own, so row 3 checks Groceries, row 4 checks Eating out, and so on. (On a phone: tap C2, tap **Copy**, select C3 down to the last row, and tap **Paste**.)

**4. Check it**
Add a test row on the Spending tab, for example `Groceries | 50`. The Groceries "Remaining" value should drop by 50. Delete the test row afterward.

One thing to know: the category names on the Spending tab have to match the Plan tab exactly (for example "Eating out", not "Eating Out " with an extra space). If a number looks wrong, that's usually why.

Try it and tell me what you see in column C. Once it works, we'll move on to Step 2, turning the cell red when it drops below 0.
