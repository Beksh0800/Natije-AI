import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Student } from '../types';

const COLLECTION_NAME = 'students';

function generateParentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const addStudent = async (classId: string, name: string, email: string, studentId?: string): Promise<{ id: string; alreadyExisted: boolean }> => {
  if (!db) throw new Error("Firestore not initialized");

  // Check if student with this email is already in the class
  const q = query(
    collection(db, COLLECTION_NAME),
    where("classId", "==", classId),
    where("email", "==", email)
  );
  const existingSnapshot = await getDocs(q);

  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];
    // If student joins, link their auth uid if it was missing
    if (studentId && !existingDoc.data().studentId) {
      await updateDoc(doc(db, COLLECTION_NAME, existingDoc.id), {
        studentId: studentId
      });
    }
    return { id: existingDoc.id, alreadyExisted: true };
  }

  const parentCode = generateParentCode();

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    classId,
    name,
    email,
    parentCode,
    studentId: studentId || null,
    createdAt: serverTimestamp()
  });

  // Increment student count in the class
  try {
    await updateDoc(doc(db, 'classes', classId), {
      studentsCount: increment(1)
    });
  } catch (err) {
    console.error("Failed to increment studentsCount for class", err);
  }

  return { id: docRef.id, alreadyExisted: false };
};

export const getClassStudents = async (classId: string) => {
  if (!db) return [];

  const q = query(collection(db, COLLECTION_NAME), where("classId", "==", classId));
  const querySnapshot = await getDocs(q);

  const students: Student[] = [];
  querySnapshot.forEach((doc) => {
    students.push({ id: doc.id, ...doc.data() } as Student);
  });

  return students;
};
