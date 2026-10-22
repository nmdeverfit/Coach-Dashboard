import type { MeetingSummary } from '../data/types';

/**
 * The demo's stand-in for the model that writes a summary from a transcript the coach uploads or pastes. It reads
 * "Name (04:12): text", "Name: text" and SRT cues, sorts sentences into the call's usual topics by their words, and
 * keeps the ones that state something (no questions, no "I" / "you"), so the summary only ever repeats the call.
 * The coach's "Let's …" and "I'll …" lines become the follow-ups.
 */

interface Said {
  coach: boolean;
  text: string;
}

const TOPICS: [label: string, words: RegExp][] = [
  ['Goals', /\b(goals?|target|push-?ups?|stronger|progress photos?)\b/i],
  ['Training', /\b(train(ing)?|workouts?|sessions?|sets?|reps?|exercises?|squats?|lifts?|leg days?|upper body|warm-up|gym|cardio|conditioning|finisher)\b/i],
  ['Food', /\b(food|meals?|protein|breakfasts?|lunch(es)?|dinners?|eat(ing)?|calories|nutrition|snacks?|logging|logged|yogurt|eggs)\b/i],
  ['Sleep and stress', /\b(sleep|bed(time)?|bedroom|tired|stress(ful)?|rest|recovery|mornings?)\b/i],
  ['Habits', /\b(habits?|water|walks?|steps|stretch(ing)?)\b/i],
  ['Schedule', /\b(schedule|calendar|trip|travel|work(day)?s?|evenings?|tuesday|thursday|weekends?|weekdays?)\b/i],
];

/** The coach asking how the weeks since the last call went. */
const RECAP = /\b(last (couple of )?weeks?|since (our|the) last|overall)\b/i;
/** Coach's "I'll …" / "Let's …" that is a job for the coach, not a point agreed with the client. */
const FOLLOW_UP = /^(send|share|build|add|check|look|update|book|write|plan)\b/i;

/** Pronouns that make a sentence a quote rather than a fact. */
const PERSONAL = /\b(let['’]s|i|i'm|i’m|i've|i’ve|i'd|i’d|i'll|i’ll|me|my|mine|you|your|you're|you’re|yours|we|we'll|we’ll|us|our)\b/i;
/** Opening words of chat that carry no point. */
const FILLER = /^(okay|ok|so|then|and|but|honestly|ha|haha|great|perfect|nice|good|got it|deal|yes|yeah|well|right|sure|fair)\b[,.!]?\s*/i;
/** Reactions and short answers rather than points: "That's a great system", "At lunch and dinner, yes". */
const REMARK = /^(that['’]s|that is|it['’]s|this is|sounds)\b|,\s*(yes|no|sure)[.!]?$/i;
/** Lines that only move the call to the next topic. */
const SIGNPOST = /\b(let['’]s (talk|move|cover|start|look|zoom out)|here['’]s what|what i['’]d like to cover|anything you want)/i;

function parse(text: string, coachName: string): Said[] {
  const said: Said[] = [];
  const coach = new RegExp(`^(${coachName}|coach)\\b`, 'i');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    // SRT cue numbers and timings.
    if (!line || /^\d+$/.test(line) || /-->/.test(line)) continue;
    const m = line.match(/^(?:\[[^\]]*\]\s*)?([^():]{1,40}?)\s*(?:\([^)]*\))?\s*:\s+(.+)$/);
    if (m) said.push({ coach: coach.test(m[1].trim()), text: m[2] });
    else if (said.length) said[said.length - 1].text += ` ${line}`;
    // A header line ("Monthly check-in call: …") before anyone speaks is skipped.
  }
  // Notes with no speaker names: every line is something said.
  return said.length ? said : text.split(/\r?\n/).filter((l) => l.trim()).map((l) => ({ coach: false, text: l.trim() }));
}

const sentences = (text: string) => text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Lower-cases the first letter to run on after "Topic:", except for names, days and months. */
const lower = (s: string) => (/^[A-Z][a-z]/.test(s) && !PROPER.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const PROPER = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|greek)\b/i;

/** A sentence that states something on its own: long enough, not a question, no quote-like pronouns. */
function statement(s: string): string | null {
  const t = s.replace(FILLER, '').trim();
  if (t.length < 18 || t.split(/\s+/).length < 4 || t.endsWith('?') || PERSONAL.test(t) || SIGNPOST.test(t) || REMARK.test(t)) return null;
  return capital(t.replace(/[.!]+$/, ''));
}

/** "Let's try it for one week" → "Try it for one week"; "I'll send the plan tonight" → "Send the plan tonight". */
function action(s: string, first: string): string | null {
  const t = s.trim().replace(FILLER, '');
  const m = t.match(/^(?:let['’]s|i['’]ll|i will|i['’]m going to)\s+(.+?)[.!]*$/i);
  if (!m || SIGNPOST.test(t)) return null;
  const rest = m[1]
    .replace(/,?\s*and we['’]ll\s+/gi, ', and ')
    .replace(/\bour next\b/gi, 'the next')
    .replace(/\byour\b/gi, `${first}’s`)
    .replace(/\byou\b/gi, first);
  return rest.length < 12 ? null : capital(rest);
}

export function summarizeTranscript(text: string, first: string, coachName: string): MeetingSummary {
  const said = parse(text, coachName);
  const notes = new Map<string, string[]>();
  const note = (label: string, point: string) => (notes.get(label) ?? notes.set(label, []).get(label)!).push(point);
  const followUp: string[] = [];
  // The coach steers the call, so only the coach's words change the topic; the opener before that has none.
  let topic: string | null = null;

  for (const s of said) {
    for (const sentence of sentences(s.text)) {
      const named = TOPICS.filter(([, words]) => words.test(sentence)).map(([label]) => label);
      const about = named[0];
      if (s.coach) {
        // An agenda ("training, food, sleep and the plan") names several topics and starts none of them.
        if (named.length === 1) topic = about;
        else if (!named.length && RECAP.test(sentence)) topic = 'Recap';
        const todo = action(sentence, first);
        if (todo && FOLLOW_UP.test(todo)) {
          if (!followUp.includes(todo)) followUp.push(todo);
          continue;
        }
        if (todo && topic) {
          note(topic, todo);
          continue;
        }
      }
      // Facts count when they name something in the topic's ground (or any, on the recap), so chat drops out.
      const fact = statement(sentence);
      if (fact && topic && about) note(topic, fact);
    }
  }

  // Up to three points a topic, in the order the call reached them.
  const discuss = [...notes].map(([label, points]) => `${label}: ${[...new Set(points)].slice(0, 3).map(lower).join('; ')}.`);
  if (!discuss.length) {
    const facts = said.flatMap((s) => sentences(s.text)).map(statement).filter((x): x is string => Boolean(x));
    if (facts.length) discuss.push(`${facts.slice(0, 3).join('. ')}.`);
  }
  if (!followUp.length) followUp.push(`Check back on these points with ${first} at the next call`);
  return { discuss, followUp: followUp.map((f) => `${f}.`) };
}
