import { App, PluginSettingTab, Setting } from "obsidian";
import WorkoutTrackerPlugin from "../plugin";
import { ExerciseTemplateSettingModal } from "./ExerciseTemplateSettingModal";
import { WorkoutTemplateSettingModal } from "./WorkoutTemplateSettingModal";

export class WorkoutTrackerSettingTab extends PluginSettingTab {
  plugin: WorkoutTrackerPlugin;

  constructor(app: App, plugin: WorkoutTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Workout Journal Settings" });

    new Setting(containerEl)
      .setName("Default Workout Folder")
      .setDesc("Folder where workout files will be created")
      .addText((text) =>
        text
          .setPlaceholder("Workouts")
          .setValue(this.plugin.settings.defaultWorkoutFolder)
          .onChange(async (value) => {
            this.plugin.settings.defaultWorkoutFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Exercise Library Folder")
      .setDesc("Folder containing exercise definition notes")
      .addText((text) =>
        text
          .setPlaceholder("Workout Library/Exercises")
          .setValue(this.plugin.settings.exerciseLibraryFolder)
          .onChange(async (value) => {
            this.plugin.settings.exerciseLibraryFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Routines Folder")
      .setDesc("Folder containing routine definition notes")
      .addText((text) =>
        text
          .setPlaceholder("Workout Library/Routines")
          .setValue(this.plugin.settings.routinesFolder)
          .onChange(async (value) => {
            this.plugin.settings.routinesFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Workout Plans Folder")
      .setDesc("Folder containing workout plan definition notes")
      .addText((text) =>
        text
          .setPlaceholder("Workout Library/Plans")
          .setValue(this.plugin.settings.workoutPlansFolder)
          .onChange(async (value) => {
            this.plugin.settings.workoutPlansFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Performance CSV Path")
      .setDesc("CSV file used for previous values and target progression")
      .addText((text) =>
        text
          .setPlaceholder("Workouts/workout-performance.csv")
          .setValue(this.plugin.settings.performanceCsvPath)
          .onChange(async (value) => {
            this.plugin.settings.performanceCsvPath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enable Exercise Autocomplete")
      .setDesc("Show exercise suggestions when typing")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableAutoComplete)
          .onChange(async (value) => {
            this.plugin.settings.enableAutoComplete = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-sync Frontmatter")
      .setDesc(
        "Automatically sync frontmatter when workout files are manually edited"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableAutoSyncFrontmatter)
          .onChange(async (value) => {
            this.plugin.settings.enableAutoSyncFrontmatter = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-sync Delay")
      .setDesc(
        "Wait time (in milliseconds) after stopping typing before syncing frontmatter"
      )
      .addText((text) =>
        text
          .setPlaceholder("2000")
          .setValue(this.plugin.settings.autoSyncDelayMs.toString())
          .onChange(async (value) => {
            const delay = parseInt(value);
            if (!isNaN(delay) && delay >= 500) {
              // Minimum 500ms
              this.plugin.settings.autoSyncDelayMs = delay;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Date Format")
      .setDesc("Format for workout dates")
      .addText((text) =>
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Weight Unit")
      .setDesc("Global weight unit used across logging and stats")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("lb", "lb")
          .addOption("kg", "kg")
          .setValue(this.plugin.settings.weightUnit)
          .onChange(async (value) => {
            this.plugin.settings.weightUnit = value as "kg" | "lb";
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Migration" });
    new Setting(containerEl)
      .setName("Template Migration Status")
      .setDesc(
        this.plugin.settings.migration.completed
          ? `Completed at ${this.plugin.settings.migration.migratedAt}. Exercises: ${this.plugin.settings.migration.exerciseCount}, Routines: ${this.plugin.settings.migration.routineCount}.`
          : "Not yet migrated."
      )
      .addButton((btn) =>
        btn.setButtonText("Migrate Templates to Notes").onClick(async () => {
          await this.plugin.migrateTemplatesToNotes();
          this.display();
        })
      );

    // Exercise Templates Section
    containerEl.createEl("h3", { text: "Exercise Templates" });

    const exerciseTemplatesContainer = containerEl.createDiv();
    this.renderExerciseTemplates(exerciseTemplatesContainer);

    new Setting(containerEl).addButton((btn) =>
      btn
        .setButtonText("Add Exercise Template")
        .setCta()
        .onClick(() => {
          new ExerciseTemplateSettingModal(this.app, this.plugin, () => {
            this.renderExerciseTemplates(exerciseTemplatesContainer);
          }).open();
        })
    );

    // Workout Templates Section
    containerEl.createEl("h3", { text: "Workout Templates" });

    const workoutTemplatesContainer = containerEl.createDiv();
    this.renderWorkoutTemplates(workoutTemplatesContainer);

    new Setting(containerEl).addButton((btn) =>
      btn
        .setButtonText("Add Workout Template")
        .setCta()
        .onClick(() => {
          new WorkoutTemplateSettingModal(this.app, this.plugin, () => {
            this.renderWorkoutTemplates(workoutTemplatesContainer);
          }).open();
        })
    );

    // Note Content Templates Section
    containerEl.createEl("h3", { text: "Note Content Templates" });
    containerEl.createEl("p", {
      text: "Extra frontmatter properties (YAML) and body text appended to each generated note type. Plugin-managed properties (id, name, type, etc.) always take precedence over template frontmatter.",
      cls: "setting-item-description",
    });

    const noteTypes: Array<{ key: "exercise" | "routine" | "plan" | "workout"; label: string }> = [
      { key: "exercise", label: "Exercise Note" },
      { key: "routine", label: "Routine Note" },
      { key: "plan", label: "Plan Note" },
      { key: "workout", label: "Workout Note" },
    ];

    for (const { key, label } of noteTypes) {
      containerEl.createEl("h4", { text: label });

      new Setting(containerEl)
        .setName("Additional Frontmatter")
        .setDesc("YAML properties merged into the note frontmatter (plugin properties take precedence).")
        .addTextArea((ta) => {
          ta.setPlaceholder("tag: my-tag\nstatus: active")
            .setValue(this.plugin.settings.noteTemplates?.[key]?.frontmatter ?? "")
            .onChange(async (value) => {
              if (!this.plugin.settings.noteTemplates) {
                this.plugin.settings.noteTemplates = {};
              }
              if (!this.plugin.settings.noteTemplates[key]) {
                this.plugin.settings.noteTemplates[key] = {};
              }
              this.plugin.settings.noteTemplates[key]!.frontmatter = value;
              await this.plugin.saveSettings();
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
            .setValue(this.plugin.settings.noteTemplates?.[key]?.body ?? "")
            .onChange(async (value) => {
              if (!this.plugin.settings.noteTemplates) {
                this.plugin.settings.noteTemplates = {};
              }
              if (!this.plugin.settings.noteTemplates[key]) {
                this.plugin.settings.noteTemplates[key] = {};
              }
              this.plugin.settings.noteTemplates[key]!.body = value;
              await this.plugin.saveSettings();
            });
          ta.inputEl.rows = 6;
          ta.inputEl.style.width = "100%";
        });
    }
  }

  renderExerciseTemplates(container: HTMLElement) {
    container.empty();

    this.plugin.settings.exerciseTemplates.forEach((template, index) => {
      new Setting(container)
        .setName(template.name)
        .setDesc(`${template.type} | ${template.muscleGroups.join(", ")}`)
        .addButton((btn) =>
          btn
            .setButtonText("Remove")
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.exerciseTemplates.splice(index, 1);
              await this.plugin.saveSettings();
              this.renderExerciseTemplates(container);
            })
        );
    });
  }

  renderWorkoutTemplates(container: HTMLElement) {
    container.empty();

    this.plugin.settings.workoutTemplates.forEach((template, index) => {
      new Setting(container)
        .setName(template.name)
        .setDesc(
          `${template.exercises.join(", ")} | ${template.estimatedDuration} min`
        )
        .addButton((btn) =>
          btn
            .setButtonText("Remove")
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.workoutTemplates.splice(index, 1);
              await this.plugin.saveSettings();
              this.renderWorkoutTemplates(container);
            })
        );
    });
  }
}
