'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: React.ReactNode;
  iconBg?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  icon,
  iconBg = 'bg-sky-500/10',
  children,
  maxWidth = 'max-w-lg',
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={`fixed top-1/2 left-1/2 z-50 bg-[#111827] border border-white/[0.06] rounded-2xl p-6 w-full ${maxWidth} mx-4 shadow-2xl max-h-[90vh] overflow-y-auto`}
                initial={{ opacity: 0, y: 20, scale: 0.98, x: '-50%', translateY: '-50%' }}
                animate={{ opacity: 1, y: 0, scale: 1, x: '-50%', translateY: '-50%' }}
                exit={{ opacity: 0, y: 20, scale: 0.98, x: '-50%', translateY: '-50%' }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    {icon && (
                      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
                        {icon}
                      </div>
                    )}
                    <Dialog.Title className="text-base font-semibold text-slate-200">
                      {title}
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <button className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 flex items-center justify-center transition-all">
                      <HiOutlineXMark className="w-3.5 h-3.5" />
                    </button>
                  </Dialog.Close>
                </div>

                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
