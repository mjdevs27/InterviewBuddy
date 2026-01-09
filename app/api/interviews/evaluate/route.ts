import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

function extractJsonObject(raw: string): string {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error(`Model did not return a JSON object. Raw output: ${raw}`);
    }
    return raw.slice(start, end + 1);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { question, answer, role, level, previousAnswers } = body;

        if (!question || !answer) {
            return NextResponse.json(
                { success: false, error: 'Question and answer are required' },
                { status: 400 }
            );
        }

        // Evaluate the current answer
        const { text: evalRaw } = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: `You are evaluating an interview answer. Rate it 0-10.

Question: ${question}
Role: ${role || 'Developer'} (${level || 'Mid'} level)
User Answer: ${answer}

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "score":number (0-10),
  "feedback": "1-2 sentence feedback",
  "keyPoints": ["point1", "point2"],
  "missedPoints": ["point1", "point2"]
}

Be fair but critical. ${level === 'Senior' ? 'Senior level should be judged harder.' : ''}
Award partial credit for incomplete but correct answers.
Score 0 only if completely wrong or irrelevant.`,
        });

        const evalJson = extractJsonObject(evalRaw);
        const parsed = JSON.parse(evalJson);

        // Validate response
        const evaluation = {
            score:
                typeof parsed.score === 'number'
                    ? Math.max(0, Math.min(10, parsed.score))
                    : 5,
            feedback: parsed.feedback || 'No feedback provided.',
            keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
            missedPoints: Array.isArray(parsed.missedPoints)
                ? parsed.missedPoints
                : [],
        };

        // Generate follow-up question if score is good (7+)
        let followUpQuestion = null;
        if (evaluation.score >= 7 && previousAnswers) {
            try {
                const { text: followUpRaw } = await generateText({
                    model: groq('llama-3.3-70b-versatile'),
                    prompt: `Based on this interview answer, generate ONE intelligent follow-up question.

Original Question: ${question}
User's Answer: ${answer}
Role: ${role} (${level} level)

The follow-up should:
- Dig deeper into their answer
- Test practical knowledge
- Be specific to what they mentioned
- Be brief and clear

Return ONLY the question text, nothing else.`,
                });

                followUpQuestion = followUpRaw.trim();
            } catch (error) {
                console.error('Error generating follow-up:', error);
            }
        }

        return NextResponse.json({
            success: true,
            ...evaluation,
            followUpQuestion,
        });
    } catch (error: any) {
        console.error('Error evaluating answer:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to evaluate answer',
            },
            { status: 500 }
        );
    }
}
