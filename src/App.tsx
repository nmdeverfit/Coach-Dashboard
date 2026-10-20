import type { ReactNode } from 'react';
import { DashboardView } from './components/DashboardView';
import { CustomizeCards } from './components/CustomizeCards';
import { ClientDrawer } from './components/drawer/ClientDetails';
import { TodoDrawer } from './components/drawer/TodoDrawer';
import { Header } from './components/Header';
import { RightRail } from './components/RightRail';
import { Sidebar } from './components/Sidebar';
import { SidePanel } from './components/side/SidePanel';
import { TodayBrief } from './components/TodayBrief';
import { Toast } from './components/Toast';
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
                // With the highlights' sidebar open the rail narrows to the AI panel's 360 px and the brief takes the rest
                // (the user's call).
                <div className={`grid min-h-full ${sideIsSidebar(state) ? 'grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-2'}`}>
                  <div className="relative z-[1] bg-white shadow-column">
                    <TodayBrief />
                  </div>
                  <RightRail />
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
      <SidePanel />
      {state.customize && <CustomizeCards initialTab={state.customize} />}
      <Toast />
    </div>
  );
}
