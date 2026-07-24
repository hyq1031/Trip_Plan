export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  version: number;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  emoji: string;
  online: boolean;
  /** Place the member has marked themselves "at" during day-of mode, or null. */
  currentPlaceId: string | null;
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

export interface TripState {
  trip: Trip;
  members: Member[];
  places: Place[];
  groupPacking: GroupPackingItem[];
  personalPacking: PersonalPackingItem[];
}

export type ServerEvent =
  | { type: "presence"; members: Member[] }
  | { type: "places"; places: Place[]; version: number }
  | { type: "packing"; groupPacking: GroupPackingItem[]; personalPacking: PersonalPackingItem[] };
