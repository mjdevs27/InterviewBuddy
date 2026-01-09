import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import InterviewCard from '@/components/InterviewCard';
import DisplayTechIcons from '@/components/DisplayTechIcons';
import { companies } from '@/constants';

async function getRandomInterviews() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/interviews/random?count=6`,
      { cache: 'no-store' }
    );
    const data = await response.json();
    return data.success ? data.interviews : [];
  } catch (error) {
    console.error('Error fetching random interviews:', error);
    return [];
  }
}

async function getUserInterviews() {
  try {
    const userId = 'demo-user-123'; // Replace with actual auth
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/interviews/user?userId=${userId}&limit=3`,
      { cache: 'no-store' }
    );
    const data = await response.json();
    return data.success ? data.interviews : [];
  } catch (error) {
    console.error('Error fetching user interviews:', error);
    return [];
  }
}

export default async function Home() {
  const [randomInterviews, userInterviews] = await Promise.all([
    getRandomInterviews(),
    getUserInterviews(),
  ]);

  // Assign companies to user interviews
  const interviewsWithCompanies = userInterviews.map((interview: any, index: number) => ({
    ...interview,
    company: companies[index % companies.length],
  }));

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Assistant & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/voice">Create Custom Interview</Link>
          </Button>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      {/* User's Practice Interviews */}
      {interviewsWithCompanies.length > 0 && (
        <section className="flex flex-col gap-6 mt-8">
          <h2 className="text-2xl font-bold">Your Practice Interviews</h2>
          <div className="interviews-section">
            {interviewsWithCompanies.map((interview: any) => (
              <div key={interview.id} className="card-border w-[360px] max-sm:w-full min-h-96">
                <div className="card-interview">
                  <div>
                    {/* Company Badge */}
                    <div
                      className="absolute top-0 right-0 px-4 py-2 rounded-bl-lg text-white font-semibold"
                      style={{ backgroundColor: interview.company.color }}
                    >
                      {interview.company.name}
                    </div>

                    {/* Company Logo Circle */}
                    <div
                      className="w-[90px] h-[90px] rounded-full flex items-center justify-center text-white font-bold text-3xl"
                      style={{ backgroundColor: interview.company.color }}
                    >
                      {interview.company.name[0]}
                    </div>

                    {/* Interview Role */}
                    <h3 className="mt-5 capitalize">{interview.role} Interview</h3>

                    {/* Date & Questions Count */}
                    <div className="flex flex-row gap-5 mt-3">
                      <div className="flex flex-row gap-2">
                        <Image
                          src="/calendar.svg"
                          width={22}
                          height={22}
                          alt="calendar"
                        />
                        <p>{new Date(interview.createdAt).toLocaleDateString()}</p>
                      </div>

                      <div className="flex flex-row gap-2 items-center">
                        <Image src="/star.svg" width={22} height={22} alt="questions" />
                        <p>{interview.questions.length} Questions</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="line-clamp-2 mt-5">
                      Practice your {interview.level} level {interview.role} interview.
                      Answer {interview.questions.length} questions and get instant AI feedback.
                    </p>
                  </div>

                  <div className="flex flex-row justify-between">
                    <DisplayTechIcons techStack={interview.techstack} />

                    <Button className="btn-primary">
                      <Link href={`/interview/${interview.id}/practice`}>
                        Start Practice
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Random Practice Interviews */}
      <section className="flex flex-col gap-6 mt-8">
        <h2 className="text-2xl font-bold">Explore Interviews</h2>

        <div className="interviews-section">
          {randomInterviews.length === 0 ? (
            <p className="text-muted-foreground">Loading interviews...</p>
          ) : (
            randomInterviews.map((interview: any) => (
              <InterviewCard
                key={interview.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          )}
        </div>
      </section>
    </>
  );
}
