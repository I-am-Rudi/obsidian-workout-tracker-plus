import { App, Modal, Notice, Setting } from "obsidian";
import { Exercise, ExerciseSet } from "../types";
import WorkoutTrackerPlugin from "../plugin";

export class ExerciseModal extends Modal {
  plugin: WorkoutTrackerPlugin;
  exercise: Exercise;
  onSubmit: (exercise: Exercise) => void;
  isEditing: boolean;

  constructor(
    app: App,
    plugin: WorkoutTrackerPlugin,
    onSubmit: (exercise: Exercise) => void,
    existingExercise?: Exercise
  ) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
    this.isEditing = !!existingExercise;
    this.exercise = existingExercise
      ? { ...existingExercise }
      : {
          name: "",
          sets: [],
        };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", {
      text: this.isEditing ? "Edit exercise" : "Add exercise",
    });

    // Exercise name with autocomplete from templates
    const nameContainer = contentEl.createDiv();
    new Setting(nameContainer).setName("Exercise name").addText((text) => {
      text
        .setPlaceholder("Enter exercise name")
        .setValue(this.exercise.name)
        .onChange((value) => {
          this.exercise.name = value;
        });

      // Add datalist for autocomplete
      const datalist = nameContainer.createEl("datalist");
      datalist.id = "exercise-suggestions";
      text.inputEl.setAttribute("list", "exercise-suggestions");

      this.plugin.settings.exerciseTemplates.forEach((template) => {
        const option = datalist.createEl("option");
        option.value = template.name;
      });
    });

    // Load from template button
    new Setting(contentEl).addButton((btn) =>
      btn.setButtonText("Load from template").onClick(() => {
        void (async () => {
          const template = this.plugin.settings.exerciseTemplates.find(
            (t) => t.name === this.exercise.name
          );
          if (!template?.defaultSets) {
            return;
          }

          const definitions = await this.plugin.definitionService.loadExerciseDefinitions();
          const definition = definitions.find((def) => def.name === template.name);
          const reps = definition?.lastPerformedReps ?? template.defaultReps;
          const weight = definition?.lastPerformedWeight ?? template.defaultWeight;
          for (let i = 0; i < template.defaultSets; i++) {
            this.exercise.sets.push({
              reps,
              weight,
              duration: template.defaultDuration,
            });
          }
          this.renderSets(setsContainer);
        })();
      })
    );

    // Sets section
    const setsContainer = contentEl.createDiv();
    this.renderSets(setsContainer);

    // Add set button
    new Setting(contentEl).addButton((btn) =>
      btn.setButtonText("Add set").onClick(() => {
        this.exercise.sets.push({});
        this.renderSets(setsContainer);
      })
    );

    // Notes
    new Setting(contentEl).setName("Notes").addTextArea((text) =>
      text
        .setPlaceholder("Exercise notes...")
        .setValue(this.exercise.notes || "")
        .onChange((value) => {
          this.exercise.notes = value;
        })
    );

    // Submit button
    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText(this.isEditing ? "Update exercise" : "Add exercise")
        .setCta()
        .onClick(() => {
          if (this.exercise.name) {
            this.onSubmit(this.exercise);
            this.close();
          } else {
            new Notice("Please enter an exercise name");
          }
        })
    );
  }

  renderSets(container: HTMLElement) {
    container.empty();
    if (this.exercise.sets.length === 0) {
      container.createEl("p", { text: "No sets added yet." });
      return;
    }

    container.createEl("h4", { text: "Sets:" });

    this.exercise.sets.forEach((set, index) => {
      const setContainer = container.createDiv({
        cls: "workout-set-container",
      });
      setContainer.createEl("h5", { text: `Set ${index + 1}` });

      // Reps
      new Setting(setContainer).setName("Reps").addText((text) =>
        text
          .setPlaceholder("12")
          .setValue(set.reps?.toString() || "")
          .onChange((value) => {
            set.reps = value ? parseInt(value) : undefined;
          })
      );

      // Weight
      new Setting(setContainer)
        .setName(`Weight (${this.plugin.settings.weightUnit})`)
        .addText((text) =>
        text
          .setPlaceholder("135")
          .setValue(set.weight?.toString() || "")
          .onChange((value) => {
            set.weight = value ? parseFloat(value) : undefined;
          })
      );

      // Duration
      new Setting(setContainer).setName("Duration (minutes)").addText((text) =>
        text
          .setPlaceholder("30")
          .setValue(set.duration?.toString() || "")
          .onChange((value) => {
            set.duration = value ? parseFloat(value) : undefined;
          })
      );

      // Remove set button
      new Setting(setContainer).addButton((btn) =>
        btn
          .setButtonText("Remove set")
          .setWarning()
          .onClick(() => {
            this.exercise.sets.splice(index, 1);
            this.renderSets(container);
          })
      );
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
