import { firestore } from '../../api/_firebaseAdmin.js';
import type { OracleReadingRecord } from '../types/spiritual.js';

// Fast in-memory cache for development, testing and quick reloads
const readingsCache = new Map<string, OracleReadingRecord>();
const idempotencyCache = new Map<string, string>(); // idempotencyKey -> readingId

export async function saveOracleReading(record: OracleReadingRecord, idempotencyKey?: string): Promise<OracleReadingRecord> {
  readingsCache.set(record.readingId, record);

  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, record.readingId);
  }

  try {
    await firestore.collection('readings').doc(record.readingId).set(record);
  } catch (err) {
    console.warn('[readingStorage] Warning: Failed to persist reading to Firestore, kept in-memory:', err);
  }

  return record;
}

export async function getOracleReadingById(readingId: string): Promise<OracleReadingRecord | null> {
  if (readingsCache.has(readingId)) {
    return readingsCache.get(readingId)!;
  }

  try {
    const doc = await firestore.collection('readings').doc(readingId).get();
    if (doc.exists) {
      const data = doc.data() as OracleReadingRecord;
      readingsCache.set(readingId, data);
      return data;
    }
  } catch (err) {
    console.warn('[readingStorage] Warning: Failed to fetch reading from Firestore:', err);
  }

  return null;
}

export function getReadingIdByIdempotency(idempotencyKey?: string): string | null {
  if (!idempotencyKey) return null;
  return idempotencyCache.get(idempotencyKey) || null;
}
