import React from "react";

import { slugify } from "../utils/string";

type Props = {
  cities: string[]; // display names
  selected: string[]; // slugs
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export default function CitySelector({ cities, selected, onChange, placeholder }: Props) {
  const toggle = (citySlug: string) => {
    if (selected.includes(citySlug)) onChange(selected.filter((c) => c !== citySlug));
    else onChange([...selected, citySlug]);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Cities</label>
      <div className="flex flex-wrap gap-2">
        {cities.map((city) => {
          const slug = slugify(city);
          const active = selected.includes(slug);
          return (
            <button
              key={slug}
              onClick={() => toggle(slug)}
              aria-pressed={active}
              className={`px-3 py-1 rounded-full border transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300 ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <span className="inline-flex items-center gap-2">
                {active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span>{city}</span>
              </span>
            </button>
          );
        })}
      </div>
      {placeholder && <p className="text-xs text-gray-500 mt-1">{placeholder}</p>}
    </div>
  );
}
