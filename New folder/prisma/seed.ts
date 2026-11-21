import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ---- Create Admin User ----
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sims.com' },
    update: {},
    create: {
      email: 'admin@sims.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      phone: '+91-9000000001',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // ---- Create Sales Executive ----
  const salesPassword = await bcrypt.hash('Sales@123', 12);
  const sales = await prisma.user.upsert({
    where: { email: 'sales@sims.com' },
    update: {},
    create: {
      email: 'sales@sims.com',
      password: salesPassword,
      firstName: 'Rahul',
      lastName: 'Sharma',
      phone: '+91-9000000002',
      role: UserRole.SALES_EXECUTIVE,
      isActive: true,
    },
  });
  console.log(`✅ Sales executive created: ${sales.email}`);

  // ---- Create Warehouse Manager ----
  const warehousePassword = await bcrypt.hash('Warehouse@123', 12);
  const warehouse = await prisma.user.upsert({
    where: { email: 'warehouse@sims.com' },
    update: {},
    create: {
      email: 'warehouse@sims.com',
      password: warehousePassword,
      firstName: 'Amit',
      lastName: 'Patel',
      phone: '+91-9000000003',
      role: UserRole.WAREHOUSE_MANAGER,
      isActive: true,
    },
  });
  console.log(`✅ Warehouse manager created: ${warehouse.email}`);

  // ---- Create Installation Technician ----
  const techPassword = await bcrypt.hash('Tech@123', 12);
  const technician = await prisma.user.upsert({
    where: { email: 'tech@sims.com' },
    update: {},
    create: {
      email: 'tech@sims.com',
      password: techPassword,
      firstName: 'Vijay',
      lastName: 'Kumar',
      phone: '+91-9000000004',
      role: UserRole.INSTALLATION_TECHNICIAN,
      isActive: true,
    },
  });
  console.log(`✅ Technician created: ${technician.email}`);

  // ---- Create Support Executive ----
  const supportPassword = await bcrypt.hash('Support@123', 12);
  const support = await prisma.user.upsert({
    where: { email: 'support@sims.com' },
    update: {},
    create: {
      email: 'support@sims.com',
      password: supportPassword,
      firstName: 'Priya',
      lastName: 'Gupta',
      phone: '+91-9000000005',
      role: UserRole.SUPPORT_EXECUTIVE,
      isActive: true,
    },
  });
  console.log(`✅ Support executive created: ${support.email}`);

  // ---- Create Customer User + Profile ----
  const customerPassword = await bcrypt.hash('Customer@123', 12);
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@sims.com' },
    update: {},
    create: {
      email: 'customer@sims.com',
      password: customerPassword,
      firstName: 'Suresh',
      lastName: 'Reddy',
      phone: '+91-9000000006',
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  });

  await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      address: '123 MG Road',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      electricityBoard: 'TSSPDCL',
      consumerNumber: 'TS-123456789',
      sanctionedLoad: 5.0,
      monthlyBill: 3500.0,
    },
  });
  console.log(`✅ Customer created: ${customerUser.email}`);

  // ---- Create Sample Products ----
  const products = [
    {
      name: 'Solar Panel 540W Mono PERC',
      description: 'High-efficiency monocrystalline PERC solar panel',
      category: 'SOLAR_PANEL',
      brand: 'Loom Solar',
      model: 'LS-540M',
      unitPrice: 15000.0,
      unit: 'piece',
      hsnCode: '85414011',
      gstRate: 12.0,
      warrantyMonths: 300,
    },
    {
      name: 'On-Grid Inverter 3kW',
      description: '3kW grid-tied string inverter with MPPT',
      category: 'INVERTER',
      brand: 'Growatt',
      model: 'MIN 3000TL-X',
      unitPrice: 25000.0,
      unit: 'piece',
      hsnCode: '85044090',
      gstRate: 12.0,
      warrantyMonths: 120,
    },
    {
      name: 'Off-Grid Inverter 3kW',
      description: '3kW off-grid inverter with charger',
      category: 'INVERTER',
      brand: 'Luminous',
      model: 'NXG Pro 3kVA',
      unitPrice: 35000.0,
      unit: 'piece',
      hsnCode: '85044090',
      gstRate: 12.0,
      warrantyMonths: 60,
    },
    {
      name: 'Lithium Battery 150Ah',
      description: '48V 150Ah Lithium Iron Phosphate battery',
      category: 'BATTERY',
      brand: 'Luminous',
      model: 'LB-48150',
      unitPrice: 85000.0,
      unit: 'piece',
      hsnCode: '85076000',
      gstRate: 18.0,
      warrantyMonths: 60,
    },
    {
      name: 'MPPT Charge Controller 60A',
      description: '60A MPPT solar charge controller',
      category: 'CHARGE_CONTROLLER',
      brand: 'Victron',
      model: 'SmartSolar 150/60',
      unitPrice: 18000.0,
      unit: 'piece',
      hsnCode: '85044090',
      gstRate: 18.0,
      warrantyMonths: 60,
    },
    {
      name: 'DC Cable 4mm² (100m)',
      description: 'Solar DC cable, UV resistant, 100 meter roll',
      category: 'WIRE',
      brand: 'Polycab',
      model: 'Solar DC 4sq',
      unitPrice: 3500.0,
      unit: 'roll',
      hsnCode: '85446090',
      gstRate: 18.0,
      warrantyMonths: 24,
    },
    {
      name: 'MC4 Connector Pair',
      description: 'MC4 solar panel connector male/female pair',
      category: 'CONNECTOR',
      brand: 'Generic',
      model: 'MC4-STD',
      unitPrice: 150.0,
      unit: 'pair',
      hsnCode: '85369090',
      gstRate: 18.0,
      warrantyMonths: 12,
    },
    {
      name: 'Mounting Structure 3kW',
      description: 'Galvanized iron mounting structure for 3kW system',
      category: 'MOUNTING_STRUCTURE',
      brand: 'SolarEdge',
      model: 'MS-3KW-GI',
      unitPrice: 12000.0,
      unit: 'set',
      hsnCode: '73089090',
      gstRate: 18.0,
      warrantyMonths: 120,
    },
    {
      name: 'Lightning Arrester',
      description: 'Solar system lightning arrester',
      category: 'SAFETY_EQUIPMENT',
      brand: 'Generic',
      model: 'LA-1000V',
      unitPrice: 2500.0,
      unit: 'piece',
      hsnCode: '85363000',
      gstRate: 18.0,
      warrantyMonths: 60,
    },
    {
      name: 'Earthing Kit',
      description: 'Complete earthing kit for solar installation',
      category: 'SAFETY_EQUIPMENT',
      brand: 'Generic',
      model: 'EK-STD',
      unitPrice: 3000.0,
      unit: 'kit',
      hsnCode: '85369090',
      gstRate: 18.0,
      warrantyMonths: 60,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.name }, // Will fail, so use create
      update: {},
      create: product,
    });
  }
  // Use createMany with skipDuplicates as a simpler approach
  await prisma.product.createMany({
    data: products,
    skipDuplicates: true,
  });
  console.log(`✅ ${products.length} products seeded`);

  // ---- Create Sample Solar Packages ----
  const allProducts = await prisma.product.findMany();
  const findProduct = (name: string) => allProducts.find((p) => p.name.includes(name));

  const panelProduct = findProduct('Solar Panel');
  const onGridInverter = findProduct('On-Grid Inverter');
  const offGridInverter = findProduct('Off-Grid Inverter');
  const battery = findProduct('Lithium Battery');
  const chargeController = findProduct('MPPT Charge');
  const dcCable = findProduct('DC Cable');
  const mc4 = findProduct('MC4 Connector');
  const mounting = findProduct('Mounting Structure');
  const lightning = findProduct('Lightning Arrester');
  const earthing = findProduct('Earthing Kit');

  if (panelProduct && onGridInverter && dcCable && mc4 && mounting && lightning && earthing) {
    // 3kW On-Grid Package
    const onGrid3kw = await prisma.solarPackage.upsert({
      where: { systemType_capacityKw: { systemType: 'ON_GRID', capacityKw: 3.0 } },
      update: {},
      create: {
        name: '3kW On-Grid Solar System',
        description: 'Complete 3kW grid-tied solar power system',
        systemType: 'ON_GRID',
        capacityKw: 3.0,
        basePrice: 180000.0,
        components: {
          create: [
            { productId: panelProduct.id, quantity: 6 },
            { productId: onGridInverter.id, quantity: 1 },
            { productId: dcCable.id, quantity: 1 },
            { productId: mc4.id, quantity: 12 },
            { productId: mounting.id, quantity: 1 },
            { productId: lightning.id, quantity: 1 },
            { productId: earthing.id, quantity: 1 },
          ],
        },
      },
    });
    console.log(`✅ Package created: ${onGrid3kw.name}`);
  }

  if (panelProduct && offGridInverter && battery && chargeController && dcCable && mc4 && mounting && lightning && earthing) {
    // 3kW Off-Grid Package
    const offGrid3kw = await prisma.solarPackage.upsert({
      where: { systemType_capacityKw: { systemType: 'OFF_GRID', capacityKw: 3.0 } },
      update: {},
      create: {
        name: '3kW Off-Grid Solar System',
        description: 'Complete 3kW off-grid solar power system with battery storage',
        systemType: 'OFF_GRID',
        capacityKw: 3.0,
        basePrice: 350000.0,
        components: {
          create: [
            { productId: panelProduct.id, quantity: 6 },
            { productId: offGridInverter.id, quantity: 1 },
            { productId: battery.id, quantity: 2 },
            { productId: chargeController.id, quantity: 1 },
            { productId: dcCable.id, quantity: 2 },
            { productId: mc4.id, quantity: 12 },
            { productId: mounting.id, quantity: 1 },
            { productId: lightning.id, quantity: 1 },
            { productId: earthing.id, quantity: 1 },
          ],
        },
      },
    });
    console.log(`✅ Package created: ${offGrid3kw.name}`);
  }

  // ---- Create Sample Supplier ----
  await prisma.supplier.upsert({
    where: { id: 'default-supplier' },
    update: {},
    create: {
      name: 'Solar Wholesale India Pvt. Ltd.',
      contactPerson: 'Rajesh Mehta',
      email: 'rajesh@solarwholesale.in',
      phone: '+91-9876543210',
      address: '45 Industrial Area, Phase 2',
      city: 'Delhi',
      state: 'Delhi',
      gstNumber: '07ABCDE1234F1Z5',
    },
  });
  console.log(`✅ Sample supplier created`);

  console.log('\n✅ Database seeding completed successfully!\n');

  console.log('📋 Test Credentials:');
  console.log('─────────────────────────────────────');
  console.log('Admin:       admin@sims.com / Admin@123');
  console.log('Sales:       sales@sims.com / Sales@123');
  console.log('Warehouse:   warehouse@sims.com / Warehouse@123');
  console.log('Technician:  tech@sims.com / Tech@123');
  console.log('Support:     support@sims.com / Support@123');
  console.log('Customer:    customer@sims.com / Customer@123');
  console.log('─────────────────────────────────────\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
