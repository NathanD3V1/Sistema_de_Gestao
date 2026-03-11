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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800 rounded-xl border border-gray-700 p-8 shadow-xl">
        <div className="flex justify-center mb-8">
          <img 
            src="https://www.neoenergia.com/documents/d/bahia/ImagemCoelbaNeo" 
            alt="Neoenergia Coelba" 
            className="h-32 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Sistema de Gestão de Ocorrências</h1>
        <p className="text-gray-400 text-sm mb-6">Entre com sua matrícula para continuar</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="matricula" className="block text-sm font-medium text-gray-300 mb-2">Matrícula</label>
            <input
              id="matricula"
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ex: 1001"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
          </div>
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
          >
            Entrar
          </button>
        </form>
        <p className="text-gray-500 text-xs mt-6 text-center">
          Ex.: Admin 9999 · Equipe 1001
        </p>
      </div>
    </div>
  );
}
