import {
  BookOpen,
  ChartColumnBig,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FolderOpen,
  Handshake,
  MessageCircle,
  Repeat2,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import logo from '../assets/everfit-logo.png';
import { coachAvatar } from '../data/mock';
import { Avatar } from './Avatar';

interface NavItem {
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

const mainNav: NavItem[] = [
  { label: 'Clients', icon: Users },
  { label: 'Library', icon: BookOpen },
  { label: 'Inbox', icon: MessageCircle },
  { label: 'Autoflow', icon: Repeat2 },
  { label: 'Resources', icon: FolderOpen },
  { label: 'Teams', icon: UsersRound },
  { label: 'Payments', icon: CreditCard },
  { label: 'Analytics', icon: ChartColumnBig },
  { label: 'Check-in Dashboard', icon: ClipboardList, active: true },
];

const bottomNav: NavItem[] = [
  { label: 'Billing', icon: CircleDollarSign },
  { label: 'Community', icon: Handshake },
];

function NavButton({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-current={item.active ? 'page' : undefined}
      className={
        item.active
          ? 'flex h-11 w-12 items-center justify-center rounded-xl bg-gradient-to-t from-white/70 to-white text-brand shadow-shadow-1'
          : 'flex h-11 w-11 items-center justify-center rounded-xl text-ink/80 transition-colors hover:bg-white/50'
      }
    >
      <Icon size={16} strokeWidth={2.4} />
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
