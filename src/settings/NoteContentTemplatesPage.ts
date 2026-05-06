import { Setting } from "obsidian";
import WorkoutTrackerPlugin from "../plugin";

const NOTE_TYPES: Array<{ key: "exercise" | "routine" | "plan" | "workout"; label: string }> = [
  { key: "exercise", label: "Exercise Note" },
  { key: "routine", label: "Routine Note" },
  { key: "plan", label: "Plan Note" },
  { key: "workout", label: "Workout Note" },
];

export class NoteContentTemplatesPage {
  render(containerEl: HTMLElement, plugin: WorkoutTrackerPlugin, onBack: () => void): void {
    containerEl.empty();

    new Setting(containerEl)
      .addButton((btn) =>
        btn.setButtonText("← General Settings").onClick(() => {
          onBack();
        })
      );

    containerEl.createEl("h2", { text: "Note Content Templates" });
    containerEl.createEl("p", {
      text: "Extra frontmatter properties (YAML) and body text appended to each generated note type. Plugin-managed properties (wj-id, wj-name, wj-type, etc.) always take precedence over template frontmatter.",
      cls: "setting-item-description",
    });

    for (const { key, label } of NOTE_TYPES) {
      containerEl.createEl("h3", { text: label });

      new Setting(containerEl)
        .setName("Additional Frontmatter")
        .setDesc("YAML properties merged into the note frontmatter (plugin properties take precedence).")
        .addTextArea((ta) => {
          ta.setPlaceholder("tag: my-tag\nstatus: active")
            .setValue(plugin.settings.noteTemplates?.[key]?.frontmatter ?? "")
            .onChange(async (value) => {
              if (!plugin.settings.noteTemplates) {
                plugin.settings.noteTemplates = {};
              }
              if (!plugin.settings.noteTemplates[key]) {
                plugin.settings.noteTemplates[key] = {};
              }
              plugin.settings.noteTemplates[key]!.frontmatter = value;
              await plugin.saveSettings();
            });
          ta.inputEl.rows = 4;
          ta.inputEl.style.width = "100%";
          ta.inputEl.style.fontFamily = "monospace";
        });

      new Setting(containerEl)
        .setName("Additional Body")
        .setDesc("Markdown text appended beneath the generated note content.")
        .addTextArea((ta) => {
          ta.setPlaceholder("## My Section\n\nCustom content here…")
            .setValue(plugin.settings.noteTemplates?.[key]?.body ?? "")
            .onChange(async (value) => {
              if (!plugin.settings.noteTemplates) {
                plugin.settings.noteTemplates = {};
              }
              if (!plugin.settings.noteTemplates[key]) {
                plugin.settings.noteTemplates[key] = {};
              }
              plugin.settings.noteTemplates[key]!.body = value;
              await plugin.saveSettings();
            });
          ta.inputEl.rows = 6;
          ta.inputEl.style.width = "100%";
        });
    }
  }
}
