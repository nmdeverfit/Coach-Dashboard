import { useState } from 'react';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientProfile } from '../../data/types';
import { summarizeNutrition } from '../../lib/checkin';
import { formRows } from '../../lib/client';
import { getSessions } from '../../data/sessions';
import { buildPrepareView, buildUnblockView } from '../../lib/todos';
import { FormStatus } from './AssessedBodies';
import { NotesTab } from './NotesTab';
import { NutritionTab } from './NutritionTab';
import { DataArea, TabBar } from './PanelParts';
import { CreditsCard, SessionsCard } from './SessionsBodies';
import { TaskHabitTab } from './TaskHabitTab';
import { CurrentProgramCard, TrainingTab } from './TrainingTab';

/** The six data tabs of a Check-in panel and the client detail page (Spec 4 BL1). */
export const CLIENT_TABS = [
  { key: 'training', label: 'Training' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'tasks', label: 'Task & Habit' },
  { key: 'program', label: 'Program Ending' },
  { key: 'form', label: 'Form' },
  { key: 'booking', label: 'Booking' },
  { key: 'notes', label: 'Notes' },
] as const;

export type ClientTabKey = (typeof CLIENT_TABS)[number]['key'];

/**
 * main_signal picks the first tab (BL2). Booking (Spec 4 BL2's `booking` tab) only shows for a client with 1:1
 * sessions or session credits.
 */
export function ClientTabs({ client, profile }: { client: Client; profile: ClientProfile }) {
  const [tab, setTab] = useState<ClientTabKey>(profile.focus);
  const tabs = CLIENT_TABS.filter((t) => t.key !== 'booking' || getSessions(client.id));
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
  }
}

/** Booking: the Prepare panel's Sessions card, then the Unblock panel's Session credits card, from the same data. */
function BookingTab({ client }: { client: Client }) {
  const s = getSessions(client.id);
  if (!s) return null;
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <SessionsCard view={buildPrepareView({ kind: 'prepare', sessions: s.sessions }, DEMO_TODAY)} />
      <CreditsCard view={s.credits.length ? buildUnblockView({ kind: 'unblock', credits: s.credits }, client.firstName, DEMO_TODAY) : null} />
    </div>
  );
}
