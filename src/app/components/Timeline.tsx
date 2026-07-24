import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { Member, Place, TicketPriceResult } from "../../shared/types";
import { hotelSearchUrl } from "../lib/api";
import { useI18n } from "../lib/i18n";

function VoteRow({
  place,
  memberId,
  onVote,
  onPromote,
}: {
  place: Place;
  memberId: string;
  onVote: (value: 1 | -1 | 0) => void;
  onPromote: () => void;
}) {
  const { t } = useI18n();
  const votes = Object.values(place.votes);
  const up = votes.filter((v) => v === 1).length;
  const down = votes.filter((v) => v === -1).length;
  const myVote = place.votes[memberId] ?? 0;

  return (
    <div className="ml-9 flex items-center gap-2 pb-2 text-sm" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onVote(myVote === 1 ? 0 : 1)}
        className={`rounded-full border px-2 py-0.5 ${myVote === 1 ? "border-emerald-600 bg-emerald-50" : "border-ink/20"}`}
      >
        👍 {up}
      </button>
      <button
        type="button"
        onClick={() => onVote(myVote === -1 ? 0 : -1)}
        className={`rounded-full border px-2 py-0.5 ${myVote === -1 ? "border-red-600 bg-red-50" : "border-ink/20"}`}
      >
        👎 {down}
      </button>
      {up > down && up > 0 && (
        <button
          type="button"
          onClick={onPromote}
          className="rounded-full bg-ink px-2 py-0.5 text-cream"
        >
          {t("timeline.promote")}
        </button>
      )}
    </div>
  );
}

function PriceRow({
  place,
  tripStartDate,
  tripEndDate,
  onLookupPrice,
  onUseTicketPrice,
}: {
  place: Place;
  tripStartDate: string;
  tripEndDate: string;
  onLookupPrice: (placeId: string, name: string) => Promise<TicketPriceResult>;
  onUseTicketPrice: (placeId: string, price: number) => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<
    { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "done"; result: TicketPriceResult }
  >({ status: "idle" });

  async function handleLookup() {
    setState({ status: "loading" });
    try {
      const result = await onLookupPrice(place.id, place.name);
      setState({ status: "done", result });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "lookup failed" });
    }
  }

  return (
    <div
      className="ml-9 flex flex-wrap items-center gap-2 pb-2 text-xs text-ink/60"
      onClick={(e) => e.stopPropagation()}
    >
      <a
        href={hotelSearchUrl(place.name, tripStartDate, tripEndDate)}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-ink/20 px-2 py-0.5 hover:bg-cream"
      >
        🏨 {t("timeline.findHotels")}
      </a>
      {state.status !== "done" && (
        <button
          type="button"
          onClick={handleLookup}
          disabled={state.status === "loading"}
          className="rounded-full border border-ink/20 px-2 py-0.5 hover:bg-cream disabled:opacity-50"
        >
          {state.status === "loading" ? t("timeline.checking") : `🎟️ ${t("timeline.checkPrice")}`}
        </button>
      )}
      {state.status === "error" && <span className="text-red-700">{state.message}</span>}
      {state.status === "done" && (
        <>
          <span>
            {state.result.price != null
              ? `${state.result.currency ?? ""} ${state.result.price.toLocaleString()}`.trim()
              : t("timeline.noPriceFound")}
            {state.result.note ? ` · ${state.result.note}` : ""}
            {state.result.cached ? ` (${t("timeline.cached")})` : ""}
          </span>
          {state.result.sourceUrl && (
            <a
              href={state.result.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {t("timeline.source")}
            </a>
          )}
          {state.result.price != null && (
            <button
              type="button"
              onClick={() => onUseTicketPrice(place.id, state.result.price!)}
              className="rounded-full bg-ink px-2 py-0.5 text-cream"
            >
              {t("timeline.usePrice")}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PlaceRow({
  place,
  index,
  selected,
  memberId,
  membersHere,
  tripStartDate,
  tripEndDate,
  votingEnabled,
  onSelect,
  onDelete,
  onVote,
  onPromote,
  onLookupPrice,
  onUseTicketPrice,
}: {
  place: Place;
  index: number;
  selected: boolean;
  memberId: string;
  membersHere: Member[];
  tripStartDate: string;
  tripEndDate: string;
  votingEnabled: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onVote: (value: 1 | -1 | 0) => void;
  onPromote: () => void;
  onLookupPrice: (placeId: string, name: string) => Promise<TicketPriceResult>;
  onUseTicketPrice: (placeId: string, price: number) => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`rounded border ${selected ? "border-ink bg-white" : "border-rule bg-white/50"}`}
    >
      <div className="flex items-center gap-3 px-3 py-2" onClick={onSelect}>
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab select-none text-ink/30"
          aria-label="drag to reorder"
        >
          ⠿
        </span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terracotta text-xs text-cream">
          {index + 1}
        </span>
        <span className="w-14 shrink-0 text-xs text-ink-soft">{place.time ?? ""}</span>
        <span className="flex-1 truncate">
          {place.category} {place.name}
          {place.status === "undecided" && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              {t("timeline.upForVote")}
            </span>
          )}
          {membersHere.length > 0 && (
            <span className="ml-2 text-xs" title={`${membersHere.map((m) => m.name).join(", ")} ${t("dayof.hereNow")}`}>
              {membersHere.map((m) => m.emoji).join(" ")} {t("timeline.hereNow")}
            </span>
          )}
        </span>
        {place.estCost != null && (
          <span className="shrink-0 text-sm text-ink-soft">¥{place.estCost.toLocaleString()}</span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 text-ink/30 hover:text-red-700"
          aria-label="delete place"
        >
          ×
        </button>
      </div>
      {place.status === "undecided" && votingEnabled && (
        <VoteRow place={place} memberId={memberId} onVote={onVote} onPromote={onPromote} />
      )}
      {place.status === "undecided" && !votingEnabled && (
        <div className="ml-9 pb-2 text-sm" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onPromote} className="rounded-full bg-ink px-2 py-0.5 text-cream">
            {t("timeline.markPlanned")}
          </button>
        </div>
      )}
      <PriceRow
        place={place}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        onLookupPrice={onLookupPrice}
        onUseTicketPrice={onUseTicketPrice}
      />
    </li>
  );
}

export default function Timeline({
  places,
  selectedPlaceId,
  memberId,
  members,
  tripStartDate,
  tripEndDate,
  votingEnabled,
  onSelectPlace,
  onReorder,
  onDeletePlace,
  onVote,
  onPromote,
  onLookupPrice,
  onUseTicketPrice,
}: {
  places: Place[];
  selectedPlaceId: string | null;
  memberId: string;
  members: Member[];
  tripStartDate: string;
  tripEndDate: string;
  votingEnabled: boolean;
  onSelectPlace: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onDeletePlace: (id: string) => void;
  onVote: (placeId: string, value: 1 | -1 | 0) => void;
  onPromote: (placeId: string) => void;
  onLookupPrice: (placeId: string, name: string) => Promise<TicketPriceResult>;
  onUseTicketPrice: (placeId: string, price: number) => void;
}) {
  const { t } = useI18n();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = places.map((p) => p.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const reordered = [...ids];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, String(active.id));
    onReorder(reordered);
  }

  if (places.length === 0) {
    return <p className="p-4 text-sm text-ink/40">{t("timeline.noPlaces")}</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2 p-3">
          {places.map((place, index) => (
            <PlaceRow
              key={place.id}
              place={place}
              index={index}
              selected={place.id === selectedPlaceId}
              memberId={memberId}
              membersHere={members.filter((m) => m.currentPlaceId === place.id && m.online)}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              votingEnabled={votingEnabled}
              onSelect={() => onSelectPlace(place.id)}
              onDelete={() => onDeletePlace(place.id)}
              onVote={(value) => onVote(place.id, value)}
              onPromote={() => onPromote(place.id)}
              onLookupPrice={onLookupPrice}
              onUseTicketPrice={onUseTicketPrice}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
