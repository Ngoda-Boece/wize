import { z } from "zod";
import type { SummaryContent } from "@/lib/types";

const line = z.string().trim().min(1).max(600);
const list = (max: number) => z.array(line).max(max);

/** Schema for a session summary. Used to constrain the model output and to validate before storage. */
export const summarySchema = z.object({
  title: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(500),
  centralQuestion: line,
  keyConcepts: z.array(z.string().trim().min(1).max(80)).max(10),
  initialHypothesis: line.nullable(),
  arguments: list(10),
  counterArguments: list(10),
  misconceptionsClarified: list(10),
  openQuestions: list(10),
  takeaways: list(10),
  nextSteps: list(10),
  exercise: z.string().trim().min(1).max(1200),
}) satisfies z.ZodType<SummaryContent>;
