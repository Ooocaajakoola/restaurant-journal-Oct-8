import { render, screen } from '@testing-library/react';
import { buildPins } from '../../lib/mapPins';
import { createTestRepositories } from '../../test/mockRepos';
import { EntryMap } from './EntryMap';

describe('EntryMap', () => {
  it('renders a labelled map region with one marker per place, titled with name and rating', async () => {
    const entries = await createTestRepositories().entries.list({ cityId: 'city-london' });
    render(<EntryMap entries={entries} label="London map" />);
    expect(screen.getByRole('region', { name: 'London map' })).toBeInTheDocument();
    const pins = buildPins(entries);
    const markers = document.querySelectorAll('.leaflet-marker-icon');
    expect(markers.length).toBe(pins.length);
    expect(markers[0]).toHaveAttribute('title', expect.stringMatching(/rated [1-5] out of 5/));
    expect(markers[0]!.textContent).toMatch(/^[1-5]$/);
  });

  it('shows OpenStreetMap attribution', async () => {
    render(<EntryMap entries={[]} />);
    expect(document.querySelector('.leaflet-control-attribution')?.textContent).toMatch(/OpenStreetMap/);
  });
});
