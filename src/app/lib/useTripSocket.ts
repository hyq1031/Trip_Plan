import { useEffect, useRef } from "react";
import type { ServerEvent } from "../../shared/types";
import { tripSocketUrl } from "./api";
import { useTripStore } from "../store/tripStore";

export function useTripSocket(tripId: string, token: string, memberId: string | null) {
  const setPresence = useTripStore((s) => s.setPresence);
  const setPlaces = useTripStore((s) => s.setPlaces);
  const setPacking = useTripStore((s) => s.setPacking);
  const setVotingEnabled = useTripStore((s) => s.setVotingEnabled);
  const setConnected = useTripStore((s) => s.setConnected);
  const retryDelay = useRef(1000);

  useEffect(() => {
    if (!memberId) return;
    let ws: WebSocket | null = null;
    let closedByEffect = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      ws = new WebSocket(tripSocketUrl(tripId, token, memberId!));

      ws.onopen = () => {
        retryDelay.current = 1000;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as ServerEvent;
        if (data.type === "presence") setPresence(data.members);
        if (data.type === "places") setPlaces(data.places, data.version);
        if (data.type === "packing") setPacking(data.groupPacking, data.personalPacking);
        if (data.type === "trip") setVotingEnabled(data.votingEnabled);
      };

      ws.onclose = () => {
        setConnected(false);
        if (closedByEffect) return;
        retryTimer = setTimeout(connect, retryDelay.current);
        retryDelay.current = Math.min(retryDelay.current * 2, 15000);
      };
    }

    connect();

    return () => {
      closedByEffect = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [tripId, token, memberId, setPresence, setPlaces, setPacking, setVotingEnabled, setConnected]);
}
