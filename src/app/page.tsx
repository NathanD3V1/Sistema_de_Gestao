/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { HiOutlineBolt, HiOutlineUser, HiOutlineLockClosed, HiOutlineArrowRight } from "react-icons/hi2";

// 1. Tipagem forte para garantir previsibilidade e IntelliSense
interface Usuario {
  matricula: string;
  name: string;
  nome: string;
  cargo: "ADMIN" | "EQUIPE";
  equipeId?: string;
  vehicle?: string;
  phone?: string;
}

interface LoginResponse {
  success: boolean;
  error?: string;
  data?: Usuario;
}

export default function LoginPage() {
  const [matricula, setMatricula] = useState("");
  const [loading, setLoading] = useState(false);
  const [carregandoAuth, setCarregandoAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Se o middleware permitiu o acesso à página de login, 
    // significa que não há uma sessão válida no servidor.
    // Portanto, removemos dados antigos do localStorage para evitar estados inconsistentes
    // e prevenir o loop de redirecionamento infinito.
    localStorage.removeItem("usuarioLogado");
    setCarregandoAuth(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const matriculaFormatada = matricula.trim();
    if (!matriculaFormatada) {
      toast.error("Por favor, insira uma matrícula válida.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula: matriculaFormatada }),
      });

      // 3. Tratamento defensivo primeiro (se o servidor cair com status 500 ou HTML error)
      if (!res.ok) {
        let errorMessage = "Erro na comunicação com o servidor.";
        try {
          // Tenta pegar o erro mapeado pelo backend
          const errorData = await res.json();
          errorMessage = errorData?.error || errorMessage;
        } catch {
          // Fallback se a resposta não for um JSON válido
        }
        throw new Error(errorMessage);
      }

      const json = (await res.json()) as LoginResponse;

      if (json.success && json.data) {
        const user = json.data;
        localStorage.setItem("usuarioLogado", JSON.stringify(user));
        toast.success(`Bem-vindo, ${user.name || user.nome}!`);
        router.push(user.cargo === "ADMIN" ? "/admin" : "/team");
      } else {
        throw new Error(json.error || "Matrícula não encontrada.");
      }
    } catch (err: unknown) {
      // 4. Tipagem segura de erro no bloco catch
      const mensagemErro = err instanceof Error ? err.message : "Erro desconhecido ao conectar.";
      toast.error(mensagemErro);
      setLoading(false);
    }
  };

  // Enquanto verifica o localStorage na montagem
  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center" aria-busy="true" aria-label="Carregando autenticação">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-sky-500/20 mb-6 group hover:scale-105 transition-transform"
          >
            <HiOutlineBolt className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white tracking-tight"
          >
            SGO
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-500 text-sm mt-2 font-medium"
          >
            Sistema de Gestão de Ocorrências
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-[#0d1117]/80 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 shadow-2xl"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              {/* 5. Correção de Acessibilidade (a11y) - Adicionado htmlFor e id */}
              <label htmlFor="input-matricula" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1 cursor-pointer">
                Matrícula do Usuário
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <HiOutlineUser className="h-5 w-5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
                </div>
                <input
                  id="input-matricula"
                  type="text"
                  required
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/40 transition-all text-base"
                  placeholder="EX: 0001 ou 1001"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base tracking-wide"
              aria-label={loading ? "Autenticando..." : "Acessar Sistema"}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Acessar Sistema
                  <HiOutlineArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-slate-600">
               <HiOutlineLockClosed className="w-3.5 h-3.5" />
               <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Ambiente Seguro</span>
             </div>
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-slate-600 text-[11px] mt-8 font-medium"
        >
          &copy; {new Date().getFullYear()} Centro de Coordenação e Comando
        </motion.p>
      </motion.div>
    </div>
  );
}
