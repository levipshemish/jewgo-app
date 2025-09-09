/**
 * Worker Protocol - Frozen Message Contracts
 * 
 * Defines the communication protocol between main thread and workers.
 * Changes here require coordination across worker implementations.
 */

import type { Restaurant, Filters, Bounds, LatLng, Id } from "@/types/livemap";

export type WorkRequest =
  | { 
      kind: "FILTER"; 
      payload: { 
        restaurants: Restaurant[]; 
        filters: Filters; 
        userLoc: LatLng | null; 
        max: number;
      } 
    }
  | { 
      kind: "SORT_BY_DISTANCE"; 
      payload: { 
        ids: Id[]; 
        by: LatLng;
      } 
    };

export type WorkResponse =
  | { 
      kind: "FILTER_RESULT"; 
      payload: { 
        ids: Id[]; 
        reason?: string;
        performance?: {
          filterTime: number;
          itemCount: number;
        };
      } 
    }
  | { 
      kind: "SORT_RESULT"; 
      payload: { 
        ids: Id[];
        performance?: {
          sortTime: number;
          itemCount: number;
        };
      } 
    }
  | { 
      kind: "ERROR"; 
      payload: { 
        message: string;
        requestKind: WorkRequest["kind"];
      } 
    };
