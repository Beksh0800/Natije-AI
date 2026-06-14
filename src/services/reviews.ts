import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Review } from '../types';

const COLLECTION_NAME = 'reviews';

export const createReview = async (targetId: string, isSolution: boolean, reviewData: Omit<Review, 'id' | 'submissionId' | 'solutionId' | 'createdAt'>) => {
  if (!db) throw new Error("Firestore not initialized");

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    [isSolution ? 'solutionId' : 'submissionId']: targetId,
    ...reviewData,
    createdAt: serverTimestamp()
  });

  if (isSolution) {
    const solutionRef = doc(db, 'solutions', targetId);
    await updateDoc(solutionRef, { 
      status: 'ai_reviewed',
      aiScore: reviewData.score
    });
  } else {
    // Legacy support for direct submissions
    const submissionRef = doc(db, 'submissions', targetId);
    await updateDoc(submissionRef, { 
      status: 'pending_teacher_review',
      score: reviewData.score // This is a draft score now
    });
  }

  return docRef.id;
};

export const getReviewForSubmission = async (targetId: string, isSolution: boolean = false): Promise<Review | null> => {
  if (!db) return null;

  const field = isSolution ? "solutionId" : "submissionId";
  const q = query(collection(db, COLLECTION_NAME), where(field, "==", targetId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) return null;

  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Review;
};
