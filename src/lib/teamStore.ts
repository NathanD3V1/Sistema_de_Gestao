import fs from 'fs/promises';
import path from 'path';

export type TeamStatus = 'AVAILABLE' | 'ON_CALL' | 'IN_TRANSIT' | 'ON_SITE' | 'BUSY';

export type Team = {
  id: string;
  name: string;
  companyId: string;
  status: TeamStatus;
  location?: string;
  members?: number;
  vehicle?: string;
  phone?: string;
};

const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'teams.json');

// Lock simples para serializar acesso a arquivo
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

export async function getAllTeams(): Promise<Team[]> {
  return withLock(async () => {
    await ensureFile();
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as Team[]) : [];
    } catch {
      return [];
    }
  });
}

export async function saveAllTeams(list: Team[]): Promise<void> {
  return withLock(async () => {
    const content = JSON.stringify(list, null, 2);
    await fs.writeFile(DATA_PATH, content, 'utf-8');
  });
}

export async function getTeamById(id: string): Promise<Team | null> {
  const all = await getAllTeams();
  return all.find(t => t.id === id) ?? null;
}

export async function createTeam(newTeam: Omit<Team, 'companyId'>): Promise<Team> {
  const all = await getAllTeams();
  const exists = all.some(t => t.id === newTeam.id);
  if (exists) throw new Error('ID já existe');
  const item: Team = { 
    ...newTeam, 
    companyId: 'default-company',
    status: newTeam.status || 'AVAILABLE',
  };
  all.push(item);
  await saveAllTeams(all);
  return item;
}

export async function updateTeam(id: string, partial: Partial<Team>): Promise<Team | null> {
  const all = await getAllTeams();
  const idx = all.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const merged = { ...all[idx], ...partial };
  all[idx] = merged;
  await saveAllTeams(all);
  return merged;
}

export async function deleteTeam(id: string): Promise<boolean> {
  const all = await getAllTeams();
  const idx = all.findIndex(t => t.id === id);
  if (idx === -1) return false;
  all.splice(idx, 1);
  await saveAllTeams(all);
  return true;
}

