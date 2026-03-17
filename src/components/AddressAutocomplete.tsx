'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AddressResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onCoordsChange?: (coords: [number, number] | null) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onCoordsChange,
  placeholder = 'Digite o endereço...',
  className = '',
  inputClassName = '',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update query when value prop changes from outside
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search addresses with debounce
  const searchAddresses = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Use OpenStreetMap Nominatim API (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&addressdetails=1&limit=5&countrycodes=br`,
        {
          headers: {
            'User-Agent': 'IncidentManagementSystem/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const data: AddressResult[] = await response.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch (error) {
      console.error('Address search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  // Handle selecting an address
  const handleSelect = (result: AddressResult) => {
    setQuery(result.display_name);
    onChange(result.display_name);
    
    // Enviar coordenadas para o componente pai
    if (onCoordsChange) {
      const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
      onCoordsChange(coords);
    }
    
    setIsOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (results.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className={inputClassName || "w-full bg-slate-900 text-white border border-slate-700 rounded px-3 py-2"}
        autoComplete="off"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <li
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className="px-3 py-2 text-sm text-white hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0"
            >
              <div className="truncate">{result.display_name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

