import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export interface AppNotification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'assignment' | 'grade' | 'message' | 'system';
  read: boolean;
  link?: string;
  createdAt?: any;
}

export const createNotification = async (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification: ", error);
    throw error;
  }
};

export const markNotificationAsRead = async (id: string) => {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error("Error marking notification as read: ", error);
    throw error;
  }
};

export const deleteNotification = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    console.error("Error deleting notification: ", error);
    throw error;
  }
};
