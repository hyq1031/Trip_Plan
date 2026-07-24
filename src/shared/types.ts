export type TripType = "friends" | "family";

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  version: number;
  tripType: TripType;
  /** When false, undecided/voting UI is hidden and new places default straight to "planned". */
  votingEnabled: boolean;
}

export type AgeGroup = "adult" | "teen" | "child" | "infant";

export interface Member {
  id: string;
  name: string;
  color: string;
  emoji: string;
  online: boolean;
  /** Place the member has marked themselves "at" during day-of mode, or null. */
  currentPlaceId: string | null;
  ageGroup: AgeGroup;
  /** Free-text medical/allergy/emergency-contact note, visible to the whole group. */
  notes: string;
}

export type PlaceStatus = "idea" | "undecided" | "planned" | "booked";

export interface Place {
  id: string;
  dayIndex: number;
  sortOrder: number;
  name: string;
  lat: number;
  lng: number;
  time: string | null;
  estCost: number | null;
  category: string;
  notes: string;
  status: PlaceStatus;
  /** memberId -> +1/-1, only meaningful while status is "undecided" */
  votes: Record<string, 1 | -1>;
}

export interface NewPlaceInput {
  dayIndex: number;
  name: string;
  lat: number;
  lng: number;
  time?: string | null;
  estCost?: number | null;
  category?: string;
  notes?: string;
  status?: PlaceStatus;
}

export type PlacePatch = Partial<
  Pick<Place, "dayIndex" | "name" | "lat" | "lng" | "time" | "estCost" | "category" | "notes" | "status">
>;

export interface GroupPackingItem {
  id: string;
  name: string;
  qty: number;
  claimedBy: string | null;
  checked: boolean;
}

export interface PersonalPackingItem {
  id: string;
  memberId: string;
  name: string;
  checked: boolean;
}

export interface TicketPriceResult {
  price: number | null;
  currency: string | null;
  sourceUrl: string | null;
  note: string;
  checkedAt: string;
  cached: boolean;
}

/** AI-suggested hotel, name/area/reasoning only — no live rates (no booking API integrated). */
export interface HotelSuggestion {
  name: string;
  area: string;
  priceTier: string;
  note: string;
}

export interface TripState {
  trip: Trip;
  members: Member[];
  places: Place[];
  groupPacking: GroupPackingItem[];
  personalPacking: PersonalPackingItem[];
  hotelSuggestions: HotelSuggestion[];
}

export type ServerEvent =
  | { type: "presence"; members: Member[] }
  | { type: "places"; places: Place[]; version: number }
  | { type: "packing"; groupPacking: GroupPackingItem[]; personalPacking: PersonalPackingItem[] }
  | { type: "trip"; votingEnabled: boolean }
  | { type: "hotels"; hotelSuggestions: HotelSuggestion[] };
