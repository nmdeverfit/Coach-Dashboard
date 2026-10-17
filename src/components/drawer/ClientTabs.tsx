import { useState } from 'react';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientProfile } from '../../data/types';
import { summarizeNutrition } from '../../lib/checkin';
import { formRows } from '../../lib/client';
import { getSessions } from '../../data/sessions';
import { ISSUE_CREDITS_TOAST, buildPrepareView, buildUnblockView, reminderToast } from '../../lib/todos';
import { useStore } from '../../state/store';
import { FormStatus } from './AssessedBodies';
import { NotesTab } from './NotesTab';
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
  { key: 'transcript', label: 'Transcript' },
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
}: {
  client: Client;
  profile: ClientProfile;
  initialTab?: ClientTabKey | null;
  withTranscript?: boolean;
}) {
  const tabs = CLIENT_TABS.filter((t) => (t.key !== 'booking' || getSessions(client.id)) && (t.key !== 'transcript' || withTranscript));
  const [tab, setTab] = useState<ClientTabKey>(() => (initialTab && tabs.some((t) => t.key === initialTab) ? initialTab : profile.focus));
  return (
    <DataArea>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      <ClientTabContent tab={tab} client={client} profile={profile} />
    </DataArea>
  );
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
      return <NotesTab client={client} notes={profile.notes} />;
    case 'transcript':
      return <TranscriptTab client={client} />;
  }
}

/** Booking: the Prepare panel's Sessions card, then the Unblock panel's Session credits card, from the same data. */
function BookingTab({ client }: { client: Client }) {
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
