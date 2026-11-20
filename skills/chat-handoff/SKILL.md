---
name: chat-handoff
description: Turn a long Claude conversation into a compact, copy-paste "handoff" summary so the work can continue in a fresh chat without losing context — and pick up a handoff someone pastes in. Use this whenever the user wants to start a new chat/session and keep going, says the conversation is too long, slow, or near the usage/context limit, asks to "summarize everything so far", "save progress", "continue tomorrow", "move this to a new chat", "handoff", "yangi chatga o'tamiz", "xulosa qil davom ettirish uchun", "продолжим в новом чате", or when they paste a block that starts with "HANDOFF" / looks like a previous session summary. Also use it when the user complains that Claude forgot earlier decisions or that limits run out fast — a handoff is the fix.
---

# Chat Handoff

Long chats get expensive: every new message makes Claude re-read the whole conversation, so usage limits drain faster and old, abandoned instructions start to confuse the answers. Starting a new chat fixes that — but only if the important context comes along. This skill writes that context as one short block the user can paste into a new chat, and tells Claude how to continue from such a block.

There are two modes. Figure out which one applies:

- **Write a handoff** — the user is ending this chat (or near a limit) and wants to continue elsewhere.
- **Resume from a handoff** — the user pasted a handoff block (from this skill or something similar) into a new chat.

---

## Mode 1: Write a handoff

### What matters (and what doesn't)

The new chat starts with zero memory. Ask yourself for every line: *"If this line were missing, would the next Claude make a mistake, redo work, or ask the user something already answered?"* Keep it only if yes.

Keep:
- **The goal** — what the user is ultimately trying to achieve, in one or two sentences.
- **Who the user is**, only as far as it changes the work (e.g. "beginner, explain simply", "replies in Uzbek", "under 18 — parents handle payments").
- **Decisions already made, with the reason** — the reason stops the next chat from re-opening settled questions ("Kotlin, not Flutter — user wants a native app").
- **Current state** — what exists now: files and their paths, links, versions, what was tested and works.
- **Open problems** — bugs, blockers, things waiting on someone else, with exact error text if relevant.
- **Next steps** — the concrete next 1–5 actions, in order.
- **Rules and preferences** the user gave — language, tone, format, "stop after each step", things they said never to do.
- **Don't-redo / don't-suggest list** — ideas already rejected, approaches that failed and why.

Drop:
- Small talk, thanks, emotions, and the back-and-forth of how a decision was reached (keep only the outcome).
- Long code, full file contents, or long quotes. Point to the file path or say what the code does. Include a short snippet only if the next step depends on its exact text.
- Anything that is now outdated — superseded plans, fixed bugs (unless the fix itself matters).

### Never put secrets in a handoff

The user will paste this block somewhere else, maybe share it. Leave out passwords, API keys, tokens, card numbers, one-time codes, full addresses, and ID numbers — write `[stored in .env]` or `[ask the user]` instead. Personal names and emails only when the work needs them.

### Language and length

- Write in the language the user has been using with you (Uzbek, Russian, English, …). Keep technical names (file paths, commands, product names) as they are.
- Aim for something that fits on one or two phone screens: usually **150–500 words**. A very large project may need more, but every extra line costs the user tokens in every message of the new chat. Prefer short bullet points over prose.
- If the conversation covered several unrelated projects, ask which one to hand off — or write separate short blocks, one per project, so each new chat stays focused.

### Output format

Give one short sentence of explanation, then the block in a single code block so it is easy to copy on a phone, then one line on what to do with it. Use these headings (translated to the user's language) and skip any section that would be empty:

````
```
HANDOFF — <project name> — <date>

🎯 GOAL
<1–2 sentences>

👤 ABOUT ME / HOW TO WORK WITH ME
- <only what changes the work>

✅ DECISIONS (do not re-open)
- <decision> — <why>

📍 CURRENT STATE
- <what exists, where, what works>

⚠️ OPEN ISSUES
- <problem / blocker / waiting on>

➡️ NEXT STEPS
1. <first concrete action>
2. …

🚫 DON'T
- <rejected ideas, failed approaches, user's "never" rules>

▶️ To the next Claude: read this, confirm in 2–3 lines what you understood, then start with NEXT STEP 1. Don't ask again about things listed above.
```
````

After the block, tell the user briefly (in their language): open a new chat, paste the block, and send. If they use Claude Projects, suggest saving it as a project file so every chat in that project sees it.

### When the chat is too short

If the conversation is short and focused, say so honestly — a handoff isn't needed yet — and give the tiny version (goal + next step) only if they still want it.

---

## Mode 2: Resume from a handoff

When the first message of a chat is a handoff block (headings like GOAL / DECISIONS / NEXT STEPS, the word HANDOFF, or a pasted "summary of our previous chat"):

1. **Trust it.** Treat the decisions, preferences and "don't" rules as already agreed. Don't re-ask what the block answers, and don't re-suggest what it rules out.
2. **Confirm briefly** — 2–3 lines in the user's language: what the project is and what you'll do first. No long restatement; the user already knows their project.
3. **Ask only what's genuinely missing** to do the next step (for example a file the block points to that you can't see). One question, not a list.
4. **Start on NEXT STEP 1**, unless the user's message asks for something else.
5. When this new chat in turn gets long, offer a fresh handoff that updates the old one rather than appending to it.

If parts of the block look outdated or contradict what the user now says, follow the user and mention the change in one line.
