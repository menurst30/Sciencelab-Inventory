import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Standard Firestore initialization (connecting to standard default database)
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' && !firebaseConfig.firestoreDatabaseId.startsWith('ai-studio-'))
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'list';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  entityType?: string;
  documentId?: string;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  entityType?: string,
  documentId?: string
): FirestoreErrorInfo {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Firestore ${operationType}] Error on entity "${entityType || 'unknown'}" (id: ${documentId || 'none'}):`, error);
  return {
    error: message,
    operationType,
    entityType,
    documentId,
  };
}

export async function testFirestoreConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true };
  } catch (err: any) {
    // If the doc doesn't exist, it still successfully reached the Firestore server
    if (err?.code === 'not-found' || (err?.message && err.message.toLowerCase().includes('not found'))) {
      return { connected: true };
    }
    // If permission or other network error, report it
    return { connected: false, error: err?.message || String(err) };
  }
}
