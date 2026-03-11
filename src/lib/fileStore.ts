
import fs from 'fs/promises';
import path from 'path';

export type StatusOcorrencia = 'PENDENTE' | 'EM_TRANSITO' | 'NO_LOCAL' | 'EM_EXECUCAO' | 'CONCLUIDO';

export type Ocorrencia = {
  id: string;
  equipeId: string;
  titulo: string;
  endereco: string;
  prioridade: string; // "Alta" | "Média" | "Baixa"
  status: StatusOcorrencia;
  saida: string | null;   // ISO
  chegada: string | null; // ISO
  inicio: string | null;  // ISO
  fim: string | null;     // ISO
  updatedAt: string;      // ISO
};

const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'ocorrencias.json');

// Lock simples para serializar acesso ao arquivo
let lock: Promise<void> = Promise.resolve();
const withLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  let release: () => void = () => {};
  const prev = lock;
  lock = new Promise<void>(r => (release = r));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
};

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, '[]', 'utf-8');
  }
}

export async function getAllOcorrencias(): Promise<Ocorrencia[]> {
  return withLock(async () => {
    await ensureFile();
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data as Ocorrencia[] : [];
    } catch {
      return [];
    }
  });
}

export async function saveAllOcorrencias(list: Ocorrencia[]): Promise<void> {
  return withLock(async () => {
    const content = JSON.stringify(list, null, 2);
    await fs.writeFile(DATA_PATH, content, 'utf-8');
  });
}

export async function getOcorrenciasByEquipe(equipeId: string): Promise<Ocorrencia[]> {
  const all = await getAllOcorrencias();
  return all.filter(o => o.equipeId === equipeId);
}

export async function updateOcorrenciaStatus(id: string, status: StatusOcorrencia) {
  const nowIso = new Date().toISOString();
  const all = await getAllOcorrencias();
  const idx = all.findIndex(o => o.id === id);
  if (idx === -1) return null;

  const o = all[idx];
  const timeFields: Partial<Ocorrencia> = {};
  switch (status) {
    case 'EM_TRANSITO':
      if (!o.saida) timeFields.saida = nowIso;
      break;
    case 'NO_LOCAL':
      if (!o.chegada) timeFields.chegada = nowIso;
      break;
    case 'EM_EXECUCAO':
      if (!o.inicio) timeFields.inicio = nowIso;
      break;
    case 'CONCLUIDO':
      if (!o.fim) timeFields.fim = nowIso;
      break;
  }

  const updated = { ...o, status, ...timeFields, updatedAt: nowIso };
  all[idx] = updated;
  await saveAllOcorrencias(all);
  return updated;
}
