import { FolderAuditTab } from './components/FolderAuditTab';
import {
  BarChart3,
  CalendarHeart,
  ClipboardList,
  FileText,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { DataProvider, useData } from '@/context/DataContext';
import { Sidebar } from '@/components/Sidebar';
import { EmployeesTab } from '@/components/EmployeesTab';
import { VacationsTab } from '@/components/VacationsTab';
import { TimeCardTab } from '@/components/TimeCardTab';
import { CertificatesTab } from '@/components/CertificatesTab';
import { ReportsTab } from '@/components/ReportsTab';
import type { TabId } from '@/types';

const tabLabels: Record<TabId, string> = {
  employees: 'Cadastro de Colaboradores',
  vacations: 'Férias',
  timecard: 'Cartão de Ponto',
  certificates: 'Atestados',
  reports: 'Relatórios',
  ['folder-audit' as TabId]: 'Auditoria de Prontuários',
};

function MobileTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
}) {
  const items: { id: TabId; icon: typeof UserPlus }[] = [
    { id: 'employees', icon: UserPlus },
    { id: 'vacations', icon: CalendarHeart },
    { id: 'timecard', icon: ClipboardList },
    { id: 'certificates', icon: FileText },
    { id: 'reports', icon: BarChart3 },
  ];
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={[
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
              isActive ? 'text-slate-900' : 'text-slate-400',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" />
            {tabLabels[item.id].split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}

function AppContent() {
  const { loading, error } = useData();
  const [activeTab, setActiveTab] = useState<TabId>('employees');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-slate-400" />
          <p className="mt-3 text-sm text-slate-500">Carregando plataforma...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-lg font-bold text-red-600">Erro de conexão</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 lg:pb-0">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">RH Platform</span>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {tabLabels[activeTab]}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sistema de Gestão de Recursos Humanos
            </p>
          </div>

          {activeTab === 'employees' && <EmployeesTab />}
          {activeTab === 'vacations' && <VacationsTab />}
          {activeTab === 'timecard' && <TimeCardTab />}
          {activeTab === 'certificates' && <CertificatesTab />}
          {activeTab === 'reports' && <ReportsTab />}
{(activeTab as any) === 'folder-audit' && <FolderAuditTab />}
        </main>
      </div>
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
