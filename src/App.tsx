import { DashboardView } from './components/DashboardView';
import { Header } from './components/Header';
import { RightRail } from './components/RightRail';
import { Sidebar } from './components/Sidebar';
import { TodayBrief } from './components/TodayBrief';
import { Toast } from './components/Toast';
import { useStore } from './state/store';

/** Web-only layout designed at 1440 × 900; narrower windows scroll sideways inside the shell. */
export default function App() {
  const { state } = useStore();
  return (
    <div className="h-full overflow-x-auto">
      <div className="flex h-full min-w-[1280px]">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Header />
          <div className="flex-1 overflow-y-auto">
            {state.view === 'brief' ? (
              <div className="grid min-h-full grid-cols-2">
                <div className="relative z-[1] bg-white shadow-column">
                  <TodayBrief />
                </div>
                <RightRail />
              </div>
            ) : (
              <DashboardView />
            )}
          </div>
        </main>
      </div>
      <Toast />
    </div>
  );
}
