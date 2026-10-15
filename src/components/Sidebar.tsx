import logo from '../assets/figma/logo.svg';
import navAnalytics from '../assets/figma/nav-analytics.svg';
import navAutoflow from '../assets/figma/nav-autoflow.svg';
import navBilling from '../assets/figma/nav-billing.svg';
import navClients from '../assets/figma/nav-clients.svg';
import navCommunity from '../assets/figma/nav-community.svg';
import navDashboard from '../assets/figma/nav-dashboard.svg';
import navInbox from '../assets/figma/nav-inbox.svg';
import navLibrary from '../assets/figma/nav-library.svg';
import navPayments from '../assets/figma/nav-payments.svg';
import navResources from '../assets/figma/nav-resources.svg';
import navTeams from '../assets/figma/nav-teams.svg';
import { coachAvatar } from '../data/mock';
import { Avatar } from './Avatar';

interface NavItem {
  label: string;
  icon: string;
  active?: boolean;
}

const mainNav: NavItem[] = [
  { label: 'Clients', icon: navClients },
  { label: 'Library', icon: navLibrary },
  { label: 'Inbox', icon: navInbox },
  { label: 'Autoflow', icon: navAutoflow },
  { label: 'Resources', icon: navResources },
  { label: 'Teams', icon: navTeams },
  { label: 'Payments', icon: navPayments },
  { label: 'Analytics', icon: navAnalytics },
  { label: 'Check-in Dashboard', icon: navDashboard, active: true },
];

const bottomNav: NavItem[] = [
  { label: 'Billing', icon: navBilling },
  { label: 'Community', icon: navCommunity },
];

function NavButton({ item }: { item: NavItem }) {
  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-current={item.active ? 'page' : undefined}
      className={
        item.active
          ? 'flex h-11 w-12 items-center justify-center rounded-xl bg-gradient-to-t from-white/70 to-white shadow-shadow-1'
          : 'flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-white/50'
      }
    >
      <img src={item.icon} alt="" width={16} height={16} />
    </button>
  );
}

/** Compact Everfit main sidebar (64px) with the brand gradient. */
export function Sidebar() {
  return (
    <aside className="flex h-full w-16 shrink-0 flex-col items-center bg-gradient-to-b from-sidebar-1 from-40% via-sidebar-2 via-80% to-sidebar-3 pb-4">
      <div className="flex h-[88px] w-full items-center justify-center">
        <img src={logo} alt="Everfit" width={29} height={22} />
      </div>
      <nav className="flex w-full flex-1 flex-col items-center justify-between px-2">
        <div className="flex flex-col items-center gap-1">
          {mainNav.map((item) => (
            <NavButton key={item.label} item={item} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
          {bottomNav.map((item) => (
            <NavButton key={item.label} item={item} />
          ))}
        </div>
      </nav>
      <div className="flex w-full items-center justify-center p-2">
        <button type="button" aria-label="Your profile" className="flex h-11 items-center rounded-xl px-2.5">
          <Avatar name="Long" src={coachAvatar} size={24} />
        </button>
      </div>
    </aside>
  );
}
