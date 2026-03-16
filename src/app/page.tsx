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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-10 shadow-xl">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
            <img 
              src="https://www.neoenergia.com/documents/d/bahia/ImagemCoelbaNeo" 
              alt="Neoenergia" 
              className="h-16 object-contain group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center tracking-tight">
          Gestão de Ocorrências
        </h1>
        <p className="text-slate-500 text-sm mb-8 text-center font-medium">Acesso seguro ao sistema integrado</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="matricula" className="block text-sm font-semibold text-slate-700 ml-1">
              Matrícula de Acesso
            </label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-400 text-lg">👤</span>
              </div>
              <input
                id="matricula"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 1001 ou 9999"
                className="w-full bg-white border border-slate-300 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all duration-200 shadow-sm"
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors duration-200 shadow-md flex items-center justify-center gap-2"
          >
            <span>
              Entrar no Sistema
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
