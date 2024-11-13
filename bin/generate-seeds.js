import { write, writeFile, writeFileSync } from 'fs';
import { faker } from '@faker-js/faker';

const NUMBER_TO_GENERATE = 500;

const generateConstituent = () => {
  const date = faker.date.between({
    from: '2020-01-01T00:00:00.000Z',
    to: '2024-11-12T00:00:00.000Z'
  });
  return {
    id: faker.string.ulid(),
    email: faker.internet.email().toLowerCase(),
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    address: faker.location.streetAddress(),
    created_at: date.toISOString(),
    updated_at: date.toISOString(),
  };
};

const formatAsSQL = (constituent) => {
  return `("${constituent.id}", "${constituent.email}", "${constituent.name}", "${constituent.phone}", "${constituent.address}", "${constituent.created_at}", "${constituent.updated_at}", NULL)`;
}

const generateConstituents = () => {
  return Array.from({ length: NUMBER_TO_GENERATE }, () => generateConstituent());
}

const constituentList = generateConstituents().map(formatAsSQL).join(',\n');

// write file header
const header = `
-- Migration number: 0001

INSERT INTO constituents (id, email, name, phone, address, created_at, updated_at, unsubscribed_at) VALUES
`
writeFileSync('migrations/0001_seed_constituents.sql', header);
writeFileSync('migrations/0001_seed_constituents.sql', constituentList, { flag: 'a' });
writeFileSync('migrations/0001_seed_constituents.sql', ';', { flag: 'a' });
