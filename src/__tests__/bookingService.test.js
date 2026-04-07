import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooking } from '../services/bookingService';
import * as firestore from 'firebase/firestore';

// Mock Firebase config to prevent real initialization
vi.mock('../config/firebase', () => ({
    db: {}
}));

// Mock Firestore functions used in the service
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        collection: vi.fn(),
        addDoc: vi.fn(),
        serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    };
});

describe('bookingService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createBooking', () => {
        it('calls addDoc with the correctly formatted payload', async () => {
            const mockBookingData = {
                userId: 'user_123',
                lotId: 'lot_456',
                spotNumber: 'A1',
            };

            // Mock the response from addDoc with a document ID
            firestore.addDoc.mockResolvedValue({ id: 'dummy_doc_id' });

            const result = await createBooking(mockBookingData);

            // Assert that the object returned contains the ID + original data
            expect(result).toEqual({ ...mockBookingData, id: 'dummy_doc_id' });

            // Assert that addDoc was called with the exact payload
            expect(firestore.addDoc).toHaveBeenCalledTimes(1);
            expect(firestore.addDoc).toHaveBeenCalledWith(
                undefined, // collection(db, 'bookings') -> db is mock empty, collection returns undefined mock
                {
                    ...mockBookingData,
                    createdAt: 'MOCK_TIMESTAMP', // serverTimestamp mock
                }
            );
        });

        it('throws an error if addDoc fails', async () => {
            firestore.addDoc.mockRejectedValue(new Error('Firestore error'));

            await expect(createBooking({ userId: 'u1' })).rejects.toThrow('Firestore error');
        });
    });
});
