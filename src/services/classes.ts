import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { SchoolClass } from '../types';

const COLLECTION_NAME = 'classes';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const createClass = async (teacherId: string, name: string) => {
  if (!db) throw new Error("Firestore not initialized");
  
  const inviteCode = generateInviteCode();
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    teacherId,
    name,
    inviteCode,
    createdAt: serverTimestamp()
  });
  
  return docRef.id;
};

export const getTeacherClasses = async (teacherId: string) => {
  if (!db) return [];
  
  const q = query(collection(db, COLLECTION_NAME), where("teacherId", "==", teacherId));
  const querySnapshot = await getDocs(q);
  
  const classes: SchoolClass[] = [];
  querySnapshot.forEach((doc) => {
    classes.push({ id: doc.id, ...doc.data() } as SchoolClass);
  });
  
  return classes;
};

export const findClassByInviteCode = async (inviteCode: string): Promise<SchoolClass | null> => {
  if (!db) return null;
  
  const q = query(collection(db, COLLECTION_NAME), where("inviteCode", "==", inviteCode.toUpperCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as SchoolClass;
};

