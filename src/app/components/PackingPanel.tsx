import { type FormEvent, useState } from "react";
import type { GroupPackingItem, Member, PersonalPackingItem } from "../../shared/types";
import { useI18n } from "../lib/i18n";

function GroupRow({
  item,
  members,
  memberId,
  onToggleChecked,
  onClaim,
  onDelete,
}: {
  item: GroupPackingItem;
  members: Member[];
  memberId: string;
  onToggleChecked: (checked: boolean) => void;
  onClaim: (claim: boolean) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const claimedByMember = members.find((m) => m.id === item.claimedBy);
  const claimedByMe = item.claimedBy === memberId;

  return (
    <li className="flex items-center gap-2 rounded border border-rule bg-white/50 px-3 py-2">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) => onToggleChecked(e.target.checked)}
      />
      <span className={`flex-1 ${item.checked ? "text-ink/40 line-through" : ""}`}>
        {item.name} {item.qty > 1 ? `×${item.qty}` : ""}
      </span>
      {claimedByMember ? (
        <button
          type="button"
          onClick={() => onClaim(!claimedByMe)}
          className="shrink-0 rounded-full px-2 py-0.5 text-xs text-cream"
          style={{ backgroundColor: claimedByMember.color }}
        >
          {claimedByMember.emoji} {claimedByMember.name}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onClaim(true)}
          className="shrink-0 rounded-full border border-ink/20 px-2 py-0.5 text-xs text-ink/50"
        >
          {t("packing.claim")}
        </button>
      )}
      <button type="button" onClick={onDelete} className="shrink-0 text-ink/30 hover:text-red-700">
        ×
      </button>
    </li>
  );
}

export default function PackingPanel({
  groupPacking,
  personalPacking,
  members,
  memberId,
  onAddGroupItem,
  onToggleGroupChecked,
  onClaimGroupItem,
  onDeleteGroupItem,
  onTogglePersonal,
}: {
  groupPacking: GroupPackingItem[];
  personalPacking: PersonalPackingItem[];
  members: Member[];
  memberId: string;
  onAddGroupItem: (name: string) => void;
  onToggleGroupChecked: (id: string, checked: boolean) => void;
  onClaimGroupItem: (id: string, claim: boolean) => void;
  onDeleteGroupItem: (id: string) => void;
  onTogglePersonal: (id: string, checked: boolean) => void;
}) {
  const { t } = useI18n();
  const [newItem, setNewItem] = useState("");
  const myItems = personalPacking.filter((i) => i.memberId === memberId);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    onAddGroupItem(name);
    setNewItem("");
  }

  return (
    <div className="grid gap-6 p-4 md:grid-cols-2">
      <section>
        <h2 className="mb-2 font-serif text-lg text-ink">{t("packing.groupGear")}</h2>
        <ul className="space-y-2">
          {groupPacking.map((item) => (
            <GroupRow
              key={item.id}
              item={item}
              members={members}
              memberId={memberId}
              onToggleChecked={(checked) => onToggleGroupChecked(item.id, checked)}
              onClaim={(claim) => onClaimGroupItem(item.id, claim)}
              onDelete={() => onDeleteGroupItem(item.id)}
            />
          ))}
          {groupPacking.length === 0 && (
            <p className="text-sm text-ink/40">{t("packing.noGear")}</p>
          )}
        </ul>
        <form onSubmit={handleAdd} className="mt-3 flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={t("packing.addPlaceholder")}
            className="flex-1 rounded border border-ink/20 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded bg-ink px-3 py-1.5 text-sm text-cream">
            {t("packing.addButton")}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-serif text-lg text-ink">{t("packing.yourChecklist")}</h2>
        <ul className="space-y-2">
          {myItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded border border-rule bg-white/50 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => onTogglePersonal(item.id, e.target.checked)}
              />
              <span className={item.checked ? "text-ink/40 line-through" : ""}>{item.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
