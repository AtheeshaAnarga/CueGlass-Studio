import SwiftUI
import AppKit
import UniformTypeIdentifiers

public struct ScriptEditorView: View {
    @ObservedObject public var coordinator: AppCoordinator
    @ObservedObject private var navigation: ScriptNavigationController
    @State private var findText: String = ""
    @State private var replaceText: String = ""
    @State private var showRestoreConfirmation: Bool = false
    @State private var revisions: [ScriptRevision] = []
    @State private var copiedAIPrompt: Bool = false

    public init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        self.navigation = coordinator.navigation
    }

    private var isDark: Bool {
        coordinator.settings.themeMode == .dark
    }

    public var body: some View {
        AppleLiquidGlassContainer(spacing: 8) {
            VStack(spacing: 0) {
                editorToolbar
                Divider()
                HSplitView {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            TextField("Find…", text: $findText)
                                .textFieldStyle(.plain)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .modifier(
                                    AppleLiquidGlassSurfaceModifier(
                                        cornerRadius: 99,
                                        isCapsule: true,
                                        variant: coordinator.settings.glassVariant,
                                        tintColor: nil,
                                        interactive: true,
                                        isDark: isDark,
                                        liquidness: coordinator.settings.liquidness
                                    )
                                )
                            TextField("Replace…", text: $replaceText)
                                .textFieldStyle(.plain)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .modifier(
                                    AppleLiquidGlassSurfaceModifier(
                                        cornerRadius: 99,
                                        isCapsule: true,
                                        variant: coordinator.settings.glassVariant,
                                        tintColor: nil,
                                        interactive: true,
                                        isDark: isDark,
                                        liquidness: coordinator.settings.liquidness
                                    )
                                )
                            Button("Replace All") {
                                guard !findText.isEmpty else { return }
                                let updated = coordinator.editorDraftMarkdown.replacingOccurrences(of: findText, with: replaceText)
                                coordinator.applyEditedMarkdown(updated, label: "Find & Replace")
                                refreshRevisions()
                            }
                            .appleLiquidGlassButton(prominent: false, isDark: isDark)
                        }
                        .padding(.horizontal, 12)
                        .padding(.top, 8)

                        TextEditor(
                            text: Binding(
                                get: { coordinator.editorDraftMarkdown },
                                set: { newValue in
                                    coordinator.applyEditedMarkdown(newValue, label: "Autosave")
                                }
                            )
                        )
                        .font(.system(size: 13, design: .monospaced))
                        .padding(8)
                    }
                    .frame(minWidth: 420)

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("STRUCTURED SCRIPT SYNTAX GUIDE")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.secondary)
                            Spacer()
                            Button {
                                NSPasteboard.general.clearContents()
                                NSPasteboard.general.setString(ScriptStore.universalAIMasterPrompt, forType: .string)
                                copiedAIPrompt = true
                                DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
                                    copiedAIPrompt = false
                                }
                            } label: {
                                Label(copiedAIPrompt ? "Copied AI Prompt!" : "Copy AI Prompt", systemImage: copiedAIPrompt ? "checkmark.circle.fill" : "doc.on.doc")
                                    .font(.system(size: 10.5, weight: .semibold))
                            }
                            .appleLiquidGlassButton(prominent: true, isDark: isDark)
                        }

                        Text("• ## 00 — Title: Top-level section\n• ### Subtitle: Internal waypoint / Q&A / Backup line\n• *[Organizer Cue: ...]*: Amber stage note\n• *[If ...]*: Violet conditional branch\n• *[Timing: ...]*: Cyan pacing target\n• *[Slide: ...]*: Emerald AV/slide cue\n• *[Tone: ...]*: Rose vocal delivery coaching\n• *[Action: ...]*: Indigo physical action\n• [PAUSE] / [BEAT]: Spoken breath marker\n• [Placeholder]: Interactive fill-in field")
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                            .padding(10)
                            .modifier(
                                AppleLiquidGlassSurfaceModifier(
                                    cornerRadius: 10,
                                    variant: coordinator.settings.glassVariant,
                                    tintColor: nil,
                                    interactive: false,
                                    isDark: isDark,
                                    liquidness: coordinator.settings.liquidness
                                )
                            )

                        Text("PARSED SECTIONS (\(navigation.document.sections.count))")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        List(navigation.document.sections) { sec in
                            HStack {
                                Text(sec.numberBadge)
                                    .font(.system(size: 11, weight: .bold).monospacedDigit())
                                Text(sec.rawTitle)
                                    .font(.system(size: 12))
                                Spacer()
                                Text("\(sec.navigableBeats.count) beats")
                                    .font(.system(size: 11))
                                    .foregroundColor(.secondary)
                            }
                        }

                        Text("ROLLING VERSIONS (MAX 5)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)

                        ForEach(revisions) { rev in
                            HStack {
                                Text(rev.label)
                                    .font(.system(size: 11.5, weight: .medium))
                                Spacer()
                                Button("Restore") {
                                    if let content = coordinator.scriptStore.loadRevision(rev) {
                                        coordinator.applyEditedMarkdown(content, label: "Restored \(rev.label)")
                                        refreshRevisions()
                                    }
                                }
                                .font(.system(size: 11))
                                .appleLiquidGlassButton(prominent: false, isDark: isDark)
                            }
                        }
                    }
                    .padding(12)
                    .frame(minWidth: 320, maxWidth: 380)
                }
            }
        }
        .onAppear {
            refreshRevisions()
        }
        .alert("Restore Universal Master Script & AI Blueprint?", isPresented: $showRestoreConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Restore Universal Blueprint", role: .destructive) {
                coordinator.restoreBundledOriginalScript()
                refreshRevisions()
            }
        } message: {
            Text("Your current working copy will be backed up in Rolling Versions before restoring the Universal Master Script & AI Blueprint.")
        }
    }

    private var editorToolbar: some View {
        HStack(spacing: 10) {
            Text("Working Copy: ~/Library/Application Support/PathfinderGlass/WorkingScript.md")
                .font(.system(size: 11.5))
                .foregroundColor(.secondary)
            Spacer()
            if let err = coordinator.lastSaveError {
                Text(err)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.red)
            }
            Button {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(ScriptStore.universalAIMasterPrompt, forType: .string)
                copiedAIPrompt = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
                    copiedAIPrompt = false
                }
            } label: {
                Label(copiedAIPrompt ? "Copied AI Instructions!" : "Copy AI Prompt & Examples", systemImage: copiedAIPrompt ? "checkmark" : "sparkles")
            }
            .appleLiquidGlassButton(prominent: true, isDark: isDark)

            Button("Save Snapshot") {
                coordinator.applyEditedMarkdown(coordinator.editorDraftMarkdown, label: "Manual Snapshot")
                refreshRevisions()
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark)

            Button("Restore Universal Blueprint…") {
                showRestoreConfirmation = true
            }
            .appleLiquidGlassButton(prominent: false, isDark: isDark)
        }
        .padding(12)
    }

    private func refreshRevisions() {
        revisions = coordinator.scriptStore.listRevisions()
    }
}
