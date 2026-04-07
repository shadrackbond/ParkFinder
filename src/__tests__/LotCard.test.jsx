import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LotCard from '../components/provider/LotCard';

describe('LotCard Component', () => {
    const mockLot = {
        name: 'Central Park Lot',
        address: '123 Main St',
        capacity: 50,
        availableSpots: 20,
        hourlyRate: 150,
        isActive: true,
        imageUrl: 'http://example.com/lot.jpg',
    };

    it('renders the lot name, address, and rate', () => {
        render(<LotCard lot={mockLot} />);
        
        expect(screen.getByText('Central Park Lot')).toBeInTheDocument();
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
        expect(screen.getByText('KSh 150')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument(); // available spots
        expect(screen.getByText('50')).toBeInTheDocument(); // capacity
    });

    it('calls onEdit when Edit Details button is clicked', () => {
        const onEditMock = vi.fn();
        render(<LotCard lot={mockLot} onEdit={onEditMock} />);
        
        const editButton = screen.getByText('Edit Details');
        fireEvent.click(editButton);
        
        expect(onEditMock).toHaveBeenCalledTimes(1);
        expect(onEditMock).toHaveBeenCalledWith(mockLot);
    });

    it('calls onToggle when the toggle button is clicked', () => {
        const onToggleMock = vi.fn();
        render(<LotCard lot={mockLot} onToggle={onToggleMock} />);
        
        // Find the toggle button by its title attribute
        const toggleButton = screen.getByTitle('Deactivate'); // since isActive is true
        fireEvent.click(toggleButton);
        
        expect(onToggleMock).toHaveBeenCalledTimes(1);
        expect(onToggleMock).toHaveBeenCalledWith(mockLot);
    });
});
