import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { AgeGroup } from "../../shared/types";
import {
  addGroupItem,
  castVote,
  createPlace,
  deleteGroupItem,
  deletePlace,
  fetchTripState,
  type GeocodeResult,
  joinTrip,
  lookupTicketPrice,
  reorderPlaces,
  setCurrentPlace,
  togglePersonalItem,
  updateGroupItem,
  updatePlace,
  updateTripSettings,
} from "../lib/api";
import { todayDayIndex } from "../lib/dayOf";
import { tripDays } from "../lib/days";
import { downloadOfflineHtml } from "../lib/exportTrip";
import { useI18n } from "../lib/i18n";
import { getLocalMember, saveLocalMember } from "../lib/member";
import { useTripSocket } from "../lib/useTripSocket";
import { useTripStore } from "../store/tripStore";
import AddPlaceForm from "../components/AddPlaceForm";
import DayOfBanner from "../components/DayOfBanner";
import DayTabs from "../components/DayTabs";
import HotelSuggestions from "../components/HotelSuggestions";
import LanguageToggle from "../components/LanguageToggle";
import MapView from "../components/MapView";
import PackingPanel from "../components/PackingPanel";
import PresenceBar from "../components/PresenceBar";
import Timeline from "../components/Timeline";

type ViewTab = "itinerary" | "packing";

export default function TripPage() {
  const { id: tripId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("k") ?? "";
  const { t, lang } = useI18n();

  const {
    trip,
    members,
    places,
    groupPacking,
    personalPacking,
    hotelSuggestions,
    connected,
    selectedDay,
    selectedPlaceId,
    setTripState,
    setSelectedDay,
    setSelectedPlaceId,
    upsertPlace,
    removePlaceById,
    reorderLocal,
    upsertGroupItem,
    removeGroupItemById,
    upsertPersonalItem,
    reset,
  } = useTripStore();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("itinerary");
  const [joinAgeGroup, setJoinAgeGroup] = useState<AgeGroup>("adult");
  const [joinNotes, setJoinNotes] = useState("");

  useEffect(() => {
    reset();
    setLoadError(null);
    fetchTripState(tripId, token)
      .then((state) => {
        setTripState(
          state.trip,
          state.members,
          state.places,
          state.groupPacking,
          state.personalPacking,
          state.hotelSuggestions,
        );
        const todayIdx = todayDayIndex(tripDays(state.trip.startDate, state.trip.endDate));
        if (todayIdx !== null) setSelectedDay(todayIdx);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Trip not found"));

    const local = getLocalMember(tripId);
    if (local) setMemberId(local.memberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, token]);

  useTripSocket(tripId, token, memberId);

  const days = useMemo(
    () => (trip ? tripDays(trip.startDate, trip.endDate) : []),
    [trip],
  );

  const todayIdx = useMemo(() => todayDayIndex(days), [days]);

  const dayPlaces = useMemo(
    () =>
      places
        .filter((p) => p.dayIndex === selectedDay)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [places, selectedDay],
  );

  const dayCoords = useMemo(
    () =>
      days.map((_, index) => {
        const first = places
          .filter((p) => p.dayIndex === index)
          .sort((a, b) => a.sortOrder - b.sortOrder)[0];
        return first ? { lat: first.lat, lng: first.lng } : null;
      }),
    [days, places],
  );

  const dayTotal = dayPlaces.reduce((sum, p) => sum + (p.estCost ?? 0), 0);
  const tripTotal = places.reduce((sum, p) => sum + (p.estCost ?? 0), 0);

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    const local = saveLocalMember(tripId, name);
    await joinTrip(tripId, token, local.memberId, name, lang, joinAgeGroup, joinNotes.trim());
    setMemberId(local.memberId);
  }

  async function handleToggleVoting() {
    if (!trip) return;
    await updateTripSettings(tripId, token, { votingEnabled: !trip.votingEnabled });
  }

  async function handleAddPlace(result: GeocodeResult, upForVote: boolean) {
    const shortName = result.name.split(",")[0];
    // Optimistic: apply the REST response immediately rather than waiting on
    // this client's own WS broadcast round-trip (which the WS delivers too,
    // but redundantly — upsertPlace is idempotent on the same id).
    const place = await createPlace(tripId, token, {
      dayIndex: selectedDay,
      name: shortName,
      lat: result.lat,
      lng: result.lng,
      status: upForVote ? "undecided" : "planned",
    });
    upsertPlace(place);
  }

  async function handleReorder(orderedIds: string[]) {
    // Optimistic: reorder locally before the request completes so the list
    // doesn't snap back to the pre-drag order while waiting on the network.
    reorderLocal(selectedDay, orderedIds);
    await reorderPlaces(tripId, token, selectedDay, orderedIds);
  }

  async function handleDeletePlace(placeId: string) {
    removePlaceById(placeId);
    await deletePlace(tripId, token, placeId);
  }

  async function handleVote(placeId: string, value: 1 | -1 | 0) {
    if (!memberId) return;
    const place = await castVote(tripId, token, placeId, memberId, value);
    upsertPlace(place);
  }

  async function handlePromote(placeId: string) {
    const place = await updatePlace(tripId, token, placeId, { status: "planned" });
    upsertPlace(place);
  }

  async function handleAddGroupItem(name: string) {
    const item = await addGroupItem(tripId, token, name);
    upsertGroupItem(item);
  }

  async function handleToggleGroupChecked(id: string, checked: boolean) {
    const item = await updateGroupItem(tripId, token, id, { checked });
    upsertGroupItem(item);
  }

  async function handleClaimGroupItem(id: string, claim: boolean) {
    const item = await updateGroupItem(tripId, token, id, { claimedBy: claim ? memberId : null });
    upsertGroupItem(item);
  }

  async function handleDeleteGroupItem(id: string) {
    removeGroupItemById(id);
    await deleteGroupItem(tripId, token, id);
  }

  async function handleTogglePersonal(id: string, checked: boolean) {
    const item = await togglePersonalItem(tripId, token, id, checked);
    upsertPersonalItem(item);
  }

  async function handleLookupPrice(placeId: string, name: string) {
    return lookupTicketPrice(tripId, token, placeId, name);
  }

  async function handleUseTicketPrice(placeId: string, price: number) {
    const place = await updatePlace(tripId, token, placeId, { estCost: price });
    upsertPlace(place);
  }

  async function handleSetCurrentPlace(placeId: string | null) {
    if (!memberId) return;
    await setCurrentPlace(tripId, token, memberId, placeId);
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-center">
        <p className="text-ink/70">{t("trip.notFound")}</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-ink/50">{t("trip.loading")}</p>
      </div>
    );
  }

  if (!memberId) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-3 flex justify-end">
            <LanguageToggle />
          </div>
          <form
            onSubmit={handleJoin}
            className="space-y-5 rounded-lg border border-rule bg-cream-dim/60 p-7"
          >
            <h1 className="font-serif text-3xl text-ink">{trip.title}</h1>
            <p className="text-sm text-ink-soft">
              {trip.startDate} → {trip.endDate}
            </p>
            <div className="h-px bg-rule" />
            <label className="block text-sm text-ink-soft">
              {t("join.yourName")}
              <input
                name="name"
                autoFocus
                className="mt-1 w-full rounded border border-rule bg-cream px-3 py-2 outline-none focus:border-terracotta"
                placeholder={t("join.namePlaceholder")}
                required
              />
            </label>
            <label className="block text-sm text-ink-soft">
              {t("join.ageGroup")}
              <select
                value={joinAgeGroup}
                onChange={(e) => setJoinAgeGroup(e.target.value as AgeGroup)}
                className="mt-1 w-full rounded border border-rule bg-cream px-3 py-2 outline-none focus:border-terracotta"
              >
                <option value="adult">{t("join.ageGroupAdult")}</option>
                <option value="teen">{t("join.ageGroupTeen")}</option>
                <option value="child">{t("join.ageGroupChild")}</option>
                <option value="infant">{t("join.ageGroupInfant")}</option>
              </select>
            </label>
            <label className="block text-sm text-ink-soft">
              {t("join.medicalNotes")}
              <textarea
                value={joinNotes}
                onChange={(e) => setJoinNotes(e.target.value)}
                placeholder={t("join.medicalNotesPlaceholder")}
                rows={2}
                className="mt-1 w-full rounded border border-rule bg-cream px-3 py-2 outline-none focus:border-terracotta"
              />
            </label>
            <button type="submit" className="w-full rounded bg-ink py-2.5 font-medium text-cream">
              {t("join.joinButton")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-cream">
      <header className="flex items-center justify-between border-b border-rule px-4 py-3">
        <div>
          <h1 className="font-serif text-2xl tracking-tight text-ink">{trip.title}</h1>
          <p className="text-xs text-ink-soft">
            {trip.startDate} → {trip.endDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <div className="flex rounded-full border border-ink/15 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setTab("itinerary")}
              className={`rounded-full px-3 py-1 ${tab === "itinerary" ? "bg-ink text-cream" : "text-ink/60"}`}
            >
              {t("header.itinerary")}
            </button>
            <button
              type="button"
              onClick={() => setTab("packing")}
              className={`rounded-full px-3 py-1 ${tab === "packing" ? "bg-ink text-cream" : "text-ink/60"}`}
            >
              {t("header.packing")}
            </button>
          </div>
          <button
            type="button"
            onClick={handleToggleVoting}
            className={`rounded-full border px-3 py-1 text-sm ${
              trip.votingEnabled ? "border-ink/20 text-ink/70 hover:bg-white" : "border-ink/20 bg-ink/5 text-ink/50"
            }`}
            title="Toggle whether new places go up for a group vote or straight to planned"
          >
            {trip.votingEnabled ? t("header.votingOn") : t("header.votingOff")}
          </button>
          <button
            type="button"
            onClick={() => downloadOfflineHtml(trip, places, groupPacking, personalPacking, members, lang)}
            className="rounded-full border border-ink/20 px-3 py-1 text-sm text-ink/70 hover:bg-white"
            title="Download an offline copy of the whole itinerary"
          >
            ⬇️ {t("header.export")}
          </button>
          <PresenceBar members={members} connected={connected} />
        </div>
      </header>

      {tab === "itinerary" ? (
        <>
          <DayTabs days={days} selectedDay={selectedDay} dayCoords={dayCoords} onSelect={setSelectedDay} />

          {todayIdx !== null && selectedDay === todayIdx && (
            <DayOfBanner
              dayIndex={todayIdx}
              dayPlaces={dayPlaces}
              members={members}
              memberId={memberId}
              onSetCurrentPlace={handleSetCurrentPlace}
            />
          )}

          <div className="flex items-center justify-between px-4 py-1 text-xs text-ink-soft">
            <span>{t("totals.dayTotal")}: ¥{dayTotal.toLocaleString()}</span>
            <span>{t("totals.tripTotal")}: ¥{tripTotal.toLocaleString()}</span>
          </div>

          <HotelSuggestions
            suggestions={hotelSuggestions}
            tripStartDate={trip.startDate}
            tripEndDate={trip.endDate}
          />

          <div className="h-[42vh] shrink-0 border-b border-rule">
            <MapView
              places={dayPlaces}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={setSelectedPlaceId}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <Timeline
              places={dayPlaces}
              selectedPlaceId={selectedPlaceId}
              memberId={memberId}
              members={members}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
              votingEnabled={trip.votingEnabled}
              onSelectPlace={setSelectedPlaceId}
              onReorder={handleReorder}
              onDeletePlace={handleDeletePlace}
              onVote={handleVote}
              onPromote={handlePromote}
              onLookupPrice={handleLookupPrice}
              onUseTicketPrice={handleUseTicketPrice}
            />
            <AddPlaceForm onAdd={handleAddPlace} votingEnabled={trip.votingEnabled} />
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <PackingPanel
            groupPacking={groupPacking}
            personalPacking={personalPacking}
            members={members}
            memberId={memberId}
            onAddGroupItem={handleAddGroupItem}
            onToggleGroupChecked={handleToggleGroupChecked}
            onClaimGroupItem={handleClaimGroupItem}
            onDeleteGroupItem={handleDeleteGroupItem}
            onTogglePersonal={handleTogglePersonal}
          />
        </div>
      )}
    </div>
  );
}
