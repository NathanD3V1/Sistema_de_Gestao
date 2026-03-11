
import fs from 'fs/promises';
import path from 'path';

export type IncidentStatus =
  | 'PENDENTE'
  | 'EM_TRANSITO'
  | 'NO_LOCAL'
  | 'EM_EXECUCAO'
  | 'CONCLUIDO';

export type Incident = {
  id: string;
  teamId: string;
  title: string;
  address: string;
  priority: string; // "Alta" | "Média" | "Baixa"
  status: IncidentStatus;

  // timestamps ISO
  departedAt: string | null; // saiu para o local
  arrivedAt: string | null;  // chegou no local
  startedAt: string | null;  // iniciou execução
  finishedAt: string | null; // finalizou
  updatedAt: string;         // última atualização
};

const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'incidents.json');

// lock simples para serializar acesso a arquivo
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

export async function getAllIncidents(): Promise<Incident[]> {
  return withLock(async () => {
    await ensureFile();
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Incident[]) : [];
    } catch {
      return [];
    }
  });
}

export async function saveAllIncidents(list: Incident[]): Promise<void> {
  return withLock(async () => {
    const content = JSON.stringify(list, null, 2);
    await fs.writeFile(DATA_PATH, content, 'utf-8');
  });
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  const all = await getAllIncidents();
  return all.find(i => i.id === id) ?? null;
}

export async function getIncidentsByTeam(teamId: string): Promise<Incident[]> {
  const all = await getAllIncidents();
  return all.filter(i => i.teamId === teamId);
}

export async function createIncident(newIncident: Omit<Incident, 'updatedAt'>): Promise<Incident> {
  const all = await getAllIncidents();
  const exists = all.some(i => i.id === newIncident.id);
  if (exists) throw new Error('ID já existe');
  const item: Incident = { ...newIncident, updatedAt: new Date().toISOString() };
  all.push(item);
  await saveAllIncidents(all);
  return item;
}

export async function patchIncident(id: string, partial: Partial<Incident>): Promise<Incident | null> {
  const all = await getAllIncidents();
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) return null;
  const merged = { ...all[idx], ...partial, updatedAt: new Date().toISOString() };
  all[idx] = merged;
  await saveAllIncidents(all);
  return merged;
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus
): Promise<Incident | null> {
  const all = await getAllIncidents();
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const nowIso = new Date().toISOString();
  const incident = all[idx];

  const timeFields: Partial<Incident> = {};
  switch (status) {
    case 'EM_TRANSITO':
      if (!incident.departedAt) timeFields.departedAt = nowIso;
      break;
    case 'NO_LOCAL':
      if (!incident.arrivedAt) timeFields.arrivedAt = nowIso;
      break;
    case 'EM_EXECUCAO':
      if (!incident.startedAt) timeFields.startedAt = nowIso;
      break;
    case 'CONCLUIDO':
      if (!incident.finishedAt) timeFields.finishedAt = nowIso;
      break;
  }

  const updated: Incident = {
    ...incident,
    status,
    ...timeFields,
    updatedAt: nowIso,
  };

  all[idx] = updated;
  await saveAllIncidents(all);
  return updated;
}

export async function deleteIncident(id: string): Promise<boolean> {
  const all = await getAllIncidents();
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  await saveAllIncidents(all);
  return true;
}
