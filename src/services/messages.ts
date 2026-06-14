import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

export interface AppMessage {
  id?: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt?: any;
}

export const sendMessage = async (message: Omit<AppMessage, 'id' | 'read' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      ...message,
      read: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error sending message: ", error);
    throw error;
  }
};

export const markMessageAsRead = async (id: string) => {
  try {
    const docRef = doc(db, 'messages', id);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error("Error marking message as read: ", error);
    throw error;
  }
};
