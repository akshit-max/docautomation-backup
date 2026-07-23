import { adminDb } from './firebase-admin';

export const generateInvoiceNumber = async (): Promise<string> => {
    const counterRef = adminDb.collection('counters').doc('invoice_counter');
    
    const newNumber = await adminDb.runTransaction(async (transaction: any) => {
        const doc = await transaction.get(counterRef);
        let currentNumber = 0;
        
        if (doc.exists) {
            const data = doc.data();
            currentNumber = data?.current_number || 0;
        }
        
        currentNumber += 1;
        transaction.set(counterRef, { current_number: currentNumber }, { merge: true });
        
        return currentNumber;
    });
    
    return `MWU-INV-${String(newNumber).padStart(3, '0')}`;
};
