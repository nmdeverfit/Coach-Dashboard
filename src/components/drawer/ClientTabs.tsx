import { useState } from 'react';
import iconSparkle from '../../assets/figma/icon-ai-sparkle.svg';
import iconMealPlan from '../../assets/figma/icon-meal-plan-edit.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientProfile } from '../../data/types';
import { summarizeNutrition } from '../../lib/checkin';
import { formRows } from '../../lib/client';
import { getSessions } from '../../data/sessions';
import { ISSUE_CREDITS_TOAST, buildPrepareView, buildUnblockView, reminderToast } from '../../lib/todos';
import { useStore } from '../../state/store';
import { Tooltip } from '../Tooltip';
import { FormStatus } from './AssessedBodies';
import { NOTES_TIMELINE } from '../../lib/flags';
import { NotesTab } from './NotesTab';
import { NotesTimeline } from './NotesTimeline';
import { NutritionTab } from './NutritionTab';
import { DataArea, TabBar } from './PanelParts';
import { CreditsCard, SessionsCard } from './SessionsBodies';
import { TaskHabitTab } from './TaskHabitTab';
import { TranscriptTab } from './TranscriptTab';
import { CurrentProgramCard, TrainingTab } from './TrainingTab';

/**
 * The six data tabs of a Check-in panel and the client detail page (Spec 4 BL1), plus Booking for clients with
 * sessions or credits and Transcript (meetings the coach adds) on the client detail page only.
 */
export const CLIENT_TABS = [
  { key: 'training', label: 'Training' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'tasks', label: 'Task & Habit' },
  { key: 'program', label: 'Program Ending' },
  { key: 'form', label: 'Form' },
  { key: 'booking', label: 'Booking' },
  { key: 'notes', label: 'Notes' },
  { key: 'transcript', label: 'Meetings' },
] as const;

export type ClientTabKey = (typeof CLIENT_TABS)[number]['key'];

/**
 * main_signal picks the first tab (BL2), unless the coach came from a list that implies one (`initialTab`: the
 * Booking tab of the client list opens Booking). Booking (Spec 4 BL2's `booking` tab) only shows for a client with 1:1
 * sessions or session credits.
 */
export function ClientTabs({
  client,
  profile,
  initialTab,
  withTranscript,
  withTabActions,
}: {
  client: Client;
  profile: ClientProfile;
  initialTab?: ClientTabKey | null;
  withTranscript?: boolean;
  /** The client detail page's per-tab buttons (Training: Deep analysis; Nutrition: Adjust meal plan). */
  withTabActions?: boolean;
}) {
  // The Notes timeline trial folds Meetings into Notes, on every surface that has the Notes tab.
  const tabs = CLIENT_TABS.filter(
    (t) => (t.key !== 'booking' || getSessions(client.id)) && (t.key !== 'transcript' || (withTranscript && !NOTES_TIMELINE)),
  );
  const [tab, setTab] = useState<ClientTabKey>(() => (initialTab && tabs.some((t) => t.key === initialTab) ? initialTab : profile.focus));
  return (
    <DataArea>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      <ClientTabContent tab={tab} client={client} profile={profile} />
      {withTabActions && <TabActions tab={tab} client={client} />}
    </DataArea>
  );
}

/** A tab's button: 30 px like the header's Dashboard Settings, a step below the page's quick actions and footer. */
const TAB_BTN =
  'flex h-[30px] items-center gap-1.5 rounded-[4px] border border-black/15 bg-white px-5 text-[12px] font-semibold leading-none text-ink';

/**
 * Buttons that belong to one tab, right-aligned under its cards. Training: Deep analysis, an AI button opening Olly
 * on the training log; Nutrition: Adjust meal plan, which leaves for the client's meal plan.
 */
function TabActions({ tab, client }: { tab: ClientTabKey; client: Client }) {
  const { openOlly, showToast } = useStore();
  if (tab === 'training')
    return (
      <div className="flex w-full justify-end">
        {/* The tooltip hangs off a wrapper: the AI button clips its own shine. */}
        <span className="group/tip relative">
          <button type="button" onClick={() => openOlly(client.id, { mode: 'training' })} className={`ai-btn ${TAB_BTN}`}>
            <img src={iconSparkle} alt="" width={14} height={14} />
            Deep analysis
          </button>
          <Tooltip label="AI analyzes client's training progress" end />
        </span>
      </div>
    );
  if (tab === 'nutrition')
    return (
      <div className="flex w-full justify-end">
        <button type="button" onClick={() => showToast(`${client.firstName}’s meal plan opens in Meal Plans`)} className={`${TAB_BTN} hover:bg-surface-secondary`}>
          {/* Figma 5835:570011 (hugeicons task-edit-02), at 60% opacity as drawn, in its inset/bleed wrappers. */}
          <span className="relative size-4 shrink-0 opacity-60" aria-hidden>
            <span className="absolute inset-[12.5%_16.25%]">
              <span className="absolute inset-[-3.75%_-4.17%]">
                <img src={iconMealPlan} alt="" className="block size-full max-w-none" />
              </span>
            </span>
          </span>
          Adjust meal plan
        </button>
      </div>
    );
  return null;
}

export function ClientTabContent({ tab, client, profile }: { tab: ClientTabKey; client: Client; profile: ClientProfile }) {
  switch (tab) {
    case 'training':
      return <TrainingTab log={profile.training} today={DEMO_TODAY} />;
    case 'nutrition':
      return <NutritionTab log={profile.nutrition} summary={summarizeNutrition(profile.nutrition, DEMO_TODAY)} />;
    case 'tasks':
      return <TaskHabitTab client={client} profile={profile} today={DEMO_TODAY} />;
    case 'program':
      return <CurrentProgramCard log={profile.training} today={DEMO_TODAY} />;
    case 'form':
      return <FormStatus rows={formRows(profile, DEMO_TODAY)} />;
    case 'booking':
      return <BookingTab client={client} />;
    case 'notes':
      return NOTES_TIMELINE ? <NotesTimeline client={client} notes={profile.notes} /> : <NotesTab client={client} notes={profile.notes} />;
    case 'transcript':
      return <TranscriptTab client={client} />;
  }
}

/** Booking: the Prepare panel's Sessions card, then the Unblock panel's Session credits card, from the same data. */
export function BookingTab({ client }: { client: Client }) {
  const { showToast } = useStore();
  const s = getSessions(client.id);
  if (!s) return null;
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <SessionsCard view={buildPrepareView({ kind: 'prepare', sessions: s.sessions }, DEMO_TODAY)} onRemind={(b) => showToast(reminderToast(client, b))} />
      <CreditsCard
        view={s.credits.length ? buildUnblockView({ kind: 'unblock', credits: s.credits }, client.firstName, DEMO_TODAY) : null}
        onIssue={() => showToast(ISSUE_CREDITS_TOAST)}
      />
    </div>
  );
}
