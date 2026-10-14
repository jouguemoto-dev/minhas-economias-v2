import React, { useState } from 'react';
import { Home, ReceiptText, Target, PieChart, Menu, Settings, Download, X, ChevronRight, BarChart2, ShieldCheck, Smartphone } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenExportModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenExportModal,
}) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const navItems = [
    { id: 'inicio', label: 'Início', icon: Home },
    { id: 'transacoes', label: 'Transações', icon: ReceiptText },
    { id: 'sonhos', label: 'Sonhos', icon: Target },
    { id: 'orcamento', label: 'Orçamento', icon: PieChart },
  ];

  return (
    <>
      {/* Slide-up Menu Drawer for "Mais" */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs select-none animate-fadeIn lg:hidden">
          <div className="bg-white rounded-t-2xl shadow-2xl border-t-2 border-[#82af07] max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#f8faf2]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#82af07] flex items-center justify-center text-white font-black text-sm">
                  ME
                </div>
                <div>
                  <h3 className="font-black text-[15px] text-[#000000]">Menu Minhas Economias</h3>
                  <p className="text-[12px] text-[#555555]">Todas as ferramentas e configurações</p>
                </div>
              </div>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-black font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-3 space-y-1 text-[14px]">
              {/* Análises */}
              <div className="px-3 pt-2 pb-1 text-[11.5px] font-black text-[#555555] uppercase tracking-wider">
                Relatórios e Gráficos
              </div>
              <button
                onClick={() => {
                  setActiveTab('analise-categorias');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#f1f6df] text-left font-bold text-[#000000] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <PieChart className="w-4 h-4 text-[#82af07]" />
                  <span>Despesas por Categoria</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('analise-evolucao');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#f1f6df] text-left font-bold text-[#000000] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <BarChart2 className="w-4 h-4 text-[#82af07]" />
                  <span>Evolução do Saldo</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('analise-fluxo');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#f1f6df] text-left font-bold text-[#000000] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#82af07] font-bold text-sm">⚖️</span>
                  <span>Receitas x Despesas</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Gerenciamento */}
              <div className="px-3 pt-3 pb-1 text-[11.5px] font-black text-[#555555] uppercase tracking-wider">
                Configurações & Gestão
              </div>
              <button
                onClick={() => {
                  setActiveTab('config-contas');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#f1f6df] text-left font-bold text-[#000000] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-[#82af07]" />
                  <span>Gerenciar Contas Bancárias</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('config-categorias');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#f1f6df] text-left font-bold text-[#000000] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">🏷️</span>
                  <span>Gerenciar Categorias</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setActiveTab('config-regras');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#f1f6df] text-left font-bold text-[#000000] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#82af07]" />
                  <span>Regras automáticas</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => {
                  setActiveTab('config-app');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#f1f6df] text-left font-bold text-[#000000] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-[#82af07]" />
                  <span>Instalação do aplicativo</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {/* Exportar */}
              <div className="px-3 pt-3 pb-1 text-[11.5px] font-black text-[#555555] uppercase tracking-wider">
                Ações
              </div>
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenExportModal();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-[#f1f6df] text-left font-bold text-[#000000] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-black" />
                  <span>Exportar Extrato (Excel / CSV / PDF)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar on Mobile Screens (hidden on lg: screens) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#82af07] flex items-center justify-around py-1.5 px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] lg:hidden select-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-md transition-all cursor-pointer ${
                isActive ? 'text-[#82af07] font-black scale-105' : 'text-[#555555] font-bold hover:text-black'
              }`}
            >
              <div className={`p-1 rounded-full ${isActive ? 'bg-[#edf6d8]' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11.5px] mt-0.5 leading-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More Tab */}
        <button
          onClick={() => setMoreMenuOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-md transition-all cursor-pointer ${
            activeTab.startsWith('analise') || activeTab.startsWith('config')
              ? 'text-[#82af07] font-black scale-105'
              : 'text-[#555555] font-bold hover:text-black'
          }`}
        >
          <div className="p-1 rounded-full relative">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11.5px] mt-0.5 leading-tight">Mais</span>
        </button>
      </nav>
    </>
  );
};
