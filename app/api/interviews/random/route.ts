import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { db } from '@/firebase/admin';
import { getRandomInterviewCover } from '@/lib/utils';

const roles = [
    'Backend Developer',
    'Frontend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'Mobile Developer',
    'Data Engineer',
];

const levels = ['Junior', 'Mid-level', 'Senior'];

const types = ['Technical', 'Behavioral', 'Mixed'];

const techStacks = [
    ['Node.js', 'Express', 'MongoDB'],
    ['React', 'TypeScript', 'Next.js'],
    ['Python', 'Django', 'PostgreSQL'],
    ['AWS', 'Docker', 'Kubernetes'],
    ['Java', 'Spring Boot', 'MySQL'],
    ['Vue.js', 'Nuxt', 'Tailwind CSS'],
];

function getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate() {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 7); // 0-6 days ago
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return date.toISOString();
}

async function generateRandomInterview() {
    const role = getRandomItem(roles);
    const level = getRandomItem(levels);
    const type = getRandomItem(types);
    const techstack = getRandomItem(techStacks);

    try {
        // Generate 10 questions using Groq
        const { text: raw } = await generateText({
            model: groq('llama-3.3-70b-versatile'),
            prompt: `You are InterviewBuddy, an interview question generator.
Return ONLY a valid JSON array of strings.
No markdown. No explanation. No extra text.

Rules:
- Exactly 10 questions
- ${level} ${role} role
- Focus: ${type}
- Tech stack: ${techstack.join(', ')}
- Questions must be clear for voice assistant reading
- Do not use slashes or asterisks

Return format example:
["Question 1","Question 2","Question 3"]`,
        });

        // Extract JSON array
        const start = raw.indexOf('[');
        const end = raw.lastIndexOf(']');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error(`Model did not return a JSON array. Raw: ${raw}`);
        }
        const json = raw.slice(start, end + 1);
        const parsed = JSON.parse(json);

        const questions = Array.isArray(parsed)
            ? parsed.filter((x) => typeof x === 'string').slice(0, 10)
            : [];

        if (questions.length === 0) {
            throw new Error('No valid questions returned.');
        }

        const interview = {
            role,
            type,
            level,
            techstack,
            questions,
            userId: null, // No user - it's a random interview
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: getRandomDate(),
        };

        // Save to Firebase
        const docRef = await db.collection('interviews').add(interview);

        return {
            id: docRef.id,
            ...interview,
        };
    } catch (error) {
        console.error('Error generating random interview:', error);
        throw error;
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '3', 10);

    try {
        // Check if we have enough random interviews in Firebase
        // Simplified query to avoid index requirement
        const existingInterviews = await db
            .collection('interviews')
            .where('finalized', '==', true)
            .limit(count * 3) // Get more than needed to filter null userId
            .get();

        // Filter for interviews without userId (random interviews) and sort
        const interviews = existingInterviews.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .filter((interview: any) => !interview.userId) // Only random interviews
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // If we have enough, return them
        if (interviews.length >= count) {
            // Shuffle and return requested count
            const shuffled = interviews.sort(() => Math.random() - 0.5);
            return NextResponse.json({
                success: true,
                interviews: shuffled.slice(0, count),
            });
        }

        // Otherwise, generate new ones
        const needed = count - interviews.length;
        const newInterviews = [];

        for (let i = 0; i < needed; i++) {
            const interview = await generateRandomInterview();
            newInterviews.push(interview);
        }

        const allInterviews = [...interviews, ...newInterviews]
            .sort(() => Math.random() - 0.5)
            .slice(0, count);

        return NextResponse.json({
            success: true,
            interviews: allInterviews,
        });
    } catch (error: any) {
        console.error('Error in random interviews API:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to generate random interviews',
            },
            { status: 500 }
        );
    }
}

// Force regeneration of random interviews
export async function POST() {
    try {
        const interview = await generateRandomInterview();
        return NextResponse.json({
            success: true,
            interview,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to generate interview',
            },
            { status: 500 }
        );
    }
}
