import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  ChevronsLeft,
  User as UserIcon,
  KeyRound,
  CheckSquare,
  FolderKanban,
  Link as LinkIcon,
  Tag as TagIcon,
  StickyNote,
  FileBox,
  Trash2,
  Search as SearchIcon,
  Calendar as CalendarIcon,
  Briefcase,
} from 'lucide-react';
import { CommandPalette, useCommandPaletteShortcut } from '@/components/CommandPalette';
import { NotificationBell } from '@/components/NotificationBell';
import { QuickAddTaskDialog, useQuickAddShortcut } from '@/components/QuickAddTaskDialog';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { BRANDING } from '@panggonmikir/shared';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: string | null;
}

const nav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { to: '/search', label: 'Cari', icon: SearchIcon, permission: null },
  { to: '/calendar', label: 'Kalender', icon: CalendarIcon, permission: 'task:read' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, permission: 'task:read' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, permission: 'project:read' },
  { to: '/links', label: 'Links', icon: LinkIcon, permission: 'link:read' },
  { to: '/notes', label: 'Notes', icon: StickyNote, permission: 'note:read' },
  { to: '/documents', label: 'Documents', icon: FileBox, permission: 'document:read' },
  { to: '/tags', label: 'Tags', icon: TagIcon, permission: 'tag:read' },
  { to: '/workspaces', label: 'Workspaces', icon: Briefcase, permission: 'workspace:read' },
  { to: '/trash', label: 'Trash', icon: Trash2, permission: null },
  { to: '/users', label: 'Users', icon: Users, permission: 'user:read' },
  { to: '/audit-logs', label: 'Audit Log', icon: FileText, permission: 'audit:read' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings:read' },
];

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed, onNavigate }: SidebarContentProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <nav className="flex-1 space-y-1 p-3">
      {nav
        .filter((n) => !n.permission || hasPermission(n.permission))
        .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
    </nav>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const { user, refreshToken, clear } = useAuthStore();

  const handleLogout = async (): Promise<void> => {
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } finally {
      clear();
      navigate('/login');
    }
  };

  const initials = user?.name
    ?.split(' ')
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials ?? '?'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <UserIcon />
          Profil & Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <KeyRound />
          Ganti password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useCommandPaletteShortcut(setPaletteOpen);
  useQuickAddShortcut(setQuickAddOpen);

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center border-b border-sidebar-border px-4',
            collapsed && 'justify-center px-2',
          )}
        >
          <img
            src={BRANDING.LOGO_DARK}
            alt={BRANDING.APP_NAME}
            className="h-7 w-7 shrink-0"
          />
          {!collapsed && (
            <span className="ml-2 font-heading text-base font-semibold">{BRANDING.APP_NAME}</span>
          )}
        </div>

        <div className="border-b border-sidebar-border p-2">
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        <ScrollArea className="flex-1">
          <SidebarContent collapsed={collapsed} />
        </ScrollArea>

        <Separator className="bg-sidebar-border" />
        <div className="p-3 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((c) => !c)}
            className={cn('w-full justify-start', collapsed && 'justify-center')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft className={cn('transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span>Collapse</span>}
          </Button>
          {!collapsed && (
            <p className="text-[10px] text-sidebar-foreground/50 text-center leading-tight">
              {BRANDING.COPYRIGHT}
            </p>
          )}
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
          <SheetHeader className="h-14 flex-row items-center border-b border-sidebar-border px-4">
            <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
              <img
                src={BRANDING.LOGO_DARK}
                alt={BRANDING.APP_NAME}
                className="h-7 w-7"
              />
              {BRANDING.APP_NAME}
            </SheetTitle>
          </SheetHeader>
          <div className="border-b border-sidebar-border p-2">
            <WorkspaceSwitcher />
          </div>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground gap-2 hidden md:inline-flex"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              <SearchIcon className="h-4 w-4" />
              <span className="text-xs">Cari…</span>
              <kbd className="ml-2 hidden md:inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
            >
              <SearchIcon />
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <Separator orientation="vertical" className="mx-1 h-6" />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <QuickAddTaskDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}
