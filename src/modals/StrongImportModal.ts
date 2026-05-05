import { App, Modal, Notice, Setting } from "obsidian";
import WorkoutTrackerPlugin from "../plugin";
import {
  StrongImportService,
  StrongImportOptions,
  parseStrongWorkoutsCsv,
  parseStrongExercisesCsv,
} from "../utils/strongImportService";
import { Workout, ExerciseDefinition } from "../types";

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export class StrongImportModal extends Modal {
  private plugin: WorkoutTrackerPlugin;
  private importService: StrongImportService;

  private parsedWorkouts: Workout[] = [];
  private parsedExerciseDefs: ExerciseDefinition[] = [];

  private options: StrongImportOptions = {
    createWorkoutNotes: true,
    addToPerformanceCsv: true,
    importExerciseDefinitions: false,
    skipDuplicates: true,
  };

  // UI elements that are updated dynamically
  private previewEl!: HTMLElement;
  private exerciseImportToggleEl!: HTMLElement;
  private importBtnEl!: HTMLButtonElement;
  private workoutsFileLabel!: HTMLElement;
  private exercisesFileLabel!: HTMLElement;
  private errorEl!: HTMLElement;

  constructor(app: App, plugin: WorkoutTrackerPlugin) {
    super(app);
    this.plugin = plugin;
    this.importService = new StrongImportService(
      app,
      plugin.performanceCsvService,
      plugin.fileService,
      plugin.definitionService
    );
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("strong-import-modal");

    contentEl.createEl("h2", { text: "Import from Strong App" });
    contentEl.createEl("p", {
      text: "Import your workout history exported from the Strong app.",
      cls: "setting-item-description",
    });

    // ── Workouts CSV ──────────────────────────────────────────────────────
    contentEl.createEl("h3", { text: "Workouts" });

    const workoutsInput = contentEl.createEl("input");
    workoutsInput.type = "file";
    workoutsInput.accept = ".csv";
    workoutsInput.style.display = "none";

    this.workoutsFileLabel = contentEl.createEl("p", {
      text: "No file selected",
      cls: "setting-item-description",
    });

    new Setting(contentEl)
      .setName("workouts.csv")
      .setDesc('Export your workouts from Strong: Profile → Settings → Export Data → "Workouts CSV"')
      .addButton((btn) =>
        btn.setButtonText("Choose file…").onClick(() => workoutsInput.click())
      );

    workoutsInput.addEventListener("change", async () => {
      const file = workoutsInput.files?.[0];
      if (!file) return;
      this.workoutsFileLabel.setText(`Selected: ${file.name}`);
      this.clearError();
      try {
        const content = await readFileAsText(file);
        this.parsedWorkouts = parseStrongWorkoutsCsv(content);
        this.updatePreview();
        this.importBtnEl.disabled = false;
      } catch (err) {
        this.showError(`Failed to parse workouts.csv: ${(err as Error).message}`);
      }
    });

    // ── Exercises CSV ─────────────────────────────────────────────────────
    contentEl.createEl("h3", { text: "Exercise Library (optional)" });

    const exercisesInput = contentEl.createEl("input");
    exercisesInput.type = "file";
    exercisesInput.accept = ".csv";
    exercisesInput.style.display = "none";

    this.exercisesFileLabel = contentEl.createEl("p", {
      text: "No file selected",
      cls: "setting-item-description",
    });

    new Setting(contentEl)
      .setName("exercises.csv")
      .setDesc(
        'Optionally import your exercise library from Strong: Profile → Settings → Export Data → "Exercises CSV". Notes from exercises.csv are written into the body of each exercise note.'
      )
      .addButton((btn) =>
        btn
          .setButtonText("Choose file…")
          .onClick(() => exercisesInput.click())
      );

    exercisesInput.addEventListener("change", async () => {
      const file = exercisesInput.files?.[0];
      if (!file) return;
      this.exercisesFileLabel.setText(`Selected: ${file.name}`);
      this.clearError();
      try {
        const content = await readFileAsText(file);
        this.parsedExerciseDefs = parseStrongExercisesCsv(content);
        this.exerciseImportToggleEl.style.display = "";
        this.options.importExerciseDefinitions = true;
        this.updatePreview();
      } catch (err) {
        this.showError(`Failed to parse exercises.csv: ${(err as Error).message}`);
      }
    });

    // ── Options ───────────────────────────────────────────────────────────
    contentEl.createEl("h3", { text: "Options" });

    // Weight unit warning
    const configuredUnit = this.plugin.settings.weightUnit;
    contentEl.createEl("p", {
      text: `ℹ️ Strong exports weights in the unit you used in the app. This plugin is configured to use "${configuredUnit}". Weights are imported as-is — verify your Strong unit matches.`,
      cls: "setting-item-description",
    });

    new Setting(contentEl)
      .setName("Create workout notes")
      .setDesc("Write one Markdown note per workout into your workout folder.")
      .addToggle((toggle) =>
        toggle.setValue(this.options.createWorkoutNotes).onChange((v) => {
          this.options.createWorkoutNotes = v;
        })
      );

    new Setting(contentEl)
      .setName("Skip duplicate workouts")
      .setDesc(
        "Skip workouts whose note file already exists (same date + name)."
      )
      .addToggle((toggle) =>
        toggle.setValue(this.options.skipDuplicates).onChange((v) => {
          this.options.skipDuplicates = v;
        })
      );

    new Setting(contentEl)
      .setName("Add to performance CSV")
      .setDesc("Append imported sets to the performance tracking CSV.")
      .addToggle((toggle) =>
        toggle.setValue(this.options.addToPerformanceCsv).onChange((v) => {
          this.options.addToPerformanceCsv = v;
        })
      );

    this.exerciseImportToggleEl = contentEl.createDiv();
    this.exerciseImportToggleEl.style.display = "none";
    new Setting(this.exerciseImportToggleEl)
      .setName("Import exercise definitions")
      .setDesc(
        "Create or update exercise notes from the exercises.csv library. Notes from exercises.csv are placed in the body of each exercise note."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.options.importExerciseDefinitions)
          .onChange((v) => {
            this.options.importExerciseDefinitions = v;
          })
      );

    // ── Preview ───────────────────────────────────────────────────────────
    contentEl.createEl("h3", { text: "Preview" });
    this.previewEl = contentEl.createEl("p", {
      text: "Load a workouts.csv file to see a preview.",
      cls: "setting-item-description",
    });

    // ── Error area ────────────────────────────────────────────────────────
    this.errorEl = contentEl.createEl("p", { cls: "mod-warning" });
    this.errorEl.style.display = "none";

    // ── Import button ─────────────────────────────────────────────────────
    const btnSetting = new Setting(contentEl);
    this.importBtnEl = btnSetting.controlEl.createEl("button", {
      text: "Import",
      cls: "mod-cta",
    });
    this.importBtnEl.disabled = true;
    this.importBtnEl.addEventListener("click", () => this.runImport());
  }

  onClose() {
    this.contentEl.empty();
  }

  private updatePreview() {
    const summary = this.importService.summarize(this.parsedWorkouts);
    const dr = summary.dateRange;
    const dateRange = dr ? `${dr.earliest} → ${dr.latest}` : "—";
    const exerciseLine =
      this.parsedExerciseDefs.length > 0
        ? ` | ${this.parsedExerciseDefs.length} exercise definitions loaded`
        : "";
    this.previewEl.setText(
      `${this.parsedWorkouts.length} workouts found` +
        ` | ${summary.uniqueExerciseCount} unique exercises` +
        ` | Date range: ${dateRange}` +
        exerciseLine
    );
  }

  private showError(msg: string) {
    this.errorEl.setText(msg);
    this.errorEl.style.display = "";
  }

  private clearError() {
    this.errorEl.style.display = "none";
    this.errorEl.setText("");
  }

  private async runImport() {
    this.importBtnEl.disabled = true;
    this.importBtnEl.setText("Importing…");
    this.clearError();

    try {
      const result = await this.importService.importAll(
        this.parsedWorkouts,
        this.parsedExerciseDefs,
        this.options
      );

      const parts: string[] = [];
      if (this.options.createWorkoutNotes) {
        parts.push(`${result.workoutsCreated} workouts created`);
        if (result.workoutsSkipped > 0)
          parts.push(`${result.workoutsSkipped} skipped`);
      }
      if (this.options.importExerciseDefinitions && result.exercisesImported > 0)
        parts.push(`${result.exercisesImported} exercises imported`);

      new Notice(`Strong import complete: ${parts.join(", ")}.`);

      if (result.errors.length > 0) {
        this.showError(
          `Import completed with ${result.errors.length} error(s):\n` +
            result.errors.join("\n")
        );
        this.importBtnEl.setText("Import");
        this.importBtnEl.disabled = false;
      } else {
        this.close();
      }
    } catch (err) {
      this.showError(`Import failed: ${(err as Error).message}`);
      this.importBtnEl.setText("Import");
      this.importBtnEl.disabled = false;
    }
  }
}
