export const SURVEY_VERSION = "needs-v1";
export const outcomes = { solved: "Fully", partial: "Partly", unsolved: "Not yet", unsure: "Not sure" } as const;
export const occupations = { designer: "Designer", photographer: "Photographer", creator: "Content creator", ecommerce: "E-commerce", developer: "Developer", student: "Student", other: "Other" } as const;
export const ages = ["18–24", "25–34", "35–44", "45–54", "55+"] as const;
export type FeedbackTrigger = "time" | "download" | "manual" | "error";
export type FeedbackOutcome = keyof typeof outcomes | "";
export interface FeedbackAnswers {
  outcome: FeedbackOutcome;
  need: string;
  occupation: keyof typeof occupations | "";
  otherOccupation: string;
  age: typeof ages[number] | "";
  suggestion: string;
  email: string;
  contactConsent: boolean;
}
export interface FeedbackSubmission extends FeedbackAnswers {
  id: string;
  version: typeof SURVEY_VERSION;
  trigger: FeedbackTrigger;
  path: string;
}
export const emptyAnswers: FeedbackAnswers = { outcome: "", need: "", occupation: "", otherOccupation: "", age: "", suggestion: "", email: "", contactConsent: false };
export const toolPaths = new Set(["/", "/workspace", "/metadata-checker", "/remove-metadata-from-png", "/remove-ai-detection-from-image"]);
export function safeFeedbackPath(path: string): string {
  return toolPaths.has(path) || ["/about", "/pricing", "/guides", "/privacy", "/terms", "/feedback"].includes(path) ? path : path.startsWith("/guides/") ? "/guides" : "other";
}
export function hasAnswer(answers: FeedbackAnswers): boolean {
  return Boolean(answers.outcome || answers.need.trim() || answers.occupation || answers.otherOccupation.trim() || answers.age || answers.suggestion.trim() || answers.email.trim());
}
export function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}
export function parseSubmission(value: unknown): FeedbackSubmission {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Please check your answers.");
  const data = value as Record<string, unknown>;
  const allowed = new Set(["id", "version", "trigger", "path", "website", ...Object.keys(emptyAnswers)]);
  if (Object.keys(data).some(key => !allowed.has(key)) || (data.website !== undefined && data.website !== "")) throw new Error("Please check your answers.");
  function string(key: string, max: number) {
    const val = data[key];
    if (typeof val !== "string" || val.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(val)) throw new Error("Please check your answers and their length.");
    return val.trim();
  }
  const id = string("id", 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Please reopen the feedback form.");
  if (data.version !== SURVEY_VERSION || !["time", "download", "manual", "error"].includes(String(data.trigger))) throw new Error("Please refresh the page and try again.");
  const outcome = string("outcome", 20), occupation = string("occupation", 30), age = string("age", 20);
  if ((outcome && !Object.hasOwn(outcomes, outcome)) || (occupation && !Object.hasOwn(occupations, occupation)) || (age && !(ages as readonly string[]).includes(age))) throw new Error("Please select one of the available options.");
  if (typeof data.contactConsent !== "boolean") throw new Error("Please check your contact preference.");
  const result: FeedbackSubmission = {
    id, version: SURVEY_VERSION, trigger: data.trigger as FeedbackTrigger, path: safeFeedbackPath(string("path", 120)),
    outcome: outcome as FeedbackOutcome, occupation: occupation as FeedbackAnswers["occupation"], age: age as FeedbackAnswers["age"],
    need: string("need", 2000), otherOccupation: string("otherOccupation", 100), suggestion: string("suggestion", 2000),
    email: string("email", 254), contactConsent: data.contactConsent,
  };
  if (!hasAnswer(result)) throw new Error("Please answer at least one question.");
  if (result.email && !validEmail(result.email)) throw new Error("Please enter a valid email address, or leave it empty.");
  if (result.contactConsent && !result.email) throw new Error("Add an email address so we can reply, or uncheck the contact option.");
  return result;
}
