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
