import type { TripRoom } from "./tripRoom";

export interface Env {
  TRIP_ROOM: DurableObjectNamespace<TripRoom>;
  /** OpenRouter API key for the ticket-price lookup (deepseek/deepseek-v4-flash + web plugin). Set via `wrangler secret put OPENROUTER_API_KEY` or .dev.vars locally. */
  OPENROUTER_API_KEY: string;
  /** Shared password required to create a new trip (keeps randoms from spinning up trips on the Worker). Set via `wrangler secret put TRIP_CREATE_PASSWORD` or .dev.vars locally. */
  TRIP_CREATE_PASSWORD: string;
}
