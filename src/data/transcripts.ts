import type { ClientStatus, MeetingSummary, TranscriptLine } from './types';

/**
 * Stand-in wording for the demo's meeting transcripts, long enough to read like a real call: about two lines a
 * minute, so a 60-minute call runs to about 120 lines. Sections follow a coaching call's usual order and a call
 * takes them in turn until it has enough lines, ending on the wrap-up. Nothing here quotes a figure from the
 * client's logs (AC4: the data tabs own the numbers) or names an injury or illness (that would belong in the
 * assessment's safety rule); `{first}` is the client's first name.
 */

type Speaker = 'c' | 'k';
type Section = [Speaker, string][];
type Mood = Exclude<ClientStatus, 'no_activities'>;

const OPENER: Section = [
  ['c', 'Hi {first}, thanks for jumping on. Can you hear me okay?'],
  ['k', 'Yes, loud and clear. Sorry, I was a minute late, the last meeting ran over.'],
  ['c', 'No worries at all. How are you doing today?'],
  ['k', 'Not bad. A little tired, but good.'],
  ['c', 'Here’s what I’d like to cover: how the last couple of weeks went, training, food, sleep, and then the plan for the next block. Anything you want to add?'],
  ['k', 'Maybe the schedule around work. Things are shifting a bit.'],
  ['c', 'Perfect, we’ll make time for that.'],
];

const RECAP: Record<Mood, Section> = {
  on_track: [
    ['c', 'So, how have the last couple of weeks been overall?'],
    ['k', 'Honestly, really good. I got every session in and logging meals has become a habit.'],
    ['c', 'That shows. What do you think made the difference this time?'],
    ['k', 'Planning the week on Sunday night. Once it’s in the calendar I just do it.'],
    ['c', 'That’s a great system. Was there a day that felt harder than the others?'],
    ['k', 'Thursday, because of the late meeting, but I moved the session to the morning.'],
    ['c', 'Nice adjustment. That’s exactly the kind of call I want you to make on your own.'],
  ],
  needs_attention: [
    ['c', 'So, how have the last couple of weeks been overall?'],
    ['k', 'Mixed. The first week was fine, then work got busy midweek and a couple of sessions slipped.'],
    ['c', 'That happens. When they slipped, what got in the way?'],
    ['k', 'Mostly evenings. By the time I got home I didn’t have much left.'],
    ['c', 'Did the logging slip at the same time?'],
    ['k', 'A bit. I’d remember at lunch and then forget dinner.'],
    ['c', 'Okay, that’s useful. It sounds like the evenings are the weak spot, not the plan itself.'],
    ['k', 'Yes, that’s fair.'],
  ],
  at_risk: [
    ['c', 'So, how have the last couple of weeks been overall?'],
    ['k', 'Honestly, not great. A lot has been going on and the app kind of fell off.'],
    ['c', 'Thanks for being straight with me. Do you want to talk about what’s been going on?'],
    ['k', 'Work has been intense and there’s been a lot at home too. Training felt like one more thing on the list.'],
    ['c', 'That makes sense. My job isn’t to add pressure, it’s to make this fit around your life.'],
    ['k', 'I appreciate that. I feel bad about falling behind.'],
    ['c', 'No need. What would a realistic week look like for you right now?'],
    ['k', 'Maybe two short sessions, if they’re really short.'],
    ['c', 'Then that’s where we start. Two short sessions done beats four planned and skipped.'],
  ],
};

const TRAINING: Section = [
  ['c', 'Let’s talk training. How are the sessions feeling, intensity-wise?'],
  ['k', 'The upper body days feel good. The leg days are tough, especially the last block.'],
  ['c', 'Tough in a good way, or tough as in you dread them?'],
  ['k', 'A bit of both, to be honest.'],
  ['c', 'Ha, fair. Are you finishing all the sets, or cutting the last ones short?'],
  ['k', 'Usually I finish, but the last set of split squats sometimes gets skipped.'],
  ['c', 'Okay. I’d rather you do that set with a lighter weight than skip it. Form first.'],
  ['k', 'Got it, I can do that.'],
  ['c', 'How long are the sessions taking you, door to door?'],
  ['k', 'Around fifty minutes with the warm-up.'],
  ['c', 'That’s about right. If you’re short on time, the warm-up and the first two exercises are the non-negotiables.'],
  ['k', 'Good to know. I always thought it was all or nothing.'],
  ['c', 'Never all or nothing. A short session still counts.'],
  ['k', 'And the conditioning finisher, is that optional?'],
  ['c', 'On busy days, yes. On a normal day, I’d keep it, even if it’s only five minutes.'],
];

const NUTRITION: Section = [
  ['c', 'Let’s move to food. How has logging been feeling, effort-wise?'],
  ['k', 'Breakfast and lunch are easy. Dinner is where it falls apart.'],
  ['c', 'What does a typical dinner look like on a busy day?'],
  ['k', 'Something quick. Pasta, or I order in if I’m really tired.'],
  ['c', 'Ordering in is fine, by the way. I just want to see it. A photo is enough.'],
  ['k', 'Really? I thought I had to weigh everything.'],
  ['c', 'Not at all. A photo and a rough portion tells me a lot more than an empty day.'],
  ['k', 'Okay, that takes a lot of pressure off.'],
  ['c', 'How about protein? Do you feel like you’re getting some at every meal?'],
  ['k', 'At lunch and dinner, yes. Breakfast is usually just coffee and toast.'],
  ['c', 'Let’s pick two go-to breakfasts with some protein in them. Eggs on toast, or Greek yogurt with fruit?'],
  ['k', 'Yogurt is easier on weekdays. Eggs on the weekend.'],
  ['c', 'Perfect. That’s the whole change for this week. Nothing else.'],
  ['k', 'I like that it’s just one thing.'],
  ['c', 'One thing at a time sticks. Ten things at once never does.'],
];

const RECOVERY: Section = [
  ['c', 'How has sleep been?'],
  ['k', 'Up and down. I’m going to bed later than I want to.'],
  ['c', 'What’s keeping you up, usually?'],
  ['k', 'Phone, mostly. I tell myself five more minutes and then it’s midnight.'],
  ['c', 'Very relatable. Would it help to charge the phone outside the bedroom?'],
  ['k', 'Probably. I could try it on weeknights.'],
  ['c', 'Let’s try it for one week and see how the mornings feel.'],
  ['k', 'Deal.'],
  ['c', 'And stress-wise, on a scale from calm to frantic, where are you this week?'],
  ['k', 'Somewhere in the middle, leaning frantic.'],
  ['c', 'Then we keep the training load where it is. No need to push harder in a stressful week.'],
  ['k', 'That’s a relief, honestly.'],
];

const SCHEDULE: Section = [
  ['c', 'You mentioned the schedule around work is shifting. What’s changing?'],
  ['k', 'I’m moving to earlier starts two days a week, so evenings free up on those days.'],
  ['c', 'That could actually work in your favour. Which days?'],
  ['k', 'Tuesday and Thursday.'],
  ['c', 'Then let’s put the longer sessions on those evenings and keep the other days short.'],
  ['k', 'That makes sense. And I travel the week after next, three days.'],
  ['c', 'Will you have a gym at the hotel?'],
  ['k', 'I think so, but I’m not sure what’s in it.'],
  ['c', 'I’ll add a travel version of the program: bodyweight and dumbbells only, twenty-five minutes.'],
  ['k', 'Oh, that would be great.'],
  ['c', 'And for food on the road, the same rule: photos, no stress.'],
  ['k', 'Got it.'],
];

const GOALS: Section = [
  ['c', 'Let’s zoom out for a minute. When we started, what did you say you wanted from this?'],
  ['k', 'To feel stronger and have more energy in the afternoons.'],
  ['c', 'And how does that feel now compared with the start?'],
  ['k', 'Stronger, for sure. Energy is better on the days I sleep well.'],
  ['c', 'That lines up with what we just said about sleep, right?'],
  ['k', 'Yes, it’s all connected, isn’t it.'],
  ['c', 'It really is. Is there a new goal you’d like to add for the next block?'],
  ['k', 'I’d love to do a proper push-up, all the way down.'],
  ['c', 'Love it. That’s a great, concrete goal. I’ll build progressions for it into the upper body days.'],
  ['k', 'Nice, something to aim for.'],
];

const HABITS: Section = [
  ['c', 'How are the daily habits going? Water, steps, the evening walk?'],
  ['k', 'Water is easy now. The walk happens maybe half the time.'],
  ['c', 'What stops it on the other days?'],
  ['k', 'Weather, mostly. And if dinner runs late, I skip it.'],
  ['c', 'Would a shorter walk help? Even ten minutes around the block counts.'],
  ['k', 'Ten minutes sounds doable. I think I make it bigger in my head.'],
  ['c', 'That’s very common. Let’s make ten minutes the habit, and anything extra is a bonus.'],
  ['k', 'I like that.'],
  ['c', 'And the stretching after sessions?'],
  ['k', 'I’ve been rushing it, honestly.'],
  ['c', 'Two minutes is enough. Hips and upper back, the two we practised.'],
  ['k', 'Okay, I’ll set a timer for it.'],
];

const MINDSET: Section = [
  ['c', 'How are you feeling about all of this, in your head? Not the plan, just you.'],
  ['k', 'Better than at the start. I used to think I had to be perfect.'],
  ['c', 'And now?'],
  ['k', 'Now I think consistent is enough. Even a messy week still moves me forward.'],
  ['c', 'That’s the biggest change I’ve seen in you, honestly. It’s what makes this last.'],
  ['k', 'Thanks. Some days it’s still hard to believe it.'],
  ['c', 'On those days, look back at where you started. Your progress photos are a good reminder.'],
  ['k', 'I should look at them more often.'],
  ['c', 'Try it once a month. It’s easy to forget how far you’ve come.'],
  ['k', 'Good idea.'],
  ['c', 'And if motivation dips, tell me. That’s information, not failure.'],
  ['k', 'I will. It helps knowing I can say that.'],
];

const plan = (mood: Mood): Section => [
  ['c', 'So here’s the plan for the next block, and stop me if anything doesn’t fit.'],
  ['k', 'Okay.'],
  mood === 'at_risk'
    ? ['c', 'Two short sessions a week to start, on Tuesday and Thursday evenings, and the travel version when you’re away.']
    : ['c', 'Longer sessions on Tuesday and Thursday evenings, short ones on the other days, travel version when you’re away.'],
  ['k', 'That works.'],
  ['c', 'On food, the only change is a protein breakfast on weekdays, and photos for dinners you don’t log.'],
  ['k', 'Yep.'],
  ['c', 'Phone out of the bedroom on weeknights, as an experiment.'],
  ['k', 'I’ll try.'],
  ['c', 'And push-up progressions on the upper body days. I’ll send the updated program tonight.'],
  ['k', 'Sounds good. Will the app show the new sessions straight away?'],
  ['c', 'Yes, they’ll be on your calendar from Monday.'],
];

const QUESTIONS: Section = [
  ['c', 'Before we wrap up, any questions for me?'],
  ['k', 'Just one. If I miss a session, should I make it up on the weekend?'],
  ['c', 'Only if you feel fresh. Otherwise skip it and pick up the plan as normal. No catching up.'],
  ['k', 'Okay, good. I always felt guilty about that.'],
  ['c', 'No guilt allowed. The plan is there to help, not to judge.'],
  ['k', 'And should I message you if something comes up, or wait for the next call?'],
  ['c', 'Message me anytime. A quick note is plenty, and I’ll adjust things in between.'],
];

const WRAP_UP: Section = [
  ['c', 'Great. Thanks for your time today, {first}. This was a really useful conversation.'],
  ['k', 'Thank you, it helped to talk it through.'],
  ['c', 'I’ll send the updated plan tonight, and we’ll check back on our next call.'],
  ['k', 'Perfect. Talk soon!'],
  ['c', 'Talk soon, have a good week.'],
];

const moodOf = (status: ClientStatus): Mood => (status === 'no_activities' ? 'needs_attention' : status);

/** Lines per minute of call, so length follows duration. */
const LINES_PER_MINUTE = 2;

type Topic = 'opener' | 'recap' | 'training' | 'nutrition' | 'recovery' | 'habits' | 'schedule' | 'goals' | 'mindset' | 'plan' | 'questions';

/** The sections a call takes in turn; a nutrition catch-up puts food first. */
function order(title: string, mood: Mood): [Topic, Section][] {
  const middle: [Topic, Section][] = [
    ['training', TRAINING],
    ['nutrition', NUTRITION],
    ['recovery', RECOVERY],
    ['habits', HABITS],
    ['schedule', SCHEDULE],
    ['goals', GOALS],
    ['mindset', MINDSET],
  ];
  if (title === 'Nutrition catch-up') middle.unshift(middle.splice(1, 1)[0]);
  return [['opener', OPENER], ['recap', RECAP[mood]], ...middle, ['plan', plan(mood)], ['questions', QUESTIONS]];
}

/** How many lines of each section a call of `minutes` reaches before the wrap-up. */
function reached(title: string, mood: Mood, minutes: number): [Topic, Section, number][] {
  let left = Math.max(12, Math.round(minutes * LINES_PER_MINUTE)) - WRAP_UP.length;
  const out: [Topic, Section, number][] = [];
  for (const [topic, section] of order(title, mood)) {
    if (left <= 0) break;
    const n = Math.min(section.length, left);
    out.push([topic, section, n]);
    left -= n;
  }
  return out;
}

/** "04:12", or "1:04:12" past the hour. */
function stamp(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h ? `${h}:${mmss}` : mmss;
}

/**
 * A transcript for a call of `minutes`: sections in order until about two lines a minute, then the wrap-up, with
 * each line's time spread across the call (`rnd` adds a little jitter so the gaps aren't regular).
 */
export function transcriptLines(first: string, status: ClientStatus, title: string, minutes: number, rnd: () => number): TranscriptLine[] {
  const picked = reached(title, moodOf(status), minutes).flatMap(([, section, n]) => section.slice(0, n));
  const lines = [...picked, ...WRAP_UP];
  const step = (minutes * 60 - 20) / lines.length;
  return lines.map(([who, text], i) => ({
    from: who === 'c' ? 'coach' : 'client',
    at: stamp(Math.round(5 + i * step + rnd() * step * 0.6)),
    text: text.replace('{first}', first),
  }));
}

/** The same call as plain text ("Long (04:12): …" lines), for a sample file to upload. */
export function transcriptText(coach: string, first: string, lines: TranscriptLine[]) {
  return lines.map((l) => `${l.from === 'coach' ? coach : first} (${l.at}): ${l.text}`).join('\n\n');
}

// ---------------------------------------------------------------- Summary

/**
 * What each section of a call comes to, in the coach's words for the Summary tab: what was discussed and settled,
 * a short "agreed" phrase for the overview, and the coach's own follow-ups (what the coach said they would do).
 * Written from the section's lines, so the summary never says more than the transcript does.
 */
const TOPICS: Record<Exclude<Topic, 'opener' | 'recap' | 'plan'>, { name: string; discuss: string; agreed?: string; followUp?: string }> = {
  training: {
    name: 'training',
    discuss: 'Training: upper body days feel good, leg days are tough and the last set is sometimes skipped. Lighter weight beats a skipped set, and on short days the warm-up and first two exercises are enough.',
    agreed: 'lighter weights over skipped sets',
  },
  nutrition: {
    name: 'food',
    discuss: 'Food: breakfast and lunch are easy, dinner falls apart on busy days. A photo is enough for dinners that aren’t logged, and the one change is a protein breakfast (yogurt on weekdays, eggs at weekends).',
    agreed: 'a protein breakfast on weekdays',
    followUp: 'Look for dinner photos on days {first} doesn’t log.',
  },
  recovery: {
    name: 'sleep and stress',
    discuss: 'Sleep and stress: bedtimes slip because of the phone, and stress leans high this week. The phone stays out of the bedroom on weeknights for a week, and the training load stays where it is.',
    agreed: 'the phone out of the bedroom on weeknights',
    followUp: 'Ask how mornings feel after a week with the phone out of the bedroom.',
  },
  habits: {
    name: 'habits',
    discuss: 'Habits: water is easy now; the evening walk happens about half the time. The walk becomes ten minutes, plus two minutes of stretching after sessions.',
    agreed: 'a ten-minute evening walk',
  },
  schedule: {
    name: 'schedule',
    discuss: 'Schedule: earlier starts on Tuesday and Thursday free up those evenings, and a three-day work trip is coming the week after next.',
    agreed: 'longer sessions on Tuesday and Thursday evenings',
    followUp: 'Add a travel version of the program (bodyweight and dumbbells, 25 minutes) before {first}’s trip.',
  },
  goals: {
    name: 'goals',
    discuss: 'Goals: {first} feels stronger, with more energy on days after good sleep. New goal for the next block: a full push-up.',
    agreed: 'a push-up goal for the next block',
    followUp: 'Build push-up progressions into the upper body days.',
  },
  mindset: {
    name: 'mindset',
    discuss: 'Mindset: {first} no longer feels a week has to be perfect; consistent is enough. A monthly look at progress photos helps on harder days.',
  },
  questions: {
    name: 'questions',
    discuss: 'Questions: missed sessions aren’t made up unless {first} feels fresh, and messages between calls are welcome.',
    followUp: 'Answer messages between calls and adjust the plan as needed.',
  },
};

const RECAP_DISCUSS: Record<Mood, string> = {
  on_track: 'Recap: {first} got every session in and logging has become a habit; planning the week on Sunday night is what makes it stick.',
  needs_attention: 'Recap: the first week went fine, then busy evenings cost a couple of sessions and dinner logs. Evenings are the weak spot, not the plan.',
  at_risk: 'Recap: work and home have been intense and the app fell off. Two short sessions a week is realistic for now.',
};

const HEADLINE: Record<Mood, string> = {
  on_track: 'A positive call: {first} is keeping up with the plan, and you settled small changes for the next block.',
  needs_attention: 'A mixed couple of weeks for {first}: busy evenings cost sessions and dinner logs, so you kept the plan and made the evenings easier.',
  at_risk: 'A hard stretch for {first}: work and home pushed training aside, and you agreed to restart small.',
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * The Summary tab of a generated call. Only sections the call got all the way through count, so the summary never
 * names a point the transcript cut off before (a 45-minute call stops partway into goals, before the push-up).
 */
export function callSummary(first: string, status: ClientStatus, title: string, minutes: number): MeetingSummary {
  const mood = moodOf(status);
  const name = (s: string) => s.replace(/\{first\}/g, first);
  const covered = reached(title, mood, minutes)
    .filter(([, section, n]) => n === section.length)
    .map(([topic]) => topic);
  const topics = covered.filter((t): t is keyof typeof TOPICS => t in TOPICS).map((t) => TOPICS[t]);

  const discuss = [...(covered.includes('recap') ? [RECAP_DISCUSS[mood]] : []), ...topics.map((t) => t.discuss)];
  if (covered.includes('plan')) {
    discuss.push(
      mood === 'at_risk'
        ? 'Plan: two short sessions a week on Tuesday and Thursday evenings, the travel version when away.'
        : 'Plan: longer sessions on Tuesday and Thursday evenings, short ones on the other days, the travel version when away.',
    );
  }
  // Every call ends on the wrap-up, where the coach promises the updated plan tonight.
  const followUp = [...topics.flatMap((t) => (t.followUp ? [t.followUp] : [])), 'Send the updated plan tonight and check back on it at the next call.'];
  const agreed = topics.flatMap((t) => (t.agreed ? [t.agreed] : [])).slice(0, 3);

  const bullets = [
    `Covered ${list(topics.map((t) => t.name).filter((n) => n !== 'questions'))}.`,
    ...(agreed.length ? [`Agreed on ${list(agreed)}.`] : []),
    `${followUp.length} follow-up${followUp.length === 1 ? '' : 's'} for you, listed below.`,
  ];
  return { overview: { headline: name(HEADLINE[mood]), bullets: bullets.map(name) }, discuss: discuss.map(name), followUp: followUp.map(name) };
}
