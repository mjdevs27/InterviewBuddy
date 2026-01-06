import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

function extractJsonArray(raw: string): string {
  // Try to find the first JSON array in the output
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Model did not return a JSON array. Raw: ${raw}`);
  }
  return raw.slice(start, end + 1);
}

function validateQuestions(value: unknown, amount: number): string[] {
  if (!Array.isArray(value)) throw new Error("Questions is not an array.");
  const strings = value.filter((x) => typeof x === "string") as string[];

  // basic cleanup + voice assistant safe-ish
  const cleaned = strings
    .map((q) => q.trim())
    .filter(Boolean)
    .map((q) => q.replace(/[/*]/g, "")); // remove / and * as you asked

  if (cleaned.length === 0) throw new Error("No valid questions returned.");

  // Ensure we don’t store more than requested
  return cleaned.slice(0, amount);
}

export async function POST(request: Request) {
  const body = await request.json();

  // IMPORTANT: your earlier payload used "userId" not "userid"
  const type = body.type;
  const role = body.role;
  const level = body.level;
  const techstack = body.techstack;
  const amountRaw = body.amount;
  const userId = body.userId ?? body.userid; // support both

  try {
    const amount = Math.min(Math.max(Number(amountRaw) || 10, 1), 50);

    const { text: raw } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `You are InterviewBuddy, an interview question generator.
Return ONLY a valid JSON array of strings.
No markdown. No explanation. No extra text.

Rules:
- Exactly ${amount} questions
- Senior ${role} role
- Focus: ${type}
- Tech stack: ${techstack}
- Questions must be clear for voice assistant reading
- Do not use slashes or asterisks

Return format example:
["Question 1","Question 2","Question 3"]`,
    });

    const json = extractJsonArray(raw);
    const parsed = JSON.parse(json);
    const questions = validateQuestions(parsed, amount);

    const interview = {
      role,
      type,
      level,
      techstack: String(techstack ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      questions,
      userId,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    // RETURN JSON (good for your app + HTTPie)
    return Response.json({ success: true, questions }, { status: 200 });
  } catch (error: unknown) {
    const e = error as any;
    console.error("Error:", e);

    return Response.json(
      {
        success: false,
        error: {
          name: e?.name ?? "UnknownError",
          message: e?.message ?? String(error),
          statusCode: e?.statusCode,
        },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
