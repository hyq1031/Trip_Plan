import { nanoid } from "nanoid";

interface LocalMember {
  memberId: string;
  name: string;
}

function key(tripId: string): string {
  return `friend-trip:member:${tripId}`;
}

export function getLocalMember(tripId: string): LocalMember | null {
  const raw = localStorage.getItem(key(tripId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalMember;
  } catch {
    return null;
  }
}

export function saveLocalMember(tripId: string, name: string): LocalMember {
  const existing = getLocalMember(tripId);
  const member: LocalMember = { memberId: existing?.memberId ?? nanoid(12), name };
  localStorage.setItem(key(tripId), JSON.stringify(member));
  return member;
}
