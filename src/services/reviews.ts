import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Review } from '../types';

const COLLECTION_NAME = 'reviews';

export const createReview = async (submissionId: string, reviewData: Omit<Review, 'id' | 'submissionId' | 'createdAt'>) => {
  if (!db) throw new Error("Firestore not initialized");

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    submissionId,
    ...reviewData,
    createdAt: serverTimestamp()
  });

  // Update submission status to 'pending_teacher_review', but keep AI score temporarily
  const submissionRef = doc(db, 'submissions', submissionId);
  await updateDoc(submissionRef, { 
    status: 'pending_teacher_review',
    score: reviewData.score // This is a draft score now
  });

  return docRef.id;
};

export const getReviewForSubmission = async (submissionId: string): Promise<Review | null> => {
  if (!db) return null;

  const q = query(collection(db, COLLECTION_NAME), where("submissionId", "==", submissionId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) return null;

  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Review;
};
