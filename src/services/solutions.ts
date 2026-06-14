import { collection, addDoc, getDocs, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Solution } from '../types';

const COLLECTION_NAME = 'solutions';

export const createSolution = async (solutionData: Omit<Solution, 'id' | 'createdAt'>) => {
  if (!db) throw new Error("Firestore not initialized");

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...solutionData,
    createdAt: serverTimestamp()
  });

  return docRef.id;
};

export const getSolutionsForAssignment = async (assignmentId: string, studentId: string): Promise<Solution[]> => {
  if (!db) return [];

  const q = query(
    collection(db, COLLECTION_NAME),
    where("assignmentId", "==", assignmentId),
    where("studentId", "==", studentId)
    // Firestore requires composite index for orderBy with where on different fields, so we sort in client or create index
  );
  
  const querySnapshot = await getDocs(q);
  const solutions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Solution));
  
  // Sort by iteration descending (newest first)
  return solutions.sort((a, b) => b.iteration - a.iteration);
};

export const getAllSolutionsForAssignment = async (assignmentId: string): Promise<Solution[]> => {
  if (!db) return [];

  const q = query(
    collection(db, COLLECTION_NAME),
    where("assignmentId", "==", assignmentId)
  );
  
  const querySnapshot = await getDocs(q);
  const solutions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Solution));
  
  // Sort by iteration descending
  return solutions.sort((a, b) => b.iteration - a.iteration);
};
