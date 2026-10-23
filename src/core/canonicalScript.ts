import { CueCategoryMeta } from './types';

export const SCRIPT_SYNTAX_CATEGORIES: CueCategoryMeta[] = [
  {
    kind: 'organizerCue',
    badgeLabel: 'ORGANIZER CUE',
    syntaxExample: '*[Organizer Cue: Have co-host spotlight the speaker and monitor chat.]*',
    description: 'Amber logistics & backstage producer instruction card (never read aloud).',
  },
  {
    kind: 'conditionalCue',
    badgeLabel: 'CONDITIONAL BRANCH',
    syntaxExample: '*[If recording is active, announce: "This session is being recorded."]*',
    description: 'Dynamic conditional branch or optional segment card.',
  },
  {
    kind: 'timingCue',
    badgeLabel: 'TIMING & PACING',
    syntaxExample: '*[Timing: 02:30 target · Keep opening energetic and under 90 seconds.]*',
    description: 'Emerald pacing, countdown target, or time-check card.',
  },
  {
    kind: 'visualCue',
    badgeLabel: 'VISUAL / SLIDE CUE',
    syntaxExample: '*[Slide: Advance to Title Deck · Confirm screen share is visible.]*',
    description: 'Sky-cyan slide transition, camera framing, or screen-share cue card.',
  },
  {
    kind: 'deliveryCue',
    badgeLabel: 'VOCAL DELIVERY',
    syntaxExample: '*[Tone: Warm, authoritative, and welcoming · Smile at the lens.]*',
    description: 'Violet vocal inflection, posture, eye-line, and energy coaching card.',
  },
  {
    kind: 'actionCue',
    badgeLabel: 'STAGE / HANDOFF ACTION',
    syntaxExample: '*[Action: Pause 2 seconds for applause, then unmute next speaker.]*',
    description: 'Teal physical stage action, mic handoff, or transition beat.',
  },
];

export const INLINE_SYNTAX_TOKENS = [
  {
    name: 'Key Phrase Highlight',
    syntax: '==Welcome to our annual keynote!==',
    description: 'Renders a luminous glass highlight pill around critical phrases you must land.',
  },
  {
    name: 'Vocal Emphasis (Bold)',
    syntax: '**Over to you, Dr. Perera.**',
    description: 'Renders high-contrast bold weight for primary vocal stress and handoff lines.',
  },
  {
    name: 'Inflection (Italic)',
    syntax: '*every single breakthrough*',
    description: 'Renders subtle italic styling for nuanced vocal inflection.',
  },
  {
    name: 'Breath / Pause Marker',
    syntax: '[PAUSE] or [BEAT]',
    description: 'Renders a compact inline breath & cadence badge so you never rush transitions.',
  },
  {
    name: 'Tracked Placeholder',
    syntax: "[Speaker's Full Name]",
    description: 'Automatically tracked in the Pre-Flight Placeholder Inspector until resolved.',
  },
];

export const UNIVERSAL_AI_MASTER_PROMPT = `You are writing a live moderator / presenter script formatted specifically for **CueGlass Studio (Liquid Glass Teleprompter)**.

Follow these exact Markdown formatting rules so the app automatically parses your script into navigable teleprompter beats, color-coded stage cue cards, one-key speaker thank-you waypoints, live Q&A flow buttons, emergency backup lines, and a pre-flight checklist:

====================================================================
1. DOCUMENT HEADER & METADATA
====================================================================
Start the script with an H1 title, an H2 subtitle, and bold key-value metadata lines followed by \`---\`:

# [EVENT NAME IN CAPS]
## Master Moderator & Presenter Script

**Host:** [Host Name]
**Date:** [Event Date]
**Starting Time:** [Start Time]
**Platform:** [Zoom / Teams / Main Stage / Hybrid]
**Organizer:** [Organization / Team Name]

---

====================================================================
2. NUMBERED SECTIONS (00–09 LIVE FLOW, 10–12 ON-DEMAND DRAWERS)
====================================================================
Use numbered H2 headings (\`## NN — SECTION TITLE\`) separated by \`---\`:
- Sections \`00\` through \`09\` form the sequential **Live Teleprompter Flow** navigated via Left/Right arrow keys:
  - \`## 00 — BEFORE THE SESSION STARTS\` (Pre-show warm welcome)
  - \`## 01 — OPENING & WELCOME\` (Main hook & welcome)
  - \`## 02 — PROGRAM OVERVIEW\` (Agenda & speaker lineup)
  - \`## 03 — BEFORE WE GET STARTED\` (Housekeeping, chat rules, recording notice)
  - \`## 04\` to \`## 07\` — Individual Speaker / Keynote / Panel Segments (e.g., \`## 04 — FIRST SESSION: [TOPIC]\`)
  - \`## 08 — Q&A SESSION\` (Includes H3 subsections for Q&A flow)
  - \`## 09 — CLOSING REMARKS\` (Thank-yous, next steps, sign-off)
- Sections \`10\`, \`11\`, and \`12\` populate the app's instant **On-Demand Drawers** (accessible at any moment with 1-click return to your exact live beat):
  - \`## 10 — BACKUP MODERATOR LINES\` (Use \`### If [scenario]\` subsections with spoken recovery lines in quotes)
  - \`## 11 — OPTIONAL MODERATOR QUESTIONS\` (Use \`### [Topic] — [Speaker Name]\` subsections with \`Question 1:\`, \`Question 2:\`)
  - \`## 12 — PRIVATE ORGANIZER CHECKLIST\` (Start with \`*This section is not intended to be read aloud.*\` followed by \`- [ ]\` checklist tasks)

====================================================================
3. ONE-SCANNABLE-THOUGHT SPOKEN BEATS
====================================================================
- Write every spoken sentence or short breath group as its own paragraph separated by a blank line.
- Never write dense walls of text. Each paragraph becomes one distinct, near-camera teleprompter beat.

====================================================================
4. CATEGORIZED STAGE & PRODUCTION CUE CARDS (NEVER READ ALOUD)
====================================================================
Wrap non-spoken cues in \`*[...]*\` on their own line. Prefix the cue inside the brackets to trigger specialized color-coded glass cards:
- **Organizer / Producer Cue (Amber Card):**
  \`*[Organizer Cue: Ask co-host to spotlight the speaker and monitor chat.]*\`
- **Conditional / Optional Rule (Orange-Amber Card):**
  \`*[If recording is confirmed, announce: "Please note that today's session is being recorded."]*\`
  \`*[Optional: Mention one key takeaway from the speaker's talk.]*\`
- **Timing & Pacing Cue (Emerald Card):**
  \`*[Timing: 02:00 target · Keep introductions crisp and energetic.]*\`
- **Visual / Slide / Camera Cue (Sky-Cyan Card):**
  \`*[Slide: Display Agenda Slide #2 and verify screen share visibility.]*\`
- **Vocal Delivery & Energy Cue (Violet Card):**
  \`*[Tone: Warm, conversational, and assured · Hold eye contact with the camera lens.]*\`
- **Stage / Handoff Action Cue (Teal Card):**
  \`*[Action: Pause 2 seconds as slides appear, then hand over the floor.]*\`

====================================================================
5. INLINE SPOKEN EMPHASIS & CADENCE MARKERS
====================================================================
Inside spoken lines, use these inline markers to guide live delivery:
- \`==Key Phrase==\` -> Renders a luminous glass highlight around critical words you must land.
- \`**Bold Text**\` -> High-contrast vocal emphasis (use on speaker names and handoff lines like \`**Over to you, [Name].**\`).
- \`*Italic Text*\` -> Subtle vocal inflection.
- \`[PAUSE]\` or \`[BEAT]\` -> Inline rhythmic breath badge so you pause naturally.
- \`[Placeholder Text]\` -> Square brackets for any unconfirmed detail (e.g., \`[Confirmed Speaker's Name]\` or \`[Ending Time]\`). The app's Pre-Flight Inspector automatically flags these until filled in.

====================================================================
6. SPEAKER SESSION & "THANK SPEAKER" WAYPOINT PATTERN
====================================================================
Inside every speaker section (\`## 04\`, \`## 05\`, etc.), always include a \`### THANKING THE [FIRST/SECOND/...] SPEAKER\` subsection right after \`*[Action: Allow the presentation to begin.]*\`.
This powers the app's single-key **T ("Thank Speaker")** instant jump button when the speaker finishes talking!

Example Speaker Section:
\`\`\`markdown
## 04 — FIRST SESSION: [TOPIC TITLE]

*[Timing: 15 minutes total · 90-second introduction]*

*[Tone: Enthusiastic and welcoming]*

To kick off our first session, it's my pleasure to welcome **[Speaker Full Name]**, who will be speaking about ==[Session Topic]==.

[Speaker First Name] is [1–2 crisp sentences on verified credentials and real-world impact]. [PAUSE]

**Over to you, [Speaker First Name].**

*[Action: Allow the presentation to begin. Mute mic while keeping camera warm.]*

### THANKING THE FIRST SPEAKER

Thank you very much, [Speaker First Name], for sharing those practical insights with us.

*[Optional: Highlight one memorable point from their presentation.]*

Now, let's transition to our next session.
\`\`\`

====================================================================
7. Q&A SUBSECTION HEADINGS (SECTION 08)
====================================================================
Inside \`## 08 — Q&A SESSION\`, include these exact 5 H3 subsections so the app's Q&A Quick-Jump bar maps them automatically:
- \`### WHEN SELECTING A QUESTION\`
- \`### WHEN INVITING ANOTHER SPEAKER'S PERSPECTIVE\`
- \`### IF THE AUDIENCE IS QUIET\`
- \`### IF THERE ARE TOO MANY QUESTIONS\`
- \`### ENDING THE Q&A\`

====================================================================
NOW GENERATE THE COMPLETE SCRIPT FOR MY UPCOMING PROGRAM:
====================================================================
- **Event Name:** [Insert Event Name]
- **Host / Moderator Name:** [Insert Host Name]
- **Date & Time:** [Insert Date & Time]
- **Platform / Venue:** [Zoom / Hybrid / Auditorium]
- **Organizer:** [Insert Organizer Name]
- **Speakers & Topics:**
  1. [Speaker 1 Name, Title/Bio, Topic]
  2. [Speaker 2 Name, Title/Bio, Topic]
  3. [Add more speakers or panel segments as needed]
- **Special Announcements or Goals:** [Insert any special notes]

Output ONLY the complete, ready-to-use Markdown script following every rule above.`;

export const UNIVERSAL_GUIDELINE_SCRIPT_MD = `# CUEGLASS STUDIO — MASTER SCRIPT & AI BLUEPRINT
## Universal Moderator Teleprompter Script & Copyable AI Prompt Guide

**Host:** Atheesha Anarga  
**Date:** Universal Multi-Event Template  
**Starting Time:** Ready on Cue  
**Platform:** Zoom · Google Meet · MS Teams · Live Keynote Stage  
**Organizer:** Executive Production & Live Moderation Studio

---

## 00 — BEFORE THE SESSION STARTS

*[Timing: T-Minus 5 Minutes · Pre-Show Warmth & Audio Check]*

*[Tone: Relaxed, welcoming, and assured · Look directly into the camera lens]*

Good evening, everyone, and ==welcome to today's live session!== [PAUSE]

We'll be getting started in just a few moments as our remaining guests join the room.

*[Slide: Keep the Title Welcome Slide on screen with background lobby audio muted.]*

Thank you so much for being here with us today.

*[Organizer Cue: Tip — Click the "AI Prompt & Syntax Guide" button (or Copy icon) in the top bar anytime to copy the Master AI Prompt for Google Gemini, Claude, or ChatGPT!]*

*[Action: Verify co-host permissions, speaker microphones, and screen-share readiness.]*

---

## 01 — OPENING & WELCOME

*[Timing: 00:00 — 02:00 · High-Impact Opening Hook]*

*[Tone: Warm, authoritative, and energizing · Smile as you greet the room]*

Hello everyone, and a very warm welcome to **[Program Title]!** [PAUSE]

I'm **Atheesha Anarga**, and I'll be your host and moderator for today's program.

Whether you are joining us live from across the country or tuning in with your team, ==today's session is designed to give you actionable clarity and real-world perspective.==

This program is brought to you by **[Organizer or Organization Name]**, bringing together leading voices to explore the ideas, skills, and decisions that matter most right now.

---

## 02 — PROGRAM OVERVIEW

*[Slide: Display Program Agenda & Speaker Lineup Slide]*

Before we dive in, let me quickly walk you through how our session will flow today. [PAUSE]

**First**, we'll open with our featured session on ==Artificial Intelligence & Future Systems== with **Asindu De Silva**.

**Next**, we'll explore ==Cybersecurity & Digital Resilience== with **Sandeep Nilwakka**.

**Then**, we'll dive into ==Data Science & Decision Intelligence== with **[Confirmed Speaker's Name]**.

**Finally**, we'll round out our main talks with ==Core Systems & Engineering Architecture== with **Pansilu Jayawardane**.

*[Timing: Keep agenda walkthrough under 60 seconds so we stay ahead of schedule.]*

Following the presentations, we'll open the floor for a **live Q&A session**, where you can put your questions directly to our speakers.

*[If the end time is confirmed, add: "We expect to wrap up by around [Confirmed End Time] today."]*

---

## 03 — BEFORE WE GET STARTED

*[Tone: Clear, helpful, and concise]*

Just a few quick housekeeping notes before we begin. [PAUSE]

We kindly ask everyone to ==keep your microphones muted== during the presentations unless invited to speak.

If a question comes to mind at any point, drop it straight into the **chat window** — include your name and let us know which speaker you'd like to direct it to.

*[If recording is confirmed, announce: "Please note that today's session is being recorded for participants who couldn't join live."]*

*[If slide sharing is confirmed, announce: "Key resources and presentation slides will also be shared with registered attendees after the event."]*

With that, let's jump right into our first session!

---

## 04 — FIRST SESSION: ARTIFICIAL INTELLIGENCE

*[Timing: 15 Minutes Total · 90-Second Moderator Intro]*

*[Slide: Spotlight Speaker 1 & Transition to Session 01 Title Card]*

To kick off our first session, it's my pleasure to welcome **Asindu De Silva**, who will be speaking about ==Artificial Intelligence==. [PAUSE]

Asindu brings hands-on experience in modern AI engineering and applied machine learning systems, helping bridge the gap between foundational theory and real-world deployment.

Today, he'll share what it truly takes to build in this field and what you can expect when specializing in AI.

We're thrilled to have you with us today. [BEAT]

**Over to you, Asindu.**

*[Action: Allow the presentation to begin. Press "T" on your keyboard as soon as the speaker finishes to jump straight to the thank-you beat below.]*

### THANKING THE FIRST SPEAKER

*[Tone: Appreciative and reflective]*

Thank you very much, **Asindu**, for sharing your experiences and practical insights with us. [PAUSE]

*[Optional: Briefly mention one standout takeaway from his presentation.]*

That gives everyone a much clearer picture of where ==Artificial Intelligence== is heading and how to prepare for it.

Now, let's move from intelligent systems to another mission-critical pillar: keeping our digital infrastructure secure.

---

## 05 — SECOND SESSION: CYBERSECURITY

*[Timing: 15 Minutes Total · 60-Second Moderator Intro]*

Moving on to our second session, we'll be focusing on ==Cybersecurity==.

I'd like to introduce our next speaker, **Sandeep Nilwakka**. [PAUSE]

Sandeep specializes in network security and defensive engineering, serving as Vice President of the ISACA Student Group and building practical security auditing tools.

Today, he'll walk us through the mindset, tooling, and career realities of modern Cybersecurity.

**Sandeep, over to you.**

*[Action: Allow the presentation to begin.]*

### THANKING THE SECOND SPEAKER

Thank you, **Sandeep**, for that insightful and practical session. [PAUSE]

*[Optional: Acknowledge one key security takeaway from his talk.]*

We really appreciate you sharing your hands-on perspective on ==Cybersecurity==.

Next, let's turn our attention to turning raw information into high-stakes decisions.

---

## 06 — THIRD SESSION: DATA SCIENCE

*[Timing: 15 Minutes Total · Check Pre-Flight Placeholder Badge before going live]*

Now, let's move on to our third session, focusing on ==Data Science==.

It's my pleasure to introduce **[Confirmed Speaker's Full Name]**. [PAUSE]

*[Organizer Cue: Insert one or two sentences about the speaker's verified academic background, industry experience, or flagship projects.]*

In this session, we'll explore the core analytical skills, mathematical foundations, and real-world impact of Data Science.

Thank you for joining us today. [BEAT]

**[Speaker's First Name], over to you.**

*[Action: Allow the presentation to begin.]*

### THANKING THE THIRD SPEAKER

Thank you, **[Speaker's First Name]**, for sharing your knowledge and experience with us. [PAUSE]

*[Optional: Mention one particularly useful insight from the session.]*

And now, let's move on to our fourth and final presentation of the program.

---

## 07 — FOURTH SESSION: CORE COMPUTER SCIENCE

*[Timing: 15 Minutes Total]*

For our final presentation, we'll be looking at ==Standard Computer Science & Systems Engineering==.

I'd like to welcome **Pansilu Jayawardane**. [PAUSE]

Pansilu has deep practical experience in backend engineering, database architecture, and full-stack systems — including contributing to *Insight AI*, an AI-powered camera platform.

Today, he'll share how a strong, versatile foundation in Computer Science opens doors across the entire technology landscape.

**Pansilu, the floor is yours.**

*[Action: Allow the presentation to begin.]*

### THANKING THE FOURTH SPEAKER

Thank you very much, **Pansilu**, for sharing your perspective and engineering experience with us. [PAUSE]

*[Optional: Mention one takeaway from his presentation.]*

With that, we've now completed all four featured presentations!

I'd like to thank all of our speakers for the clarity and depth they've brought to today's program.

---

## 08 — Q&A SESSION

*[Timing: 15–20 Minutes · Use the 5 Quick-Jump Q&A Sub-Flow buttons in the bottom bar]*

*[Tone: Engaging, curious, and conversational]*

Now, let's move into our **live Q&A session**! [PAUSE]

This is your opportunity to ask our speakers anything about the topics, career paths, and practical lessons we've covered today.

If you haven't submitted a question yet, feel free to share it in the chat right now.

*[Optional, if duration is confirmed: "We have around [Confirmed Q&A Minutes] minutes for questions, so we'll keep our answers focused and hear from as many of you as possible."]*

Let's jump into the first question.

### WHEN SELECTING A QUESTION

We have a great question from **[Participant's Name]**. [PAUSE]

*[Action: Read the participant's question clearly and at a measured pace.]*

Thank you for that question, [Participant's Name].

**[Speaker's Name]**, could I invite you to share your thoughts on this first?

*[Action: Allow the speaker to respond.]*

Thank you for that clear answer. Let's take our next question.

### WHEN INVITING ANOTHER SPEAKER'S PERSPECTIVE

Thank you for that perspective. [PAUSE]

I'd also love to bring **[Speaker's Name]** in on this — would you like to add your view from your field?

### IF THE AUDIENCE IS QUIET

While everyone is typing their questions in the chat, I'd love to ask our panel a question of my own. [PAUSE]

*[Organizer Cue: Click "Questions (11)" in the bottom bar to trigger any prepared question with 1-click return!]*

### IF THERE ARE TOO MANY QUESTIONS

Thank you, everyone, for the tremendous energy in the chat!

We have a lot of thoughtful questions coming in, so we'll rapid-fire through as many as we can in our remaining time.

### ENDING THE Q&A

*[Timing: Final 2 minutes of Q&A]*

And that brings us to the end of our Q&A session. [PAUSE]

A big thank you to everyone who submitted questions, and thank you to our speakers for sharing such candid, practical advice.

---

## 09 — CLOSING REMARKS

*[Tone: Grateful, inspiring, and polished · Hold eye contact with the camera through the final sign-off]*

As we wrap up today's program, I want to take a moment to thank everyone who made this session possible. [PAUSE]

First, our sincere gratitude goes to our guest speakers for generously sharing their time, expertise, and real-world stories.

I'd also like to thank our organizing team behind the scenes for putting every detail of this event together.

And most importantly, ==thank you to all of you for joining us live and engaging so thoughtfully.== [BEAT]

Be sure to follow our official channels for upcoming events, recordings, and community resources.

Once again, thank you for being part of today's session — ==have a wonderful evening!==

---

## 10 — BACKUP MODERATOR LINES

### If a speaker isn't ready

"We're just making a few final technical arrangements for our next segment. Thank you for your patience — we'll be right with you."

### If there are technical difficulties

"It looks like we're experiencing a brief technical hiccup. Bear with us for just a moment while our team resolves it."

### If a speaker's microphone is muted

"Excuse me, [Speaker's Name] — I believe your microphone is currently muted. Could you unmute so we can hear you clearly?"

### If the speaker's screen isn't visible

"Excuse me, [Speaker's Name] — we can't quite see your shared screen yet. Could you try re-sharing your window?"

### If a speaker disconnects unexpectedly

"It seems we've momentarily lost connection with our speaker. Let's give them thirty seconds to reconnect, or we'll pivot to our next segment."

*[Organizer Cue: Coordinate with the co-host in private chat before jumping to the next speaker.]*

### If a speaker is running over time

*[Organizer Cue: Prefer having the co-host send a private 1-minute warning first. If you need to step in verbally, say:]*

"Thank you so much, [Speaker's Name]. In the interest of keeping us on schedule for Q&A, could I invite you to share one final wrap-up thought?"

### If someone asks an off-topic question

"Thank you for raising that. Since it falls just outside today's core focus, we'll keep our live Q&A centered on our main session topics and follow up afterward."

### If nobody asks a question

"While our attendees are gathering their thoughts in the chat, I'd love to kick off with a question for our speaker."

### If a speaker finishes unexpectedly early

"Thank you, [Speaker's Name]! Since we have a couple of extra minutes in this segment, may I ask you one quick follow-up question?"

### If the program is running behind schedule

"Thank you, everyone, for staying with us. To respect everyone's time, we'll transition straight into our next segment."

### If Q&A takes place after an individual presentation

"Thank you for that presentation! We have time for one or two quick questions right now — feel free to drop them in the chat for [Speaker's Name]."

### If handing over to another organizer

"At this point, it's my pleasure to invite **[Co-Host or Organizer Name]** to guide us through the next part of the program. Over to you!"

---

## 11 — OPTIONAL MODERATOR QUESTIONS

### Artificial Intelligence — Asindu

**Question 1:**

"What would you say is the single most important mindset or foundation someone should build before specializing in Artificial Intelligence?"

**Question 2:**

"For someone starting their first real-world AI project today, what tools or workflows would you recommend mastering first?"

### Cybersecurity — Sandeep

**Question 1:**

"For students and engineers curious about Cybersecurity, what is the most practical way to build hands-on defensive experience?"

**Question 2:**

"How has the rise of AI changed the day-to-day priorities of a modern Cybersecurity professional?"

### Data Science — Confirmed Speaker

**Question 1:**

"What skills should someone prioritize if they want to stand out in Data Science over the next three years?"

**Question 2:**

"How do you balance mathematical and statistical depth with practical software engineering in day-to-day Data Science work?"

### Core Computer Science — Pansilu

**Question 1:**

"Some people wonder whether choosing a broad Computer Science track limits specialist opportunities — how has a broad systems foundation helped you?"

**Question 2:**

"What are the biggest long-term career advantages of mastering core backend and architecture fundamentals first?"

### SHARED QUESTION — ALL SPEAKERS

"If you could go back to the exact moment you chose your path, what is one piece of advice you would give your younger self?"

*[Action: Invite each speaker to share a 30-second closing reflection.]*

---

## 12 — PRIVATE ORGANIZER CHECKLIST

*This section is not intended to be read aloud.*

**Script & AI Preparation**
- [ ] Copy the Master AI Prompt (top bar AI Prompt icon) if generating a custom script in Gemini, Claude, or ChatGPT.
- [ ] Resolve all bracketed \`[Placeholders]\` using the Pre-Flight Placeholder badge.
- [ ] Confirm phonetic pronunciation of every speaker's full name.
- [ ] Verify speaker credentials and project titles before introducing them live.

**Glass & Camera Ergonomics**
- [ ] Position the floating window using "Snap Near Camera" so your eyes stay aligned with the MacBook camera lens.
- [ ] Adjust Liquidness, Transparency, Glass Effect Level, and Font Boldness in Settings (⌘,) for your lighting environment.
- [ ] Choose between "Full-Window Liquid Glass" or "Classic Structured Card" layout in Settings.

**Live Production & Platform Setup**
- [ ] Assign a co-host to monitor chat questions and manage speaker spotlights.
- [ ] Test screen sharing and audio levels 10 minutes before going live.
- [ ] Confirm recording status and whether slides/resources will be shared afterward.

---

**END OF MASTER MODERATOR SCRIPT**
`;

export const CANONICAL_PATHFINDER_26_MD = `# PATHFINDER ’26
## Final Moderator Script — Revised

**Host:** Atheesha Anarga  
**Date:** Saturday, 24 October 2026  
**Starting Time:** 7:00 PM  
**Platform:** Zoom Meeting  
**Organizer:** IEEE Computer Society Chapter, University of Kelaniya

---

## 00 — BEFORE THE SESSION STARTS

*[Use this while participants are joining the Zoom meeting.]*

Good evening, everyone!

Welcome to Pathfinder ’26.

We'll be getting started shortly as everyone joins us.

Thank you for being here.

*[Organizer cue: Have the co-host monitor the Zoom chat, manage technical issues, and privately notify speakers when their time is nearly up.]*

---

## 01 — OPENING & WELCOME

Good evening, everyone, and a very warm welcome to **Pathfinder ’26!**

I'm Atheesha Anarga, and I'll be your host and moderator for today's session.

If you've been wondering which Computer Science specialization is the right fit for you, tonight's session is here to help.

Pathfinder ’26 is organized by the IEEE Computer Society Chapter of the University of Kelaniya, with the aim of helping students understand the different Computer Science specializations and make informed decisions about their academic path.

## 02 — PROGRAM OVERVIEW

Before we get started, let me briefly walk you through today's program.

We'll be having four presentations, each focusing on a different Computer Science specialization.

**First**, we'll be looking at Artificial Intelligence with Asindu De Silva.

**Next**, we'll move on to Cybersecurity with Sandeep Nilwakka.

**Then**, we'll have our Data Science session with [Confirmed Speaker's Name].

**Finally**, we'll wrap up the presentations with Standard Computer Science, with Pansilu Jayawardane.

Following the presentations, we'll have a Q&A session, where you'll have the opportunity to ask our speakers questions about their specializations and experiences.

We'll then conclude the program with a few closing remarks.

*[If the end time is confirmed, add: "We expect to wrap up by around [confirmed time] this evening."]*

## 03 — BEFORE WE GET STARTED

Just a few quick reminders.

We kindly ask everyone to keep their microphones muted during the presentations unless invited to speak.

If you have any questions, feel free to share them in the Zoom chat. You can find the Chat option in your Zoom controls. On mobile, you may find it under More.

When posting a question, please include your name and mention which speaker you'd like to direct it to. We'll address your questions during the Q&A at the end.

If you experience any technical difficulties, please let our organizing team know through the chat.

*[If recording is confirmed, announce: "Please note that today's session is being recorded."]*

*[If slide sharing is confirmed, announce: "The presentation slides will also be shared with participants after the session."]*

With that, let's get started!

---

## 04 — FIRST SESSION: ARTIFICIAL INTELLIGENCE

To kick off our first session, it's my pleasure to welcome **Asindu De Silva**, who will be speaking about Artificial Intelligence.

Asindu is a third-year Computer Science undergraduate at the University of Kelaniya, specializing in Artificial Intelligence.

With hands-on experience in AI development, he'll be sharing his experiences with the specialization and what students considering Artificial Intelligence can expect.

We're pleased to have you with us today.

**Over to you, Asindu.**

*[Allow the presentation to begin.]*

### THANKING THE FIRST SPEAKER

Thank you very much, Asindu, for sharing your experiences and insights with us.

*[Optional: Briefly mention one important takeaway from his presentation.]*

I'm sure your session has given our participants a clearer picture of the Artificial Intelligence specialization.

Now, let's move from intelligent systems to another important area of technology: keeping our digital systems and information secure.

---

## 05 — SECOND SESSION: CYBERSECURITY

Moving on to our second session, we'll be looking at **Cybersecurity**.

I'd like to introduce our next speaker, **Sandeep Nilwakka**.

Sandeep is a Computer Science undergraduate at the University of Kelaniya, specializing in Cybersecurity.

He also serves as the Vice President of the UOK ISACA Student Group and has gained practical experience through projects such as developing a Python-based network scanner.

Today, he'll be sharing his experiences and perspectives on the Cybersecurity specialization.

**Sandeep, over to you.**

*[Allow the presentation to begin.]*

### THANKING THE SECOND SPEAKER

Thank you, Sandeep, for that insightful session.

*[Optional: Acknowledge one key point from his presentation.]*

We appreciate you sharing your practical experiences and perspectives on Cybersecurity.

Next, we'll turn our attention to a field that focuses on making sense of information and using it to make better decisions.

---

## 06 — THIRD SESSION: DATA SCIENCE

Now, let's move on to our third session, focusing on **Data Science**.

It's my pleasure to introduce **[Confirmed Speaker's Full Name]**.

*[Insert one or two sentences about the speaker's verified academic background, experience, or projects.]*

In this session, we'll be learning more about Data Science, the skills involved, and what students can expect from this specialization.

Thank you for joining us today.

**[Speaker's First Name], over to you.**

*[Allow the presentation to begin.]*

### THANKING THE THIRD SPEAKER

Thank you, [Speaker's First Name], for sharing your knowledge and experiences with us.

*[Optional: Mention one particularly useful insight from the session.]*

We appreciate your contribution to helping our participants better understand Data Science.

And now, we'll move on to our fourth and final presentation.

---

## 07 — FOURTH SESSION: STANDARD COMPUTER SCIENCE

For our final session, we'll be looking at **Standard Computer Science**.

I'd like to welcome **Pansilu Jayawardane**.

Pansilu has practical experience in software development, including backend development and database architecture.

He contributed to *Insight AI*, an AI-powered camera system project, demonstrating how a broad foundation in Computer Science can be applied to building real-world solutions.

Today, he'll be sharing his perspectives on Standard Computer Science and the opportunities available through this specialization.

**Pansilu, the session is yours.**

*[Allow the presentation to begin.]*

### THANKING THE FOURTH SPEAKER

Thank you very much, Pansilu, for sharing your experiences and perspectives with us.

*[Optional: Mention one takeaway from his presentation.]*

We appreciate you helping us understand the flexibility and opportunities offered by Standard Computer Science.

With that, we've now completed all four presentations.

I'd like to extend my appreciation to all our speakers for taking the time to share their experiences with us tonight.

---

## 08 — Q&A SESSION

Now, we'll move into the **Q&A session**.

This is your opportunity to ask our speakers any questions you may have about the four specializations we've discussed.

If you haven't submitted a question yet, feel free to share it in the Zoom chat.

You can direct your question to a particular speaker or ask something that applies to multiple specializations.

*[Optional, if the time is confirmed: "We'll be spending approximately [confirmed number] minutes on questions, so we'll try to keep our answers brief and hear from as many participants as possible."]*

Let's take a look at the questions we've received.

### WHEN SELECTING A QUESTION

We have a question from [Participant's Name].

*[Read the question clearly.]*

Thank you for the question, [Participant's Name].

[Speaker's Name], could I invite you to share your thoughts on this?

*[Allow the speaker to respond.]*

Thank you for your response.

Let's move on to our next question.

### WHEN INVITING ANOTHER SPEAKER'S PERSPECTIVE

Thank you for that explanation.

I'd also like to invite [Speaker's Name] to share their perspective on this.

Would you like to add anything?

### IF THE AUDIENCE IS QUIET

While we're waiting for a few more questions, I'd like to ask one of our speakers something.

*[Select one of the prepared moderator questions.]*

### IF THERE ARE TOO MANY QUESTIONS

Thank you, everyone, for your questions.

We have quite a few coming in, so we'll try to address as many as possible within our remaining time.

### ENDING THE Q&A

That brings us to the end of our Q&A session.

A big thank you to everyone who submitted questions and participated in the discussion.

And of course, thank you to our speakers for taking the time to respond and share your perspectives.

We really appreciate your contributions.

---

## 09 — CLOSING REMARKS

As we come to the end of **Pathfinder ’26**, I'd like to take a moment to thank everyone who contributed to making tonight's program possible.

First, our sincere appreciation goes to all four guest speakers for taking the time to join us and share their knowledge and experiences.

I'd also like to thank the IEEE Computer Society Chapter of the University of Kelaniya and our organizing team for their efforts in bringing this program together.

And of course, thank you to everyone who joined us tonight.

I hope today's sessions have helped you gain a clearer understanding of the different Computer Science specializations and what each has to offer.

Choosing a specialization is an important decision, and I hope the insights shared tonight will help you make that decision with greater confidence.

For more programs and updates, be sure to follow the official pages of the IEEE Computer Society Chapter of the University of Kelaniya.

And if you have any questions that weren't addressed tonight, feel free to reach out to our organizing team through the chapter's official channels.

Once again, thank you all for being part of **Pathfinder ’26!**

Have a wonderful evening!

---

## 10 — BACKUP MODERATOR LINES

### If a speaker isn't ready

"We're just making a few final arrangements for our next session. Thank you for your patience."

### If there are technical difficulties

"It seems we're experiencing a small technical issue. We'll continue as soon as it's resolved."

### If a speaker's microphone is muted

"Excuse me, [Speaker's Name]. I believe your microphone is currently muted."

### If the speaker's screen isn't visible

"Excuse me, [Speaker's Name]. It seems your screen isn't visible yet. Could you please check your screen sharing?"

### If a speaker disconnects unexpectedly

"It seems we've temporarily lost connection with our speaker. We'll give them a moment to reconnect."

*[Coordinate with the co-host to decide whether to continue with another segment.]*

### If a speaker is running over time

*[Prefer having the co-host send a private time warning. If necessary, say:]*

"Thank you, [Speaker's Name]. In the interest of time, could we move towards concluding this session?"

### If someone asks an off-topic question

"Thank you for your question. As it falls a little outside the focus of today's discussion, we'll continue with questions related to the specializations for now."

### If nobody asks a question

"While we're waiting for questions from our participants, I'd like to ask our speaker a question."

### If a speaker finishes unexpectedly early

"Thank you, [Speaker's Name]. Before we move on, may I ask you one quick question?"

### If the program is running behind schedule

"Thank you, everyone, for your patience. We'll now move on to our next session."

### If Q&A takes place after an individual presentation

"Thank you for that presentation. We'll now have a short Q&A session. If you have any questions for [Speaker's Name], please share them in the chat."

### If handing over to another organizer

"At this point, I'd like to invite [Name] to take us through the next part of the program. Over to you, [Name]."

---

## 11 — OPTIONAL MODERATOR QUESTIONS

### Artificial Intelligence — Asindu

**Question 1:**

"What would you say is the most important thing students should consider before choosing Artificial Intelligence as their specialization?"

**Question 2:**

"For someone who wants to start building AI projects, what skills or technologies would you recommend learning first?"

### Cybersecurity — Sandeep

**Question 1:**

"For students interested in Cybersecurity, what would you recommend as the best way to get started?"

**Question 2:**

"How important is practical experience in Cybersecurity, and what kind of projects would you recommend for beginners?"

### Data Science — Confirmed Speaker

**Question 1:**

"What skills do you think students should focus on developing if they're considering Data Science?"

**Question 2:**

"How much of Data Science involves mathematics and statistics compared to programming?"

### Standard Computer Science — Pansilu

**Question 1:**

"Some students might wonder whether choosing Standard Computer Science limits their future career options. What are your thoughts on that?"

**Question 2:**

"What would you say are the biggest advantages of choosing Standard Computer Science rather than focusing on a particular specialization?"

### SHARED QUESTION — ALL FOUR SPEAKERS

"If you could go back to the time when you were choosing your specialization, what's one piece of advice you would give yourself?"

*[Invite each speaker to respond briefly, if time permits.]*

---

## 12 — PRIVATE ORGANIZER CHECKLIST

*This section is not intended to be read aloud.*

**Speaker details**
- [ ] Confirm the Data Science speaker's full name and introduction.
- [ ] Add the Data Science speaker's name to the agenda and thank-you.
- [ ] Confirm the preferred pronunciation of all four names.
- [ ] Confirm Asindu's specific AI project before naming it publicly.
- [ ] Confirm all speaker titles and academic backgrounds.

**Program schedule**
- [ ] Confirm the duration of each of the four presentations.
- [ ] Confirm the Q&A duration.
- [ ] Confirm the planned finishing time.
- [ ] Confirm whether there will be Q&A after each presentation or at the end.

**Zoom arrangements**
- [ ] Assign a co-host to manage questions and technical issues.
- [ ] Ensure participants can send chat messages to the intended audience.
- [ ] Confirm screen-sharing permissions for each speaker.
- [ ] Test microphones and screen sharing before 7:00 PM.
- [ ] Confirm recording status and announce it if applicable.
- [ ] Confirm whether presentation slides will be shared.

**Closing arrangements**
- [ ] Have the chapter's official social media links ready.
- [ ] Confirm where participants should direct unanswered questions.
- [ ] Have any feedback form ready if one is being used.

---

**END OF MODERATOR SCRIPT**
`;
