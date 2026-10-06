import { CheckboxField, InputField, SelectField, TextareaField } from "@/components/fields";
import {
  DEPTHS,
  DEPTH_LABELS,
  LEVELS,
  LEVEL_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
} from "@/lib/domain";

import { type Question } from "../schemas";

export function QuestionFormFields({
  topicId,
  question,
}: {
  topicId: string;
  question?: Question;
}) {
  const answerFor = (level: (typeof LEVELS)[number]) =>
    question?.answers.find((answer) => answer.level === level)?.answer ?? "";
  return (
    <>
      <input type="hidden" name="topicId" value={topicId} />
      <TextareaField
        label="Question"
        name="prompt"
        defaultValue={question?.prompt}
        required
        rows={3}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Type"
          name="type"
          defaultValue={question?.type ?? "CONCEPT"}
          options={QUESTION_TYPES.map((type) => ({
            value: type,
            label: QUESTION_TYPE_LABELS[type],
          }))}
        />
        <SelectField
          label="Depth probed"
          name="depth"
          defaultValue={question?.depth ?? "EXPLAIN"}
          options={DEPTHS.map((depth) => ({ value: depth, label: DEPTH_LABELS[depth].label }))}
        />
        <SelectField
          label="Format"
          name="format"
          defaultValue={question?.format ?? "OPEN"}
          options={[
            { value: "OPEN", label: "Open answer" },
            { value: "MCQ", label: "Multiple choice" },
          ]}
        />
      </div>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Answers by level (open questions)</legend>
        <p className="text-xs text-muted-foreground">
          Calibrate depth: a junior answer defines it, a senior answer covers trade-offs and design.
          Leave a level empty if it does not apply.
        </p>
        {LEVELS.map((level) => (
          <TextareaField
            key={level}
            label={LEVEL_LABELS[level]}
            name={`answer_${level}`}
            id={`f-answer-${level}`}
            defaultValue={answerFor(level)}
            rows={4}
          />
        ))}
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Multiple choice</legend>
        <TextareaField
          label="Options (one per line, up to 6)"
          name="options"
          defaultValue={question?.options.join("\n")}
          rows={4}
        />
        <InputField
          label="Correct option number (0 = first)"
          name="correctIndex"
          type="number"
          min="0"
          max="5"
          defaultValue={question?.correctIndex ?? ""}
        />
      </fieldset>

      <TextareaField
        label="Explanation / model answer"
        name="explanation"
        defaultValue={question?.explanation}
        rows={3}
        hint="Shown after answering a multiple-choice or diagnostic question."
      />
      <div className="flex flex-wrap gap-6">
        <CheckboxField
          label="Use in topic self-check"
          name="selfCheck"
          defaultChecked={question?.selfCheck ?? false}
        />
        <CheckboxField
          label="Use in diagnostic"
          name="diagnostic"
          defaultChecked={question?.diagnostic ?? false}
        />
      </div>
    </>
  );
}
