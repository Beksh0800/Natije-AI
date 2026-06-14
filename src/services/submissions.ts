import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Submission } from '../types';

const COLLECTION_NAME = 'submissions';

export const createSubmission = async (submissionData: Omit<Submission, 'id' | 'createdAt'>) => {
  if (!db) throw new Error("Firestore not initialized");

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...submissionData,
    createdAt: serverTimestamp()
  });

  return docRef.id;
};

export const getStudentSubmissions = async (studentId: string) => {
  if (!db) return [];

  const q = query(collection(db, COLLECTION_NAME), where("studentId", "==", studentId));
  const querySnapshot = await getDocs(q);

  const submissions: Submission[] = [];
  querySnapshot.forEach((doc) => {
    submissions.push({ id: doc.id, ...doc.data() } as Submission);
  });

  return submissions;
};

export const getTeacherSubmissions = async (teacherId: string) => {
  if (!db) return [];

  const q = query(collection(db, COLLECTION_NAME), where("teacherId", "==", teacherId));
  const querySnapshot = await getDocs(q);

  const submissions: Submission[] = [];
  querySnapshot.forEach((doc) => {
    submissions.push({ id: doc.id, ...doc.data() } as Submission);
  });

  return submissions;
};
