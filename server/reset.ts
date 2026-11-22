import { resetDb } from './db';

const db = resetDb();
console.log(
  `Seeded ${db.products.length} products, ${db.enquiries.length} enquiries, ${db.orders.length} orders, ${db.tickets.length} tickets, ${db.serials.length} serials.`,
);
console.log('Database written to data/db.json');
