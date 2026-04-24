import { ItemView, Notice, Setting, WorkspaceLeaf } from "obsidian";
import WorkoutTrackerPlugin from "../plugin";
import { SessionFinishOptions, WorkoutSession } from "../types";

export const WORKOUT_SESSION_VIEW_TYPE = "workout-tracker-session-view";

export class WorkoutSessionView extends ItemView {
  plugin: WorkoutTrackerPlugin;
  session: WorkoutSession | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: WorkoutTrackerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return WORKOUT_SESSION_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Workout Session";
  }

  async onOpen() {
    this.session = this.plugin.activeSession;
    this.render();
  }

  async onClose() {
    this.contentEl.empty();
  }

  setSession(session: WorkoutSession) {
    this.session = session;
    this.render();
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("workout-session-view");

    if (!this.session) {
      contentEl.createEl("p", { text: "No active workout session." });
      return;
    }

    contentEl.createEl("h2", { text: this.session.name });
    const meta = contentEl.createEl("p", { cls: "workout-session-meta" });
    meta.setText(
      `${this.session.date}${
        this.session.routineName ? ` • Routine: ${this.session.routineName}` : ""
      }${this.session.planName ? ` • Plan: ${this.session.planName}` : ""}`
    );

    this.session.exercises.forEach((exercise) => {
      const card = contentEl.createDiv({ cls: "workout-session-card" });
      card.createEl("h3", { text: exercise.exerciseName });

      const table = card.createEl("table", { cls: "workout-session-table" });
      const header = table.createEl("tr");
      ["Set", "Prev", "Target", "Actual", "Done"].forEach((label) => {
        header.createEl("th", { text: label });
      });

      exercise.sets.forEach((set) => {
        const row = table.createEl("tr", {
          cls: set.completed ? "workout-session-row-completed" : "",
        });

        row.createEl("td", { text: String(set.setIndex) });
        row.createEl("td", {
          text:
            set.previousWeight !== undefined || set.previousReps !== undefined
              ? `${set.previousWeight ?? "-"} × ${set.previousReps ?? "-"}`
              : "-",
        });

        const targetCell = row.createEl("td");
        this.renderSetEditor(targetCell, set.targetWeight, set.targetReps, (weight, reps) => {
          set.targetWeight = weight;
          set.targetReps = reps;
          this.session!.hasRoutineChanges = true;
        });

        const actualCell = row.createEl("td");
        this.renderSetEditor(actualCell, set.actualWeight, set.actualReps, (weight, reps) => {
          set.actualWeight = weight;
          set.actualReps = reps;
        });

        const doneCell = row.createEl("td");
        const done = doneCell.createEl("input", { type: "checkbox" });
        done.checked = set.completed;
        done.onchange = () => {
          set.completed = done.checked;
          exercise.completed = exercise.sets.every((exerciseSet) => exerciseSet.completed);
          row.toggleClass("workout-session-row-completed", set.completed);
        };
      });

      new Setting(card).addButton((btn) =>
        btn.setButtonText("Add Set").onClick(() => {
          exercise.sets.push({
            setIndex: exercise.sets.length + 1,
            completed: false,
            targetReps:
              exercise.sets.length > 0
                ? exercise.sets[exercise.sets.length - 1].targetReps
                : undefined,
            targetWeight:
              exercise.sets.length > 0
                ? exercise.sets[exercise.sets.length - 1].targetWeight
                : undefined,
            actualReps:
              exercise.sets.length > 0
                ? exercise.sets[exercise.sets.length - 1].actualReps ??
                  exercise.sets[exercise.sets.length - 1].targetReps
                : undefined,
            actualWeight:
              exercise.sets.length > 0
                ? exercise.sets[exercise.sets.length - 1].actualWeight ??
                  exercise.sets[exercise.sets.length - 1].targetWeight
                : undefined,
          });
          this.session!.hasRoutineChanges = true;
          this.render();
        })
      );
    });

    new Setting(contentEl)
      .setName("Workout Notes")
      .addTextArea((text) =>
        text.setValue(this.session.notes || "").onChange((value) => {
          this.session!.notes = value;
        })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Finish Workout")
          .setCta()
          .onClick(async () => {
            await this.plugin.finishActiveSessionFromView();
          })
      )
      .addButton((btn) =>
        btn.setButtonText("Cancel Session").setWarning().onClick(() => {
          this.plugin.activeSession = null;
          this.render();
          new Notice("Workout session cancelled.");
        })
      );
  }

  private renderSetEditor(
    container: HTMLElement,
    weight: number | undefined,
    reps: number | undefined,
    onChange: (weight: number | undefined, reps: number | undefined) => void
  ) {
    const wrapper = container.createDiv({ cls: "workout-session-set-editor" });
    const weightInput = wrapper.createEl("input", {
      type: "number",
      placeholder: "Weight",
    });
    weightInput.value = weight !== undefined ? String(weight) : "";

    const repsInput = wrapper.createEl("input", {
      type: "number",
      placeholder: "Reps",
    });
    repsInput.value = reps !== undefined ? String(reps) : "";

    const update = () => {
      const nextWeight = weightInput.value ? parseFloat(weightInput.value) : undefined;
      const nextReps = repsInput.value ? parseInt(repsInput.value) : undefined;
      onChange(nextWeight, nextReps);
    };

    weightInput.onchange = update;
    repsInput.onchange = update;
  }

  async finishWithOptions(options: SessionFinishOptions): Promise<void> {
    await this.plugin.finishActiveSession(options);
  }
}
