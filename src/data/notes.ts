/**
 * The coach's own wording for the demo's notes, by title: a few headed sections with lists, the shape the Note
 * details frame (Figma 5850:570056) draws. Stored as the small HTML subset the note editor writes (p, b, i, ul, ol,
 * li). No figures from the logs, so a note can never disagree with the data tabs.
 */
const h = (text: string) => `<p><b>${text}</b></p>`;
const ul = (...items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const ol = (...items: string[]) => `<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
const p = (text: string) => `<p>${text}</p>`;
const note = (text: string) => `<p><i>Note: <b>${text}</b></i></p>`;

export const NOTE_BODIES: Record<string, string> = {
  'Prefers morning sessions':
    h('Schedule') +
    ul('Trains best before work; evenings clash with family time.', 'Book 1:1s before 9 AM where the calendar allows.') +
    note('Move evening slots to the morning when rescheduling'),
  'Knee felt fine on squats':
    h('Session check') +
    ul('Reported no knee discomfort through the squat sets.', 'Depth and tempo looked controlled on the last two sets.') +
    h('Next steps') +
    ol('Keep the current squat variation for another week.', 'Ask about the knee again at the next check-in.') +
    note('Stop and swap the movement if discomfort comes back'),
  'Travelling for work this month':
    h('Travel') +
    ul('Away for work most of this month, mostly hotel stays.', 'Hotel gyms vary; bodyweight and dumbbell options needed.') +
    h('Plan') +
    ol('Send a short travel version of the week.', 'Keep check-ins brief while away.'),
  'Wants to try a new split':
    h('Request') +
    ul('Asked to move from full body to an upper / lower split.', 'Enjoys longer sessions on fewer days.') +
    h('To review') +
    ol('Look at the end of the current block before changing anything.', 'Discuss options on the next call.'),
  'Focus on form on deadlifts':
    h('Technique') +
    ul('Hips rising early off the floor on heavier sets.', 'Cue: chest up, push the floor away.') +
    h('Plan') +
    ol('Hold the working weight until the setup is consistent.', 'Ask for a side-on video of the top set.') +
    note('Areas for improvement'),
  'Increase protein at breakfast':
    h('Nutrition') +
    ul('Breakfast is mostly toast and coffee.', 'Suggested eggs, Greek yoghurt or a shake as easy swaps.') +
    note('Check how the swaps feel after a week'),
  'Asked about rest days':
    h('Question') +
    ul('Wanted to know whether light activity on rest days is fine.', 'Worried about losing progress when taking days off.') +
    h('Answer given') +
    ul('Walking and mobility are encouraged on rest days.', 'Recovery is part of the plan, not a break from it.'),
  'Goal: first pull-up by December':
    h('Goal Setting') +
    ol('First strict pull-up by December.', 'Build up with band-assisted and negative reps.') +
    h('Workout Plan') +
    ul('Two pulling sessions a week.', 'Test a strict rep at the end of each block.'),
  'Stay consistent on weekends':
    h('Pattern') +
    ul('Weekdays go to plan; weekends slip with social plans.', 'Prefers a short session over skipping the day.') +
    h('Plan') +
    ol('Offer a 20-minute weekend option.', 'Plan weekend meals on Friday.'),
  'Prefers short check-in messages':
    h('Communication') +
    ul('Reads messages between meetings; long ones get missed.', 'One question per message works best.') +
    note('Keep check-ins to two or three lines'),
  // Clint Jacobi's own notes (his Check-in to-do).
  'Travelling for work until mid-September':
    h('Travel') +
    ul('On a work trip until mid-September, changing hotels most weeks.', 'Meals are mostly eaten out.') +
    h('Plan') +
    ol('Keep the program, with hotel-gym swaps where needed.', 'Log meals with photos when weighing is not possible.'),
  'Hotel gym only: dumbbells up to 25 kg':
    h('Equipment') +
    ul('Hotel gyms only while travelling.', 'Dumbbells go up to 25 kg; no barbell or rack.') +
    note('Swap barbell lifts for dumbbell versions until the trip ends'),
  'Goal: cut to 82 kg by October':
    h('Goal Setting') +
    ol('Reach 82 kg by October.', 'Keep strength while cutting.') +
    h('Nutrition') +
    ul('Moderate calorie deficit, protein kept high.', 'Weekly check-in form to track the trend.'),
};

/** A note with no written body yet reads as its title. */
export const noteBody = (title: string) => NOTE_BODIES[title] ?? p(title);
