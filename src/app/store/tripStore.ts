import { create } from "zustand";
import type { GroupPackingItem, Member, PersonalPackingItem, Place, Trip } from "../../shared/types";

interface TripStore {
  trip: Trip | null;
  members: Member[];
  places: Place[];
  placesVersion: number;
  groupPacking: GroupPackingItem[];
  personalPacking: PersonalPackingItem[];
  selectedDay: number;
  selectedPlaceId: string | null;
  connected: boolean;
  setTripState: (
    trip: Trip,
    members: Member[],
    places: Place[],
    groupPacking: GroupPackingItem[],
    personalPacking: PersonalPackingItem[],
  ) => void;
  setPresence: (members: Member[]) => void;
  setVotingEnabled: (votingEnabled: boolean) => void;
  /** Server broadcast / reconnect snapshot. Ignores out-of-order deliveries older than what we already have. */
  setPlaces: (places: Place[], version?: number) => void;
  /** Optimistic local update from a REST response, applied before the WS broadcast round-trip arrives. */
  upsertPlace: (place: Place) => void;
  removePlaceById: (id: string) => void;
  reorderLocal: (dayIndex: number, orderedIds: string[]) => void;
  setPacking: (groupPacking: GroupPackingItem[], personalPacking: PersonalPackingItem[]) => void;
  upsertGroupItem: (item: GroupPackingItem) => void;
  removeGroupItemById: (id: string) => void;
  upsertPersonalItem: (item: PersonalPackingItem) => void;
  setConnected: (connected: boolean) => void;
  setSelectedDay: (day: number) => void;
  setSelectedPlaceId: (id: string | null) => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>((set) => ({
  trip: null,
  members: [],
  places: [],
  placesVersion: 0,
  groupPacking: [],
  personalPacking: [],
  selectedDay: 0,
  selectedPlaceId: null,
  connected: false,
  setTripState: (trip, members, places, groupPacking, personalPacking) =>
    set({ trip, members, places, groupPacking, personalPacking }),
  setPresence: (members) => set({ members }),
  setVotingEnabled: (votingEnabled) =>
    set((state) => (state.trip ? { trip: { ...state.trip, votingEnabled } } : state)),
  setPlaces: (places, version) =>
    set((state) =>
      version !== undefined && version < state.placesVersion
        ? state
        : { places, placesVersion: version ?? state.placesVersion },
    ),
  upsertPlace: (place) =>
    set((state) => {
      const exists = state.places.some((p) => p.id === place.id);
      return {
        places: exists
          ? state.places.map((p) => (p.id === place.id ? place : p))
          : [...state.places, place],
      };
    }),
  removePlaceById: (id) => set((state) => ({ places: state.places.filter((p) => p.id !== id) })),
  reorderLocal: (dayIndex, orderedIds) =>
    set((state) => {
      const order = new Map(orderedIds.map((id, index) => [id, index]));
      return {
        places: state.places.map((p) =>
          order.has(p.id) ? { ...p, dayIndex, sortOrder: order.get(p.id)! } : p,
        ),
      };
    }),
  setPacking: (groupPacking, personalPacking) => set({ groupPacking, personalPacking }),
  upsertGroupItem: (item) =>
    set((state) => {
      const exists = state.groupPacking.some((i) => i.id === item.id);
      return {
        groupPacking: exists
          ? state.groupPacking.map((i) => (i.id === item.id ? item : i))
          : [...state.groupPacking, item],
      };
    }),
  removeGroupItemById: (id) =>
    set((state) => ({ groupPacking: state.groupPacking.filter((i) => i.id !== id) })),
  upsertPersonalItem: (item) =>
    set((state) => ({
      personalPacking: state.personalPacking.map((i) => (i.id === item.id ? item : i)),
    })),
  setConnected: (connected) => set({ connected }),
  setSelectedDay: (selectedDay) => set({ selectedDay, selectedPlaceId: null }),
  setSelectedPlaceId: (selectedPlaceId) => set({ selectedPlaceId }),
  reset: () =>
    set({
      trip: null,
      members: [],
      places: [],
      placesVersion: 0,
      groupPacking: [],
      personalPacking: [],
      selectedDay: 0,
      selectedPlaceId: null,
      connected: false,
    }),
}));
