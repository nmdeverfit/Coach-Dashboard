import type { ReactNode } from 'react';
import { DashboardView } from './components/DashboardView';
import { CustomizeCards } from './components/CustomizeCards';
import { ClientDrawer } from './components/drawer/ClientDetails';
import { SessionDrawer } from './components/drawer/SessionDetails';
import { TodoDrawer } from './components/drawer/TodoDrawer';
import { Header } from './components/Header';
import { RightRail } from './components/RightRail';
import { Sidebar } from './components/Sidebar';
import { SidePanel } from './components/side/SidePanel';
import { TodayBrief } from './components/TodayBrief';
import { NotesTrialBar } from './components/NotesTrialBar';
import { Toast } from './components/Toast';
import { NOTES_TIMELINE } from './lib/flags';
import { sideIsSidebar, useStore } from './state/store';

const SLIDE_MS = 420;

/** One view on the slide track; off-screen it sits at `offset` and is hidden once the slide ends. */
function ViewLayer({ active, offset, children }: { active: boolean; offset: string; children: ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      data-view-layer={active ? 'active' : 'inactive'}
      className="absolute inset-0 overflow-y-auto"
      style={{
        transform: active ? 'translateX(0)' : `translateX(${offset})`,
        visibility: active ? 'visible' : 'hidden',
        transition: `transform ${SLIDE_MS}ms cubic-bezier(0.65, 0, 0.35, 1), visibility 0s linear ${active ? 0 : SLIDE_MS}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Web-only layout designed at 1440 × 900; narrower windows scroll sideways inside the shell. */
export default function App() {
  const { state } = useStore();
  return (
    <div className="h-full overflow-x-auto">
      {/* While the middle column is a sidebar (opened from a Client highlight) the page gives it 360 px on the right
          and the brief reflows into the rest. */}
      <div className={`flex h-full min-w-[1280px] transition-[padding] duration-300 ${sideIsSidebar(state) ? 'pr-[360px]' : ''}`}>
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Header />
          {/* Both views stay mounted side by side and slide as one track: the Dashboard comes in from the right, the
              brief from the left. The header stays put. Each view keeps its own scroll and state. */}
          <div className="relative flex-1 overflow-hidden">
            <ViewLayer active={state.view === 'brief'} offset="-100%">
              {state.weekOffset === 0 ? (
                // Layout test (branch claude/layout-3-columns): three parts, the brief takes two and the rail one.
                // The stacked rail runs far longer than the brief, so each column scrolls on its own. The rail is
                // fixed at a third of the page (sidebar excluded), so when the highlights' sidebar opens only the
                // brief gives up its 360 px (the user's call).
                <div className="grid h-full grid-cols-[minmax(0,1fr)_calc((max(100vw,1280px)-4rem)/3)]">
                  <div className="scroll-thin relative z-[1] overflow-y-auto bg-white shadow-column">
                    <TodayBrief />
                  </div>
                  <div className="scroll-thin overflow-y-auto bg-surface-secondary">
                    <RightRail narrow />
                  </div>
                </div>
              ) : (
                // A past week has no to-do list (BL AC10.6): the group cards and highlights take the full width.
                <div className="min-h-full">
                  <RightRail wide />
                </div>
              )}
            </ViewLayer>
            <ViewLayer active={state.view === 'dashboard'} offset="100%">
              <DashboardView />
            </ViewLayer>
          </div>
        </main>
      </div>
      <TodoDrawer />
      <ClientDrawer />
      <SessionDrawer />
      <SidePanel />
      {state.customize && <CustomizeCards initialTab={state.customize} />}
      {NOTES_TIMELINE && <NotesTrialBar />}
      <Toast />
    </div>
  );
}
