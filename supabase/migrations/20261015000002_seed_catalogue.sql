-- Shared catalogue: 10 cities and 27 places (mirrors src/data/mock/seed.ts).
-- Safe to re-run: rows are matched on their fixed ids.

insert into public.cities (id, name, country, country_code, airport_codes, lat, lng, currency_code) values
  ('2509a746-bdb6-529b-a099-bd3cff7aae8f', 'London', 'United Kingdom', 'GB', array['LHR', 'LGW', 'LCY', 'STN'], 51.5074, -0.1278, 'GBP'),
  ('0a8bd6a3-e67a-50ba-a2d2-25452e41ecf3', 'New York', 'United States', 'US', array['JFK', 'LGA', 'EWR'], 40.7128, -74.006, 'USD'),
  ('233b534f-3ce5-5112-a07b-e5ca6dd9250f', 'Tokyo', 'Japan', 'JP', array['HND', 'NRT'], 35.6762, 139.6503, 'JPY'),
  ('befdfe51-5dff-5319-a645-5c863aaf8ec0', 'Dubai', 'United Arab Emirates', 'AE', array['DXB', 'DWC'], 25.2048, 55.2708, 'AED'),
  ('120bdb1b-6a19-5cc9-ae51-80a0fd2e7c39', 'Singapore', 'Singapore', 'SG', array['SIN'], 1.3521, 103.8198, 'SGD'),
  ('a588dacc-ceb1-5195-acdb-d96056dc29f4', 'Paris', 'France', 'FR', array['CDG', 'ORY'], 48.8566, 2.3522, 'EUR'),
  ('ee5d63e0-a944-5ac2-ae6c-78242487cecd', 'Frankfurt', 'Germany', 'DE', array['FRA'], 50.1109, 8.6821, 'EUR'),
  ('69f71924-a1a5-5beb-a10c-7990cbcd10ae', 'Sydney', 'Australia', 'AU', array['SYD'], -33.8688, 151.2093, 'AUD'),
  ('66c90b00-e6e4-541b-a694-7dcd5eb0b02c', 'Lisbon', 'Portugal', 'PT', array['LIS'], 38.7223, -9.1393, 'EUR'),
  ('cbb3a741-b130-5646-a47d-41fe49abe4bd', 'Los Angeles', 'United States', 'US', array['LAX'], 34.0522, -118.2437, 'USD')
on conflict (id) do nothing;

insert into public.places (id, city_id, name, address, lat, lng, cuisine, price_level) values
  ('dcdbd81a-0a78-5263-ab3c-08cc8df1bd96', '2509a746-bdb6-529b-a099-bd3cff7aae8f', 'The Copper Pot', '12 Greek St, Soho', 51.5142, -0.134, 'British', 3),
  ('88af3bef-0da5-5521-ac35-93d01b04e839', '2509a746-bdb6-529b-a099-bd3cff7aae8f', 'Sunrise Café', '3 Berwick St, Soho', 51.5128, -0.1389, 'Café', 1),
  ('9b7d2ba3-919c-5e13-a4a4-b7d1c9829be8', '2509a746-bdb6-529b-a099-bd3cff7aae8f', 'Bao Alley', '8 Lexington St, Soho', 51.5131, -0.1355, 'Taiwanese', 2),
  ('6fb4adbb-e6e7-5048-a239-4add7fb4d918', '2509a746-bdb6-529b-a099-bd3cff7aae8f', 'Tandoor Lane', '41 Charing Cross Rd', 51.516, -0.1301, 'Indian', 2),
  ('1ff3e049-0abc-5106-ad38-d728f790211a', '2509a746-bdb6-529b-a099-bd3cff7aae8f', 'Hangar Bar & Grill', 'Terminal 5 Approach, Heathrow', 51.47, -0.4543, 'Steakhouse', 3),
  ('de95d41e-fb43-5cc7-abfd-0e3dda090469', '0a8bd6a3-e67a-50ba-a2d2-25452e41ecf3', 'Marlowe''s Diner', '220 W 44th St', 40.758, -73.9855, 'American', 1),
  ('ed02a5ef-d2f7-52a7-af67-d8298f0ae05b', '0a8bd6a3-e67a-50ba-a2d2-25452e41ecf3', 'Little Naples Slice', '95 E 10th St', 40.7306, -73.9866, 'Pizza', 1),
  ('b173c913-2245-59c3-a9f8-85fdf431292b', '0a8bd6a3-e67a-50ba-a2d2-25452e41ecf3', 'Hudson Oyster House', '18 Stone St', 40.7061, -74.0087, 'Seafood', 3),
  ('c1f65f5c-f221-596d-ae39-e9d49569448d', '233b534f-3ce5-5112-a07b-e5ca6dd9250f', 'Sushi Daiwa-ya', '5-2 Toyosu, Koto City', 35.6654, 139.7707, 'Sushi', 4),
  ('f2e4a3bc-5a32-5ca4-af61-6c8338e5b012', '233b534f-3ce5-5112-a07b-e5ca6dd9250f', 'Ramen Kazan', '1-14 Nishishinjuku', 35.6938, 139.7034, 'Ramen', 1),
  ('b5439ee1-6e7b-5450-ae34-cf5e995bff9f', '233b534f-3ce5-5112-a07b-e5ca6dd9250f', 'Izakaya Torii', '2-21 Dogenzaka, Shibuya', 35.6595, 139.7005, 'Izakaya', 2),
  ('34d4ceab-8a0e-5548-a9ad-0958b8304f1b', 'befdfe51-5dff-5319-a645-5c863aaf8ec0', 'Al Bahar Grill', 'Creek Road, Deira', 25.2285, 55.2808, 'Middle Eastern', 3),
  ('dd7a6751-fa04-58f6-aa19-773d79df84f7', 'befdfe51-5dff-5319-a645-5c863aaf8ec0', 'Spice Souk Kitchen', 'Al Ras, Deira', 25.2697, 55.2962, 'Indian', 2),
  ('d2733601-9d60-594f-a743-074b2d21a078', '120bdb1b-6a19-5cc9-ae51-80a0fd2e7c39', 'Lau Pa Hawker Stall 14', '18 Raffles Quay', 1.2806, 103.8504, 'Hawker', 1),
  ('3ec24c4a-1eda-5ec9-a280-8655a94f09a1', '120bdb1b-6a19-5cc9-ae51-80a0fd2e7c39', 'Chilli Crab House', '1 Esplanade Dr', 1.2915, 103.859, 'Seafood', 3),
  ('91fb82fb-006b-5430-a9a2-4cfb76519a6c', '120bdb1b-6a19-5cc9-ae51-80a0fd2e7c39', 'Kopi & Kaya', '7 Tanjong Pagar Rd', 1.283, 103.846, 'Café', 1),
  ('44cdcd80-a5bb-58d8-aaaa-3123930d7e74', 'a588dacc-ceb1-5195-acdb-d96056dc29f4', 'Le Petit Comptoir', '14 Rue de Rivoli', 48.8606, 2.3376, 'French', 3),
  ('917b5f3b-b498-51e3-af98-5c5adda881a5', 'a588dacc-ceb1-5195-acdb-d96056dc29f4', 'Boulangerie Margaux', '27 Rue Saint-Jacques', 48.853, 2.3499, 'Bakery', 1),
  ('e17f6dad-a0da-57e1-a3e6-89b4429d3a53', 'a588dacc-ceb1-5195-acdb-d96056dc29f4', 'Chez Amina', '5 Rue Oberkampf', 48.8651, 2.3631, 'Moroccan', 2),
  ('6e8adc59-4119-5a51-a98a-543dc045a212', 'ee5d63e0-a944-5ac2-ae6c-78242487cecd', 'Apfelwein Haus', 'Sachsenhausen, Schweizer Str. 11', 50.1067, 8.6805, 'German', 2),
  ('83de2381-794d-5f8a-a3ec-4ea3b2b9e466', 'ee5d63e0-a944-5ac2-ae6c-78242487cecd', 'Terminal Currywurst', 'Terminal 1, Level 2', 50.0379, 8.5622, 'Street food', 1),
  ('b99f3d06-6dd2-536a-ad02-e3a1b0911a21', '69f71924-a1a5-5beb-a10c-7990cbcd10ae', 'Harbour Fish Shack', '2 Circular Quay W', -33.8587, 151.214, 'Seafood', 2),
  ('d07ac312-10c8-5277-a725-ceee52ace956', '69f71924-a1a5-5beb-a10c-7990cbcd10ae', 'Flat White Society', '44 Crown St, Surry Hills', -33.88, 151.215, 'Café', 1),
  ('a5de8392-5adb-583a-a9aa-bfe957bae1a5', '66c90b00-e6e4-541b-a694-7dcd5eb0b02c', 'Pastéis do Largo', 'Largo do Chiado 8', 38.71, -9.137, 'Bakery', 1),
  ('fb909f9e-03a1-567b-a702-8480cc952ebd', '66c90b00-e6e4-541b-a694-7dcd5eb0b02c', 'Tasca do Marinheiro', 'Rua da Madalena 91', 38.7139, -9.1334, 'Portuguese', 2),
  ('83aba3b4-bc88-52ee-a9c1-929826332f38', 'cbb3a741-b130-5646-a47d-41fe49abe4bd', 'Taqueria El Vuelo', 'Sepulveda Blvd, near LAX', 33.95, -118.39, 'Mexican', 1),
  ('f6225ace-4e9a-5b14-a588-60160e4186e3', 'cbb3a741-b130-5646-a47d-41fe49abe4bd', 'Venice Poke Co.', '1305 Abbot Kinney Blvd', 33.985, -118.4695, 'Hawaiian', 2)
on conflict (id) do nothing;
