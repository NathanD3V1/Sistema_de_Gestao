import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import 'leaflet/dist/leaflet.css';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sistema de Gestão de Ocorrências',
  description: 'Controle e coordenação de equipes em tempo real',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={roboto.className}>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0',
            },
          }}
        />
      </body>
    </html>
  );
}