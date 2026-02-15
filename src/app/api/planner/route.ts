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

  const { raceDistance, raceDate, raceGoal } = await request.json();
  if (!raceDistance || !raceDate) {
    return NextResponse.json({ error: 'Missing race info' }, { status: 400 });
  }

  // Check daily limit
  const usage = await checkAndUse(userId, 'planner');
  if (!usage.allowed) {
    return NextResponse.json({
      error: 'Daily limit reached',
      message: "You've used all 3 plan generations today. Your limit resets at midnight UTC.",
      remaining: 0,
    }, { status: 429 });
  }

  try {
    const runData = await fetchUserRunData(userId);
    const intel = computeIntelligence(runData.runs, runData.stats.totalDistanceKm);

    const systemPrompt = buildPlannerPrompt(runData, intel, raceDistance, raceDate, raceGoal);

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
          {
            role: 'user',
            content: `Generate a training plan for my ${raceDistance} race on ${raceDate}.${raceGoal ? ` My goal: ${raceGoal}` : ''} Return ONLY valid JSON, no markdown.`,
          },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Fireworks error:', err);
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
    }

    const plan = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ plan });
  } catch (err) {
    console.error('Planner API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function buildPlannerPrompt(
  runData: Awaited<ReturnType<typeof fetchUserRunData>>,
  intel: ReturnType<typeof computeIntelligence>,
  raceDistance: string,
  raceDate: string,
  raceGoal?: string,
): string {
  const { stats, prs } = runData;
  const { personality, trainingLoad, racePredictions, recovery } = intel;

  const prSummary = prs.map(p => `${p.label}: ${p.time} (${p.pace})`).join(', ');
  const predSummary = racePredictions.map(p => `${p.label}: ${p.time}`).join(', ');

  const today = new Date().toISOString().split('T')[0];
  const raceDateObj = new Date(raceDate);
  const todayObj = new Date(today);
  const weeksUntilRace = Math.max(1, Math.round((raceDateObj.getTime() - todayObj.getTime()) / (7 * 86400000)));

  return `You are RunDNA Planner — an expert AI running coach specializing in race preparation plans.

You must return ONLY valid JSON (no markdown, no explanation outside JSON). The JSON must follow this exact schema:

{
  "summary": "Brief 1-2 sentence overview of the plan",
  "totalWeeks": ${weeksUntilRace},
  "phases": [
    {
      "name": "Phase name (e.g. Base Building)",
      "weeks": "Week range (e.g. 1-3)",
      "focus": "Brief description of phase focus",
      "weeklyKm": "Target weekly km range (e.g. 25-30)"
    }
  ],
  "weeks": [
    {
      "week": 1,
      "phase": "Phase name",
      "totalKm": 25,
      "days": [
        { "day": "Mon", "type": "easy|tempo|interval|long|rest|cross", "description": "5km Easy @ 6:30/km", "km": 5 },
        { "day": "Tue", "type": "rest", "description": "Rest or light stretching", "km": 0 }
      ],
      "notes": "Week-specific coaching note"
    }
  ],
  "raceDay": {
    "strategy": "Race day pacing strategy",
    "targetPace": "Target pace per km",
    "warmup": "Warm-up routine",
    "nutrition": "Nutrition tips"
  },
  "warnings": ["Any injury risk or caution notes based on their data"]
}

## Runner Profile
- Total: ${stats.totalRuns} runs, ${stats.totalDistance} km
- Average Pace: ${stats.avgPace}
- Personality: ${personality.type} — ${personality.description}
- Consistency: ${personality.scores.consistency}/5, Speed: ${personality.scores.speed}/5, Endurance: ${personality.scores.endurance}/5

## Current Training Load (ACWR)
- Ratio: ${trainingLoad.ratio.toFixed(2)} (${trainingLoad.zoneLabel})
- Acute (7d): ${trainingLoad.acute.toFixed(0)}, Chronic (42d): ${trainingLoad.chronic.toFixed(0)}

## Personal Records
${prSummary || 'No PRs yet'}

## Race Predictions (Riegel)
${predSummary || 'Not enough data'}

## Recovery
- Avg rest: ${recovery.avgRestDays} days, After hard runs: ${recovery.avgRestAfterHard} days

## Race Details
- Distance: ${raceDistance}
- Date: ${raceDate} (${weeksUntilRace} weeks from today)
${raceGoal ? `- Goal: ${raceGoal}` : '- Goal: Not specified — suggest realistic target based on predictions'}

## Guidelines
- Build the plan with proper periodization (Base → Build → Taper).
- Never exceed ACWR 1.3 in weekly load progression (10% rule).
- Consider this runner's personality and recovery patterns.
- Include rest days based on their actual recovery pattern.
- All 7 days of each week must be specified.
- Keep total weeks to ${weeksUntilRace}.
- Respond in the same language as the user's goal text (default English).`;
}
