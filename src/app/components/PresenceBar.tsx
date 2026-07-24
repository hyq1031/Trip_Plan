import type { Member } from "../../shared/types";

export default function PresenceBar({ members, connected }: { members: Member[]; connected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {members.map((m) => (
        <span
          key={m.id}
          title={`${m.name}${m.online ? "" : " (offline)"}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
          style={{ backgroundColor: m.color, opacity: m.online ? 1 : 0.35 }}
        >
          {m.emoji}
        </span>
      ))}
      <span
        className={`ml-2 h-2 w-2 rounded-full ${connected ? "bg-emerald-600" : "bg-ink/30"}`}
        title={connected ? "connected" : "reconnecting…"}
      />
    </div>
  );
}
