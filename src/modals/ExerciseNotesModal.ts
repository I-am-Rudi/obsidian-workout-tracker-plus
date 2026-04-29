import { App, Modal, Notice, Setting } from "obsidian";
import WorkoutTrackerPlugin from "../plugin";

export class ExerciseNotesModal extends Modal {
  private plugin: WorkoutTrackerPlugin;
  private exerciseId: string;
  private exerciseName: string;
  private notesValue: string;
  private onSave: (notes: string) => void;

  constructor(
    app: App,
    plugin: WorkoutTrackerPlugin,
    exerciseId: string,
    exerciseName: string,
    currentNotes: string,
    onSave: (notes: string) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.exerciseId = exerciseId;
    this.exerciseName = exerciseName;
    this.notesValue = currentNotes;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Notes: ${this.exerciseName}` });
    contentEl.createEl("p", {
      text: "Saved to the exercise definition. Use this for machine settings, form cues, etc.",
      cls: "workout-exercise-notes-modal-desc",
    });

    new Setting(contentEl).setName("Exercise Notes").addTextArea((text) => {
      text
        .setPlaceholder("e.g., Machine setting: pin 5, seat position 3…")
        .setValue(this.notesValue)
        .onChange((value) => {
          this.notesValue = value;
        });
      text.inputEl.rows = 6;
      text.inputEl.style.width = "100%";
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Save")
          .setCta()
          .onClick(async () => {
            await this.saveNotes();
          })
      )
      .addButton((btn) =>
        btn.setButtonText("Cancel").onClick(() => this.close())
      );
  }

  private async saveNotes(): Promise<void> {
    const exercises = await this.plugin.definitionService.loadExerciseDefinitions();
    const def = exercises.find(
      (ex) => ex.id === this.exerciseId || ex.name === this.exerciseName
    );
    if (!def) {
      new Notice(`Could not find exercise definition for "${this.exerciseName}".`);
      return;
    }
    def.notes = this.notesValue.trim() || undefined;
    await this.plugin.definitionService.createExerciseDefinition(def);
    new Notice(`Exercise notes saved for "${this.exerciseName}".`);
    this.onSave(this.notesValue.trim());
    this.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}
