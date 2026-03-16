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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Dinâmico Premium */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md relative z-10 glass-card-dark rounded-3xl p-10 transform transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner group transition-all duration-300 hover:scale-105 hover:bg-white/10">
            <img 
              src="https://www.neoenergia.com/documents/d/bahia/ImagemCoelbaNeo" 
              alt="Neoenergia" 
              className="h-16 object-contain group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2 text-center tracking-tight">
          Gestão de Ocorrências
        </h1>
        <p className="text-slate-400 text-sm mb-8 text-center font-medium">Acesso seguro ao sistema integrado</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="matricula" className="block text-sm font-semibold text-slate-300 ml-1">
              Matrícula de Acesso
            </label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-500 group-focus-within/input:text-blue-400 transition-colors duration-300 text-lg">👤</span>
              </div>
              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 1001 ou 9999"
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-slate-800/80 outline-none transition-all duration-300 shadow-inner backdrop-blur-sm"
                autoFocus
              />
            </div>
          </div>
          
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3.5 rounded-xl flex items-center gap-2 animate-pulse">
              <span>⚠️</span>
              {erro}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02]"
          >
            <div className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <span className="relative flex items-center justify-center gap-2">
              Entrar no Sistema <span className="text-xl group-hover:translate-x-1 transition-transform duration-300">→</span>
            </span>
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-700/50">
          <p className="text-center text-xs text-slate-500 font-medium">
            Sistema Restrito • Apenas Uso Autorizado
          </p>
        </div>
      </div>
    </div>
  );
}
