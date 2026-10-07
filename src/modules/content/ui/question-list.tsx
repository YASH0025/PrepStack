"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Brain, Check, ChevronDown } from "lucide-react";

import { RichText } from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LEVELS,
  LEVEL_LABELS,
  type Level,
  QUESTION_TYPE_LABELS,
  type QuestionType,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { toggleSavedQuestionAction } from "@/modules/progress/actions";
import { addQuestionToReviewAction } from "@/modules/review/actions";

export interface ClientQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  answers: { level: Level; answer: string }[];
}

/**
 * Interview questions with answers calibrated to Junior/Mid/Senior level.
 * The default level comes from the user's experience band.
 */
export function QuestionList({
  questions,
  defaultLevel,
  savedIds = [],
  reviewIds = [],
  canSave = false,
}: {
  questions: ClientQuestion[];
  defaultLevel: Level;
  savedIds?: string[];
  /** Questions that already have a review card. */
  reviewIds?: string[];
  canSave?: boolean;
}) {
  const [level, setLevel] = useState<Level>(defaultLevel);
  return (
    <div className="grid gap-4">
      <Tabs value={level} onValueChange={(value) => setLevel(value as Level)}>
        <TabsList aria-label="Answer level">
          {LEVELS.map((item) => (
            <TabsTrigger key={item} value={item}>
              {LEVEL_LABELS[item]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <ul className="grid gap-3">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            level={level}
            initiallySaved={savedIds.includes(question.id)}
            initiallyInReview={reviewIds.includes(question.id)}
            canSave={canSave}
          />
        ))}
      </ul>
    </div>
  );
}

function QuestionCard({
  question,
  level,
  initiallySaved,
  initiallyInReview,
  canSave,
}: {
  question: ClientQuestion;
  level: Level;
  initiallySaved: boolean;
  initiallyInReview: boolean;
  canSave: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(initiallySaved);
  const [inReview, setInReview] = useState(initiallyInReview);
  const [pending, startTransition] = useTransition();
  const answer =
    question.answers.find((entry) => entry.level === level) ??
    question.answers.find((entry) => entry.level === "MID") ??
    question.answers[0];
  const answerId = `answer-${question.id}`;

  return (
    <li className="grid gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <div className="grid min-w-0 flex-1 gap-2">
          <Badge variant="outline">{QUESTION_TYPE_LABELS[question.type]}</Badge>
          <RichText source={question.prompt} className="font-medium" />
        </div>
        {canSave && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved questions" : "Save question"}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await toggleSavedQuestionAction(question.id);
                if (result.ok) setSaved(result.data.saved);
              })
            }
          >
            {saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
          {open
            ? "Hide answer"
            : `Show ${LEVEL_LABELS[answer?.level ?? level].toLowerCase()} answer`}
        </Button>
        {canSave && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || inReview}
            onClick={() =>
              startTransition(async () => {
                const result = await addQuestionToReviewAction(question.id);
                if (result.ok) setInReview(true);
              })
            }
          >
            {inReview ? <Check /> : <Brain />}
            {inReview ? "In review" : "Add to review"}
          </Button>
        )}
      </div>
      {open && answer && (
        <div id={answerId} className="rounded-lg bg-muted/40 p-3">
          <RichText source={answer.answer} />
        </div>
      )}
    </li>
  );
}
