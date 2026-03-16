'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { USUARIOS } from '@/lib/datos';

export default function LoginPage() {
  const router = useRouter();
  const [matricula, setMatricula] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Se já está logado, redireciona para o painel correto
    const dadosSalvos = localStorage.getItem('usuarioLogado');
    if (dadosSalvos) {
      try {
        const user = JSON.parse(dadosSalvos);
        if (user.cargo === 'ADMIN') {
          router.replace('/admin');
          return;
        }
        if (user.cargo === 'EQUIPE' && user.equipeId) {
          router.replace('/team');
          return;
        }
      } catch {
        localStorage.removeItem('usuarioLogado');
      }
    }
    setCarregando(false);
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const m = matricula.trim();
    if (!m) {
      setErro('Digite sua matrícula.');
      return;
    }
    const usuario = USUARIOS.find(u => u.matricula === m);
    if (!usuario) {
      setErro('Matrícula não encontrada.');
      return;
    }
    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
    if (usuario.cargo === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/team');
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/[0.03] rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-sm relative z-10">
        <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white/[0.04] rounded-xl flex items-center justify-center border border-white/[0.06]">
              <img 
                src="https://www.neoenergia.com/documents/d/bahia/ImagemCoelbaNeo" 
                alt="Neoenergia" 
                className="h-10 object-contain"
              />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-slate-200 mb-1 text-center">
            Gestão de Ocorrências
          </h1>
          <p className="text-slate-500 text-xs mb-7 text-center">Acesso seguro ao sistema integrado</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="matricula" className="block text-xs font-medium text-slate-500 ml-0.5">
                Matrícula de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="matricula"
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ex: 1001 ou 9999"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/50 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>
            
            {erro && (
              <div className="bg-red-500/8 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {erro}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 rounded-lg transition-all text-sm hover:shadow-lg hover:shadow-sky-500/20 flex items-center justify-center gap-2"
            >
              Entrar no Sistema
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          
          <div className="mt-6 pt-5 border-t border-white/[0.04]">
            <p className="text-center text-[10px] text-slate-600 font-medium tracking-wider uppercase">
              Sistema Restrito • Apenas Uso Autorizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
