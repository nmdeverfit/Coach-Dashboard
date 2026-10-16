import type { ReactNode } from 'react';
import { DashboardView } from './components/DashboardView';
import { ClientDrawer } from './components/drawer/ClientDetails';
import { TodoDrawer } from './components/drawer/TodoDrawer';
import { Header } from './components/Header';
import { RightRail } from './components/RightRail';
import { Sidebar } from './components/Sidebar';
import { TodayBrief } from './components/TodayBrief';
import { Toast } from './components/Toast';
import { useStore } from './state/store';

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
      <div className="flex h-full min-w-[1280px]">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Header />
          {/* Both views stay mounted side by side and slide as one track: the Dashboard comes in from the right, the
              brief from the left. The header stays put. Each view keeps its own scroll and state. */}
          <div className="relative flex-1 overflow-hidden">
            <ViewLayer active={state.view === 'brief'} offset="-100%">
              <div className="grid min-h-full grid-cols-2">
                <div className="relative z-[1] bg-white shadow-column">
                  <TodayBrief />
                </div>
                <RightRail />
              </div>
            </ViewLayer>
            <ViewLayer active={state.view === 'dashboard'} offset="100%">
              <DashboardView />
            </ViewLayer>
          </div>
        </main>
      </div>
      <TodoDrawer />
      <ClientDrawer />
      <Toast />
    </div>
  );
}
