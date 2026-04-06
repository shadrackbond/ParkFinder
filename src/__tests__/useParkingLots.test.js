import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useParkingLots from '../hooks/useParkingLots';
import * as parkingService from '../services/parkingService';

// Mock the external service
vi.mock('../services/parkingService', () => ({
    subscribeToActiveLots: vi.fn(),
}));

// Mock the Zustand store manually for testing
const mockSetLots = vi.fn();
vi.mock('../store/useParkingStore', () => {
    return {
        default: () => ({
            lots: [],
            setLots: mockSetLots
        })
    };
});

describe('useParkingLots Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with loading state as true', () => {
        // Mock subscribeToActiveLots to do nothing initially
        parkingService.subscribeToActiveLots.mockImplementation(() => {
            return vi.fn(); // return a dummy unsubscribe function
        });

        const { result } = renderHook(() => useParkingLots());
        
        expect(result.current.loading).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('updates loading to false and sets data on successful fetch', () => {
        const mockLotsData = [{ id: '1', name: 'Test Lot' }];
        
        // Simulate immediate success callback
        parkingService.subscribeToActiveLots.mockImplementation((onSuccess) => {
            onSuccess(mockLotsData);
            return vi.fn(); // return dummy unsubscribe
        });

        const { result } = renderHook(() => useParkingLots());
        
        expect(mockSetLots).toHaveBeenCalledWith(mockLotsData);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('sets error state if fetch fails', () => {
        // Simulate immediate error callback
        parkingService.subscribeToActiveLots.mockImplementation((_, onError) => {
            onError(new Error('Network error'));
            return vi.fn();
        });

        const { result } = renderHook(() => useParkingLots());
        
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Network error');
    });
});
