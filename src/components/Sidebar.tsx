import type { TabId } from '@/types';
import {
  BarChart3,
  CalendarHeart,
  ClipboardList,
  FileText,
  UserPlus,
  FolderCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'employees', label: 'Cadastro de Colaboradores', icon: UserPlus },
  { id: 'vacations', label: 'Férias', icon: CalendarHeart },
  { id: 'timecard', label: 'Cartão de Ponto', icon: ClipboardList },
  { id: 'certificates', label: 'Atestados', icon: FileText },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'folder-audit' as any, label: 'Auditoria de Prontuários', icon: FolderCheck },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-slate-900">RH Platform</p>
          <p className="text-xs text-slate-400">Gestão de Pessoal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}