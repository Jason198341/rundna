import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchUserRunData } from '@/lib/strava';
import { computeIntelligence } from '@/lib/strava-analytics';
import { checkAndUse } from '@/lib/usage';

export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages } = await request.json();
  if (!messages || !Array.isArray(messages) || messages.length > 50) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Check daily limit
  const usage = await checkAndUse(userId, 'coach');
  if (!usage.allowed) {
    return NextResponse.json({
      error: 'Daily limit reached',
      message: "You've used all 10 coach messages today. Your limit resets at midnight UTC. Try your Running DNA or Weekly Report in the meantime!",
      remaining: 0,
    }, { status: 429 });
  }

  try {
    // Fetch user's running data + intelligence
    const runData = await fetchUserRunData(userId);
    const intel = computeIntelligence(runData.runs, runData.stats.totalDistanceKm);

    // Build system prompt with user's data
    const systemPrompt = buildCoachPrompt(runData, intel);

    // Call Fireworks AI
    const res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'accounts/fireworks/models/deepseek-v3p1',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10), // Last 10 messages for context
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Fireworks error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply, remaining: usage.remaining });
  } catch (err) {
    console.error('Coach API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildCoachPrompt(
  runData: Awaited<ReturnType<typeof fetchUserRunData>>,
  intel: ReturnType<typeof computeIntelligence>,
): string {
  const { stats, prs } = runData;
  const { personality, trainingLoad, todaysPlan, racePredictions, recovery, conditions } = intel;

  const prSummary = prs.map(p => `${p.label}: ${p.time} (${p.pace})`).join(', ');
  const predSummary = racePredictions.map(p => `${p.label}: ${p.time}`).join(', ');

  return `You are RunDNA Coach — an expert AI running coach with deep knowledge of exercise physiology, periodization, and race preparation.

You have access to this runner's complete Strava data:

## Runner Profile
- Total: ${stats.totalRuns} runs, ${stats.totalDistance} km
- Average Pace: ${stats.avgPace}
- Running Personality: ${personality.type} — ${personality.description}
- Personality Scores: Consistency ${personality.scores.consistency}/5, Speed ${personality.scores.speed}/5, Endurance ${personality.scores.endurance}/5, Variety ${personality.scores.variety}/5, Volume ${personality.scores.volume}/5

## Training Load (ACWR)
- Ratio: ${trainingLoad.ratio} (${trainingLoad.zoneLabel})
- Acute (7d): ${trainingLoad.acute.toFixed(0)}
- Chronic (42d avg): ${trainingLoad.chronic.toFixed(0)}

## Today's Plan
- ${todaysPlan.headline}
- Days since last run: ${todaysPlan.daysSinceLastRun}
- Last run: ${todaysPlan.lastRunSummary}
- Safe max: ${todaysPlan.safeMaxKm} km, Danger threshold: ${todaysPlan.dangerKm} km
- Easy pace: ${todaysPlan.easyPace}, Tempo pace: ${todaysPlan.tempoPace}

## Personal Records
${prSummary || 'No PRs yet'}

## Race Predictions (Riegel)
${predSummary || 'Not enough data'}

## Recovery
- Avg rest between runs: ${recovery.avgRestDays} days
- Avg rest after hard runs: ${recovery.avgRestAfterHard} days
- Longest streak: ${recovery.longestStreak} days
- Longest rest: ${recovery.longestRest} days

## Best Conditions
- Best day: ${conditions.bestDay.day} (${conditions.bestDay.pace})
- Best hour: ${conditions.bestHour.hour} (${conditions.bestHour.pace})
- Sweet spot distance: ${conditions.sweetSpotDistance.range} (${conditions.sweetSpotDistance.pace})

## Guidelines
- Be specific and data-driven. Reference their actual numbers.
- For training plans, use periodization (Easy/Tempo/Interval/Long).
- Always consider injury prevention based on ACWR.
- Keep responses concise but actionable (2-4 paragraphs max).
- Use their personality type to motivate them.
- If they ask about a race, give a realistic goal based on their predictions.
- Respond in the same language the user writes in.`;
}
