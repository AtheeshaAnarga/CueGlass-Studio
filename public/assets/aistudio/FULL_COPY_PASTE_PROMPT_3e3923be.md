# BUILD PATHFINDER GLASS — FINAL NATIVE macOS APPLICATION

You are the principal macOS engineer, design engineer, and QA owner. Build, compile, test, and package a **complete, production-quality native Mac application** named **Pathfinder Glass**. This is a finished delivery task, NOT a prototype, UI mockup, website, generic Markdown viewer, or planning exercise. Implement the application end to end in the working repository, resolve build/test failures, and provide the actual installable `.app` and a `.dmg` if the host has the required Apple tools. Do not stop at pseudocode or ask me to finish the implementation. Do not quietly claim to have compiled or tested when the host cannot do so; in that case deliver the full source, report exactly which verification is blocked, and provide the exact commands to complete it on my Mac.

## 1. The user, event, and source of truth

The target device is a **15-inch Apple-silicon MacBook Air**, running **macOS 26 Tahoe or later** with Liquid Glass support. Build natively with **Swift 6, SwiftUI, AppKit**, Apple's built-in libraries only. This is a local utility for moderating a live Zoom meeting and will be installed on my own Mac. Optimize specifically for **Pathfinder ’26**, held Saturday **24 October 2026 at 7:00 PM Sri Lanka time**, hosted by the IEEE Computer Society Chapter of the University of Kelaniya.

The canonical script is **`Resources/Pathfinder26.md`**, supplied with this prompt. Preserve its actual content, spelling, punctuation, names, timings, ordering, and conditional language in the initial shipped app. Do NOT improvise speaker credentials, fill unconfirmed details, or rewrite the script. Include this Markdown resource **inside the application bundle**, and create a writable working copy in Application Support on first launch. If this prompt is provided as a single long document, the exact same source also appears between `BEGIN BUNDLED PATHFINDER SCRIPT` and `END BUNDLED PATHFINDER SCRIPT` at the bottom; materialize it byte-for-byte as the bundled Markdown if the separate source file is unavailable. Prefer the separate canonical file if both exist and agree. All functionality must also work after I edit or replace this script with a different Markdown event script later; do not hardcode paragraph offsets or speaker sections into the parser.

The script contains top-level numbered sections **00–12**. Its **primary live-running sequence is 00–09**. Its **quick-reference areas are 10 (Backup Moderator Lines), 11 (Optional Moderator Questions), and 12 (Private Organizer Checklist)**. Within sections 04–07 the `### THANKING ...` subheadings are crucial: treat them as distinct navigable beats that I can jump to as soon as a speaker finishes. Section 08 has several Q&A subheadings that should be individual shortcuts, not one overwhelming scroll. Do not silently omit any source paragraphs.

Unresolved **Data Science speaker** placeholders exist in 02, 06 and 11, with organizer actions in 12. Preserve them visibly, and warn before going live; do not invent identities or backgrounds. Other `[Name]`, `[confirmed time]`, and optional spoken-condition placeholders remain editable. Avoid a false 'all ready' indicator until required named speaker information is resolved or explicitly acknowledged.

## 2. Product objective and experience

Build the **simplest possible on-camera host interface**, not a feature-bloated teleprompter. With Zoom open, I should read my next sentence from a small, movable glass window immediately underneath the built-in camera/notch, making my eye line look nearly like direct camera contact. I should be able to keep the reading point high on screen, minimize the floating script to a draggable glass dot, and bring it back without losing my place. During live hosting, every meaningful action must take **one click or one shortcut**. The app should have exceptionally legible typography, flawless navigation, unobtrusive animation, no network dependency, and absolutely no clutter.

Quality bar: first-party macOS fit-and-finish, comparable to Apple's best utility interfaces; focused, quiet, premium, fast, stable. No mock data, empty buttons, temporary placeholder screens, unnecessary dashboards, user accounts, subscriptions, analytics, onboarding carousels, or decorative gradients.

## 3. Visual direction — restrained Liquid Glass, light only

Use **macOS 26 native Liquid Glass** components where appropriate: SwiftUI `glassEffect(_:in:)`, `GlassEffectContainer`, native controls, AppKit panel effects as needed. Use actual system APIs, not fake CSS translucency. The UI must read beautifully over light and dark Zoom backgrounds in a **light-first** design; explicitly set a light appearance for this app unless system accessibility requirements call for contrast adjustments. Glass belongs mainly to the floating shell, button clusters, handles, and mini bubble. Reading text must sit against a carefully tuned, sufficiently opaque light neutral surface for dependable contrast; do not place thin gray text directly over fluctuating camera/video backgrounds.

Palette: soft off-white/near-white surfaces, graphite text, quiet cool-gray secondary labels, one restrained blue focus marker, warm subdued amber only for organizer cues or unresolved placeholders. No bright rainbow, large shadows, neon, harsh outlines, glossy decorations, or overdesigned hero sections. Typography: native SF/system font, comfortably readable body text (~25–30 pt default, adjustable ~18–42 pt), line height ~1.35–1.55, modest max line length, bold script emphasis rendered clearly. Section names about 12–14 pt, subdued. Preserve curly apostrophes and Unicode names.

Make the main panel a soft rounded floating rectangle (~18–22 pt corner radius, geometry-dependent). Default approximate size **560 × 340 points**, allowed resizing (roughly width 360–850, height 180–650 subject to actual screen safe area). Do not hardcode coordinates based on physical 2880-pixel resolution: macOS uses logical points and user display scaling. Prefer the top-center area **just below** the unobscured camera/notch and menu-bar safe region, approximately 12–24 points below the usable top boundary. Use `NSScreen.visibleFrame`, `safeAreaInsets`, `auxiliaryTopLeftArea`, and `auxiliaryTopRightArea` as applicable; never paint controls over the physical camera housing. Offer one-click **“Near Camera”** repositioning, and allow free dragging. Keep the last manually chosen frame on subsequent launches. Re-clamp safely when screen resolution, display scaling, Spaces, or monitor arrangement changes. Work correctly on the built-in screen and external monitors.

Compose the expanded panel:
- **Micro header** (about 40 pt high): tiny program label `PATHFINDER ’26` on left, current numbered segment and short context in center/left, simple icon buttons for `Sections`, `Tools`, `Edit`, `Collapse`. Keep 7 PM metadata in a secondary details view, not always visible.
- **Reading viewport**: dominant feature. Scrollable, distraction-free speech text. Active paragraph/beat is dark and sharp, adjacent text less visually dominant but not illegible. A small slim left-edge focus indicator identifies the current read position. Render script headings and emphasis, discreet amber organizer notes, and outlined/underlined unresolved placeholders (not embedded as ordinary speech). Respect any `*[...] *` note forms actually found in source; conditionals must be identifiable.
- **Bottom controls** (about 42 pt): backward/forward beat arrows, a compact `section name · beat count`, and optionally a tiny `Jump to thanks` contextual control during a speaker introduction. Controls hide to low visual priority when the pointer is away but must remain discoverable and accessible. No giant toolbar.
- **Collapsed bubble**: 42–48 pt diameter rounded glass disc/dot with a minimal dark `text-lines` or `book` glyph, tiny accent progress marker if useful. It stays above Zoom, supports click to expand, drag to move, hover tooltip, context menu (`Expand`, `Near Camera`, `Pause Arrow Capture`, `Quit`). Animate between panel and bubble elegantly using a compact, subtle native transition. The bubble must never be confused with macOS's green camera privacy indicator. Remember independent last expanded frame and bubble position. No titlebar/traffic-light button clutter in the actual reading panel.

Avoid full-screen teleprompter design. Most of the screen must remain available for Zoom participants and slide sharing.

## 4. Windowing, activation, Zoom coexistence

Build the overlay with an **AppKit NSPanel subclass** hosting SwiftUI via `NSHostingView` (or equivalent robust native composition). Configure floating behavior appropriately, hide standard chrome, permit moving/resizing, preserve panel across ordinary app switches, and avoid stealing Zoom's keyboard focus merely when reading/clicking non-input controls. Consider `.nonactivatingPanel`, `isFloatingPanel`, `becomesKeyOnlyIfNeeded`, and supported `collectionBehavior` combinations such as `.canJoinAllSpaces` and `.fullScreenAuxiliary` / `.canJoinAllApplications`. Verify mutually exclusive flag rules against the actual SDK; don't combine incompatible collection behaviors. Confirm real on-screen performance, including when Zoom is in full screen. Never set extreme screen-saver-level windows that make system menus or security dialogs unusable. Respect Hide, Quit, Stage Manager, multiple displays, and menu-bar/notification interactions.

An explicit **menu-bar item** (minimal icon, `Show/Hide`, `Near Camera`, `Arrow Capture`, `Open Editor`, `Quit`) provides recovery if the bubble ends up obscured or off-screen. The app may be a regular accessory/menu-bar utility but must not have an unrelated oversized main window at launch. A separate native editor/preferences window may use normal activation on demand.

Zoom screen sharing warning: this app must **never promise it is invisible to other participants during full-display capture**. It cannot control Zoom's chosen ScreenCaptureKit filters. Provide a concise one-time/local help message and preflight item: **share the slide/application window rather than the entire screen, and verify Zoom's participant-facing preview**. An `NSWindow.sharingType` tweak is not a reliable substitute. No Zoom integration, Zoom permissions, or Zoom account access is required.

## 5. Keyboard interaction — make it reliable during a live meeting

When the floating script panel has keyboard focus, implement **single-arrow controls**:
- `→` next **beat** within the current segment, automatically moving to the next main-flow segment when the previous one finishes.
- `←` previous beat, automatically moving to the previous main-flow segment when appropriate.
- `↓` next **main section** (00–09).
- `↑` previous main section.
- `Space` next beat and `Shift + Space` previous beat when not typing in a text field.
- `Escape` closes temporary navigation/popover panels, not the app.
- Clicking the visible arrows performs precisely the same navigation as keyboard input.

When Zoom has the keyboard focus, implement **system-wide safe chord shortcuts**, registered with a macOS-supported global hotkey mechanism (prefer Carbon `RegisterEventHotKey`, with a careful main-actor bridge):
- `Control + Option + →` next beat
- `Control + Option + ←` previous beat
- `Control + Option + ↓` next main section
- `Control + Option + ↑` previous main section
- `Control + Option + P` expand/collapse
- `Control + Option + H` position Near Camera

Register/unregister cleanly, detect conflicts and show clear status when the OS rejects a shortcut; do not pretend it is registered. These shortcuts must work while Zoom remains foreground, **without needless Accessibility permission prompts** for the normal case. Make the shortcuts visible in a compact Cheat Sheet.

Include a well-labelled, **OFF-by-default “Capture Bare Arrows Globally” performance mode** for cases when I want to operate from ordinary arrow keys even while Zoom is active. Only when explicitly enabled and authorized, use the appropriate supported keyboard event-tap mechanism (`CGEventTap`) to intercept solely unmodified arrow key-down/up events; do not log, store or inspect unrelated keystrokes. Explain required system privacy permission, provide clear activation state and a one-click/shortcut emergency disable, release capture when editing, and never intercept keys in the app's text editor. If permissions are denied or the event tap is disabled, degrade gracefully to the safe registered shortcuts. Allow switching this mode quickly from the menu bar. Re-enable an event tap disabled by timeout only safely. Don't silently capture arrows at OS login.

Crucial: `↑/↓` should navigate main sections and `←/→` beats **consistently in focused and global modes**. Display a subtle section/beat progress hint after navigation; no blocking toast.

## 6. Deterministic script parsing, rendering, and navigation

Implement a proper script document model and deterministic Markdown parser; do not hack this with a handful of regex substitutions that drop content. The parser should preserve raw Markdown, produce typed blocks and stable IDs, and render every original line. Implement at minimum:
- `#` title / metadata document headings, plus optional `**Host:** ...` information block.
- `## 00 — ...` through `## 12 — ...` as top-level numbered sections, recognizing common dash variants and spaces without altering the source.
- `###` as named internal beats/subsections, such as `THANKING THE FIRST SPEAKER`, `WHEN SELECTING A QUESTION`, and `If a speaker isn't ready`.
- `---` as divider; regular paragraph boundaries as individual spoken beats or logically merged brief phrases; `**bold**`, `*italic*`, Unicode characters, quotation marks, ordinary Markdown list items, and `- [ ]` checkboxes.
- Standalone italic bracketed instructions like `*[Allow the presentation to begin.]*` are **organizer/stage cues**, not words to read out loud. Show them as a restrained amber side note with optional hide/show; keep them accessible.
- Literal square-bracket placeholders such as `[Confirmed Speaker's Name]`, `[Speaker's Name]`, `[Participant's Name]`, and `[confirmed time]` are **missing information**, not Markdown links or organizer instructions. Highlight them as editable placeholders. A standalone `[ ]` belonging to a Markdown task item is a checkbox, never a placeholder.
- For any conditional `*[If ...]*` line, show it as an optional instruction, **not automatically inserted into spoken script**. Keep its exact wording available.
- `###` nested labels in sections 10 and 11 are fast-lookup command names/questions. Section 12 is a private checklist with persistent checkbox completion state, not normal host speech.
- Work with future similarly structured Markdown files, even if section count/naming differs: if no numbered titles exist, provide a sensible fallback based on H2 headings. Invalid Markdown must never crash the UI or destroy the working script.

The rendered `read flow` must contain **all speakable words in the original source, in correct order**, except that organizer-only cues should be visually differentiated and may be collapsed—not deleted. Support natural paragraph-level or sentence-group beats, but don't split speaker names or phrases mid-sentence. Store a unique address for each beat consisting of section ID, optional subsection ID, and content-stable block identity; if edited, preserve current reading position where possible via stable text matching with nearest-neighbor fallback.

**Navigation special cases**:
- Intro to Asindu → `Over to you, Asindu` → presentation-handoff pause → one-click `THANKING THE FIRST SPEAKER` after his speech → transition to Cybersecurity. Repeat precisely for the other three speakers.
- For section 08, create live Q&A quick picks (`Select question`, `Another perspective`, `Audience quiet`, `Too many questions`, `End Q&A`) without advancing forcibly through the entire Q&A every time. All snippets remain grounded in the original source.
- Section 10: searchable/clickable **emergency line palette**. One click opens the selected backup phrase prominently in the reading panel. Provide a context-preserving `Return to live position` action: invoking a backup line must **not** permanently advance/reorder the main script. The same behavior applies to section 11 moderator questions.
- Section 11: group questions by AI/Asindu, Cybersecurity/Sandeep, Data Science, Standard Computer Science/Pansilu, and one shared all-speaker question based on source heading text, with no invented question content.
- Section 12: editable checklist; its items should not appear on stage by default, but must be available instantly in the organizer tools panel.

## 7. Reading ergonomics, scrolling, and animation

When the current beat changes, smoothly animate the viewport so the **start of the active beat is around the upper 20–30% of the visible reading area**. This makes the eyes stay close to the camera instead of dropping to the bottom of the MacBook display. Use reliable, text-layout-aware scrolling (`ScrollViewReader` if it accurately meets requirements, otherwise an `NSScrollView` bridge) rather than guessing pixels. Finish each scroll in roughly 180–280 ms using a natural decelerating curve; don't produce endless slow teleprompter motion or scroll past content. No overlapping animated navigation queues: rapid arrow presses should settle at the final requested beat. Preserve readable neighboring text. Support trackpad scrolling and clicking an arbitrary paragraph to set it active.

Make font size adjustable from live controls and the keyboard, e.g. `Command + Plus/Minus`; persist it. Support optional line-spacing adjustment and a narrow reading-width mode. Respect **Reduce Motion**, Increase Contrast, VoiceOver, keyboard focus indicators, and content scaling. No continuous auto-scroll is necessary; precise manual pacing is the priority. Avoid timer-based features that might unexpectedly move the reading position.

## 8. Fast navigation tools specialized for Pathfinder

Provide a compact `Sections` palette grouping:
- `LIVE FLOW`: 00 Before Start, 01 Opening, 02 Overview, 03 Reminders, 04 Artificial Intelligence, 05 Cybersecurity, 06 Data Science, 07 Standard CS, 08 Q&A, 09 Closing.
- `ON-DEMAND`: 10 Backup Lines, 11 Moderator Questions, 12 Organizer Checklist.

Within 04–07, show two clear waypoints: **Introduce** and **Thank speaker**. When an intro has been handed over, keep a small unobtrusive **“Resume with Thanks”** action (with actual speaker name) accessible without scrolling through presentation text or navigating multiple menus. Never auto-time speaker talks. From any state allow `Back to Last Live Beat`, and maintain live progress while using on-demand snippets.

Provide `Find` with filtered sections/lines for rapid recovery; no complex project manager UI. Provide a preflight readiness screen that detects unresolved square-bracket placeholders in speakable content, explicit speaker-detail TODOs in organizer instructions, and unset optional notes. Distinguish **needs confirmation** from **intentionally optional**; do not pretend the Data Science speaker is known. I should be able to dismiss a warning for rehearsal, not silently mark a missing identity as confirmed. The data source is authoritative; don't correct facts from external assumptions.

## 9. Editing and adding scripts later

Implement a real **Edit Script** window (separate from overlay) showing a Markdown source editor and synchronized rendered preview/outline. The same structured syntax drives the display: `##` numbered sections, `###` beats, `---`, `**bold**`, `*[organizer cue]*`, `[placeholder]`, and `- [ ]` checkboxes. Include brief unobtrusive syntax guidance in this window. Keyboard-friendly and ergonomic editor with Find/Replace, Undo/Redo, Save, Import `.md`/`.txt`, Export `.md`, and restore bundled original via explicit confirmation. Preserve source line endings and Unicode where reasonably possible. Never mutate the bundled source; store a copy in `~/Library/Application Support/PathfinderGlass/` using a robust atomic-write and backup strategy. Autosave changes after a short debounce; save immediately when the editor closes, the app backgrounds or terminates when possible. Recover a valid last-known-good file after interrupted writes. Maintain at least five rolling local script versions so bad live edits are reversible. Use security-scoped access where relevant for external imported files. State clearly when a write fails.

Future script changes must automatically update navigation and search without a rebuild. Use stable UUIDs and text/heading fingerprints to remap the current selection after reparse; don't unexpectedly jump to the beginning while a live meeting is underway. For future event scripts, derive display names from front matter/title and allow customizing the primary vs. reference sections. Pathfinder ’26 ships as the selected default. Persist local settings, panel positions, the current reading position, the primary document, font size, capture mode (but default inactive on app relaunch), and checklist state. Avoid cloud accounts, telemetry, browser dependencies, or uploading the script.

## 10. Architecture and file layout

Deliver a maintainable, well-organized Xcode project with genuine native code. A reasonable structure is:

```
PathfinderGlass.xcodeproj
PathfinderGlass/
  App/PathfinderGlassApp.swift
  App/AppCoordinator.swift
  Windows/FloatingScriptPanel.swift
  Windows/PanelController.swift
  Views/ReadingPanelView.swift
  Views/CollapsedBubbleView.swift
  Views/SectionsPaletteView.swift
  Views/QuickReferenceView.swift
  Views/ScriptEditorView.swift
  Views/PreflightView.swift
  Views/SettingsView.swift
  Model/ScriptDocument.swift
  Model/ScriptSection.swift
  Model/ScriptBlock.swift
  Parsing/MarkdownScriptParser.swift
  Navigation/ScriptNavigationController.swift
  Input/HotkeyManager.swift
  Input/GlobalArrowCapture.swift
  Persistence/ScriptStore.swift
  Persistence/SettingsStore.swift
  Resources/Pathfinder26.md
PathfinderGlassTests/
  MarkdownScriptParserTests.swift
  NavigationTests.swift
  ScriptStoreTests.swift
  PlaceholderTests.swift
  WindowGeometryTests.swift
README.md
build-release.sh
package-dmg.sh
```

You may improve the internal layout if it produces cleaner separation of concerns. Swift concurrency and SwiftUI state must be handled correctly on main actor where applicable. No poll loops for keyboard/window interaction. Remove observers, hotkey registrations, event taps, timers, and notification tokens on teardown. Keep I/O asynchronous when necessary and UI scrolling smooth. Use well-scoped unit tests and basic UI tests wherever practical; do not add large third-party frameworks to save a few lines.

Use the APIs present in the installed macOS SDK and check current Apple documentation before selecting `NSPanel` flag combinations or Liquid Glass modifiers. Do not invent non-existent SwiftUI/APIs. Target macOS 26+ intentionally; show an honest installation requirement rather than shipping a half-supported fallback. No Electron, Tauri, React, browser windows, Node runtime, Python runtime, external server, cloud provider, or paid packages.

## 11. Testing matrix and acceptance criteria (all mandatory)

**Script fidelity:** import the supplied 00–12 Markdown and verify all sections and subheadings are correctly recognized, no prose lost, notes distinguished, original display order retained, and important speaker names exactly preserved. Check the four `THANKING...` jumps and Q&A subsections. Parse subsequent sample Markdown with unfamiliar headings/extra sections correctly.

**Input:** run local arrow tests, arrow-button tests, section boundary handling, global chord registration, focus switching to/from Zoom or another foreground app, and an opt-in arrow-capture permission-denied case. Editing text must not trigger navigation. Never steal Zoom typing silently. Invalid shortcuts must be reported.

**Window/UI:** at least manually verify a floating panel above another app, near-camera geometry, drag, resize, collapse to a dot, restore exact prior size/position, move dot, reopen, visible controls, minimizing while Zoom remains active, and recovery from menu-bar icon. Check transitions across Spaces and Zoom full screen to the extent the host can actually exercise them. Cover both display sizes/scalings in geometry unit tests and safely handle a disconnected external screen.

**Reading:** verify smooth precise animated scrolling at first, middle and last beat, high-DPI display, font resize/reflow without losing place, consecutive fast key presses, special thank-you waypoints, backup palette and exact return-to-live behavior, and readable contrast over changing backgrounds. Reduce Motion must stop decorative motion.

**Persistence:** quit/reopen and restore position/font/frame/script; edit with autosave and re-open; import/export; source never overwritten inside bundle; corrupted script recovers last-known-good; notes/checklist state persist; no Data Science details invented.

**Privacy/Zoom:** no network calls, no access to meeting data, no unfounded screen-share invisibility claim. Display a clear screen-share safety reminder. Do not request Accessibility/Input Monitoring until optional capture is explicitly enabled (unless platform requirements differ and then explain precisely). Default arrow-capture OFF when launching.

**Build:** clean release compile for Apple Silicon with no errors, unit tests green; fix warnings with practical impact, check launch without Xcode, package a real `.app` and local `.dmg` on a Mac with required tooling. Use ad hoc code signing if necessary for a personally installed unsigned/not-notarized app, and accurately document the local Gatekeeper approval path rather than falsely claiming an Apple-notarized build. Never bypass OS security protections without describing them.

**Visual:** one beautiful compact light Liquid Glass panel, legible large text near camera, bubble with smooth transform, native menus, no broken assets, no scrolling jitter, and no cramped controls. Don't present an untested design as 'perfect'.

## 12. Actual deliverables and final report

Produce:
1. Complete editable Xcode project, local bundle script resource, source code, tests and assets.
2. **Installable Release `Pathfinder Glass.app`** and, where possible, `Pathfinder-Glass.dmg` (not mock files).
3. `README.md`: minimum macOS version, one-command build instructions, personal installation, launch, floating panel placement, safe Zoom sharing, keyboard cheat sheet, global arrow permission handling, how to edit/replace scripts, and common recovery steps.
4. `build-release.sh` and `package-dmg.sh`, with clear failure on missing tools, reproducible output paths, and sensible settings.
5. A short accurate final build report: what was implemented, precise test commands/results, any known limitations, paths to verified produced artifacts, and the first 60-second setup steps on my Mac.

Execute this work now in the current repository. Inspect what is already available; create the project; write every needed file; build; run tests; fix failures; package; and verify the artifact paths. **Do not stop after producing a plan.** Make decisions that optimize the requested experience without asking for aesthetic revisions. The nonnegotiable requirements are: native macOS, genuine Liquid Glass, close-to-camera readable window, rock-solid navigation in the presence of Zoom, collapse-to-draggable-bubble, full faithful Pathfinder script, editable future scripts, and an actual launchable app.


---

## APPENDIX: VERBATIM DEFAULT SCRIPT RESOURCE

BEGIN BUNDLED PATHFINDER SCRIPT

# PATHFINDER ’26
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

END BUNDLED PATHFINDER SCRIPT
