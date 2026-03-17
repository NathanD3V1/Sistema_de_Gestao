/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { HiOutlineBolt, HiOutlineUser, HiOutlineLockClosed, HiOutlineArrowRight } from "react-icons/hi2";

export default function LoginPage() {
  const [matricula, setMatricula] = useState("");
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("usuarioLogado");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        router.push(user.cargo === "ADMIN" ? "/admin" : "/team");
      } catch {
        localStorage.removeItem("usuarioLogado");
        setCarregando(false);
      }
    } else {
      setCarregando(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula: matricula.trim() }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        const user = json.data;
        localStorage.setItem("usuarioLogado", JSON.stringify(user));
        toast.success(`Bem-vindo, ${user.name}!`);
        router.push(user.cargo === "ADMIN" ? "/admin" : "/team");
      } else {
        toast.error(json.error || "Matrícula não encontrada.");
        setLoading(false);
      }
    } catch (err) {
      toast.error("Erro ao conectar com o servidor.");
      setLoading(false);
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
            SGO <span className="text-sky-500">v2</span>
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Matrícula do Usuário
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <HiOutlineUser className="h-5 w-5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
                </div>
                <input
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
          &copy; 2026 Centro de Coordenação e Comando
        </motion.p>
      </motion.div>
    </div>
  );
}
