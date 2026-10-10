import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Starting BayFlow database seeding...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.callLog.deleteMany();
  await prisma.aIFronDeskTask.deleteMany();
  await prisma.qcIssue.deleteMany();
  await prisma.partAllocation.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.estimateLineItem.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.bookingHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.serviceCatalog.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.shopMember.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  // Owner Fatima Raza
  const fatima = await prisma.user.create({
    data: {
      name: 'Mrs. Fatima Raza',
      email: 'fatima@lahoreauto.pk',
      phone: '+92 300 1112233',
      passwordHash,
      role: 'OWNER',
    },
  });

  // Shop 1 Team: Lahore Auto Care
  const bilal = await prisma.user.create({
    data: {
      name: 'Bilal Khan',
      email: 'bilal@lahoreauto.pk',
      phone: '+92 301 2223344',
      passwordHash,
      role: 'STAFF',
    },
  });

  const imran = await prisma.user.create({
    data: {
      name: 'Imran Malik',
      email: 'imran@lahoreauto.pk',
      phone: '+92 302 3334455',
      passwordHash,
      role: 'STAFF',
    },
  });

  const sara = await prisma.user.create({
    data: {
      name: 'Sara Ahmed',
      email: 'sara@lahoreauto.pk',
      phone: '+92 303 4445566',
      passwordHash,
      role: 'STAFF',
    },
  });

  const usman = await prisma.user.create({
    data: {
      name: 'Usman Tariq',
      email: 'usman@lahoreauto.pk',
      phone: '+92 304 5556677',
      passwordHash,
      role: 'STAFF',
    },
  });

  // Shop 2 Team: Karachi Motor Works
  const tariq = await prisma.user.create({
    data: { name: 'Tariq Mahmood', email: 'tariq@karachimotor.pk', phone: '+92 321 1122334', passwordHash, role: 'STAFF' },
  });
  const zeeshan = await prisma.user.create({
    data: { name: 'Zeeshan Ali', email: 'zeeshan@karachimotor.pk', phone: '+92 322 2233445', passwordHash, role: 'STAFF' },
  });
  const ayesha = await prisma.user.create({
    data: { name: 'Ayesha Noor', email: 'ayesha@karachimotor.pk', phone: '+92 323 3344556', passwordHash, role: 'STAFF' },
  });
  const hamzaS = await prisma.user.create({
    data: { name: 'Hamza Sheikh', email: 'hamza@karachimotor.pk', phone: '+92 324 4455667', passwordHash, role: 'STAFF' },
  });

  // Shop 3 Team: Islamabad Precision Auto
  const omer = await prisma.user.create({
    data: { name: 'Omer Farooq', email: 'omer@isbauto.pk', phone: '+92 331 1122334', passwordHash, role: 'STAFF' },
  });
  const babar = await prisma.user.create({
    data: { name: 'Babar Azam', email: 'babar@isbauto.pk', phone: '+92 332 2233445', passwordHash, role: 'STAFF' },
  });
  const nida = await prisma.user.create({
    data: { name: 'Nida Dar', email: 'nida@isbauto.pk', phone: '+92 333 3344556', passwordHash, role: 'STAFF' },
  });
  const salman = await prisma.user.create({
    data: { name: 'Salman Butt', email: 'salman@isbauto.pk', phone: '+92 334 4455667', passwordHash, role: 'STAFF' },
  });

  // Customers
  const ahmed = await prisma.user.create({
    data: {
      name: 'Ahmed Khan',
      email: 'ahmed@mail.com',
      phone: '+92 300 9876543',
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  const zainab = await prisma.user.create({
    data: {
      name: 'Zainab Bibi',
      email: 'zainab@mail.com',
      phone: '+92 321 8765432',
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  // 2. Create Shops
  const shopLahore = await prisma.shop.create({
    data: {
      name: 'Lahore Auto Care',
      address: 'Plot 42-B, Main Boulevard, Gulberg III',
      city: 'Lahore',
      phone: '+92 42 35789000',
      workingHours: '09:00 AM - 06:00 PM',
      slotDuration: 60,
      slotCapacity: 3,
      rating: 4.9,
      ownerId: fatima.id,
    },
  });

  const shopKarachi = await prisma.shop.create({
    data: {
      name: 'Karachi Motor Works',
      address: 'Suite 14, Khayaban-e-Shahbaz, DHA Phase 6',
      city: 'Karachi',
      phone: '+92 21 35340000',
      workingHours: '09:00 AM - 07:00 PM',
      slotDuration: 60,
      slotCapacity: 4,
      rating: 4.8,
      ownerId: fatima.id,
    },
  });

  const shopIslamabad = await prisma.shop.create({
    data: {
      name: 'Islamabad Precision Auto',
      address: 'Sector I-9/3, Industrial Area',
      city: 'Islamabad',
      phone: '+92 51 4443322',
      workingHours: '08:30 AM - 05:30 PM',
      slotDuration: 60,
      slotCapacity: 2,
      rating: 4.95,
      ownerId: fatima.id,
    },
  });

  // 3. Assign Shop Memberships
  // Lahore Auto Care
  await prisma.shopMember.createMany({
    data: [
      { shopId: shopLahore.id, userId: fatima.id, role: 'OWNER' },
      { shopId: shopLahore.id, userId: bilal.id, role: 'SERVICE_ADVISOR' },
      { shopId: shopLahore.id, userId: imran.id, role: 'TECHNICIAN' },
      { shopId: shopLahore.id, userId: sara.id, role: 'QC_INSPECTOR' },
      { shopId: shopLahore.id, userId: usman.id, role: 'PARTS_PERSON' },
    ],
  });

  // Karachi Motor Works
  await prisma.shopMember.createMany({
    data: [
      { shopId: shopKarachi.id, userId: fatima.id, role: 'OWNER' },
      { shopId: shopKarachi.id, userId: tariq.id, role: 'SERVICE_ADVISOR' },
      { shopId: shopKarachi.id, userId: zeeshan.id, role: 'TECHNICIAN' },
      { shopId: shopKarachi.id, userId: ayesha.id, role: 'QC_INSPECTOR' },
      { shopId: shopKarachi.id, userId: hamzaS.id, role: 'PARTS_PERSON' },
    ],
  });

  // Islamabad Precision Auto
  await prisma.shopMember.createMany({
    data: [
      { shopId: shopIslamabad.id, userId: fatima.id, role: 'OWNER' },
      { shopId: shopIslamabad.id, userId: omer.id, role: 'SERVICE_ADVISOR' },
      { shopId: shopIslamabad.id, userId: babar.id, role: 'TECHNICIAN' },
      { shopId: shopIslamabad.id, userId: nida.id, role: 'QC_INSPECTOR' },
      { shopId: shopIslamabad.id, userId: salman.id, role: 'PARTS_PERSON' },
    ],
  });

  // 4. Seed Service Catalogs
  const standardServices = [
    { name: 'Oil & Filter Change', description: 'Complete engine oil replacement with high quality OEM oil filter and fluid level check', estimatedDuration: 45, basePrice: 5200 },
    { name: 'Check Engine Diagnostics', description: 'Comprehensive OBD-2 computerized system scan, error code lookup & electrical tests', estimatedDuration: 45, basePrice: 3500 },
    { name: 'Brake Inspection & Pad Service', description: 'Inspection of pads, discs, rotors, lines and hydraulic fluid flushing', estimatedDuration: 60, basePrice: 4200 },
    { name: 'Tire Rotation & Wheel Balancing', description: 'Precision balancing on high-speed computer balancer and cross rotation', estimatedDuration: 45, basePrice: 2800 },
    { name: 'Ignition & Fuel System Tune-up', description: 'Spark plug replacement, coil test, throttle body cleaning & injector cleaner', estimatedDuration: 60, basePrice: 6500 },
    { name: 'AC Performance & Gas Recharge', description: 'Refrigerant vacuum test, oil injection, and 134a cooling gas recharge', estimatedDuration: 60, basePrice: 4500 },
  ];

  for (const shop of [shopLahore, shopKarachi, shopIslamabad]) {
    for (const s of standardServices) {
      await prisma.serviceCatalog.create({
        data: {
          shopId: shop.id,
          name: s.name,
          description: s.description,
          estimatedDuration: s.estimatedDuration,
          basePrice: s.basePrice,
        },
      });
    }
  }

  // 5. Seed Inventory Items for Lahore Auto Care
  const lahoreInventory = [
    { sku: 'IGN-COIL-01', name: 'Ignition Coil (Civic/Corolla)', quantityOnHand: 0, reorderLevel: 2, costPrice: 4800, sellPrice: 6500, category: 'Ignition' }, // Shortage for worked example!
    { sku: 'FLT-OIL-900', name: 'OEM Oil Filter (Honda)', quantityOnHand: 12, reorderLevel: 5, costPrice: 600, sellPrice: 900, category: 'Filters' },
    { sku: 'OIL-SYN-4L', name: 'Engine Oil 5W-30 Synthetic 4L', quantityOnHand: 8, reorderLevel: 4, costPrice: 3800, sellPrice: 5200, category: 'Fluids' },
    { sku: 'BRK-PAD-01', name: 'Ceramic Brake Pads (Front Set)', quantityOnHand: 6, reorderLevel: 3, costPrice: 2800, sellPrice: 4200, category: 'Brakes' },
    { sku: 'SPK-PLG-04', name: 'Iridium Spark Plugs Set of 4', quantityOnHand: 10, reorderLevel: 4, costPrice: 2500, sellPrice: 3600, category: 'Ignition' },
    { sku: 'FLT-AIR-101', name: 'High Efficiency Air Filter', quantityOnHand: 15, reorderLevel: 5, costPrice: 1200, sellPrice: 1800, category: 'Filters' },
  ];

  for (const item of lahoreInventory) {
    await prisma.inventoryItem.create({
      data: {
        shopId: shopLahore.id,
        ...item,
      },
    });
  }

  // Seed inventory for Karachi and Islamabad
  for (const shop of [shopKarachi, shopIslamabad]) {
    for (const item of lahoreInventory) {
      await prisma.inventoryItem.create({
        data: {
          shopId: shop.id,
          ...item,
          quantityOnHand: 10, // already in stock in other shops
        },
      });
    }
  }

  // 6. Seed Vehicles
  const ahmedVehicle = await prisma.vehicle.create({
    data: {
      customerId: ahmed.id,
      registrationPlate: 'LEA-1234',
      make: 'Honda',
      model: 'Civic',
      year: 2016,
      color: 'Taffeta White',
      mileage: 82500,
    },
  });

  const zainabVehicle = await prisma.vehicle.create({
    data: {
      customerId: zainab.id,
      registrationPlate: 'KHI-7890',
      make: 'Toyota',
      model: 'Corolla',
      year: 2019,
      color: 'Super White',
      mileage: 54000,
    },
  });

  // 7. Seed Worked Example Booking (Ahmed's Booking at Lahore Auto Care)
  const todayStr = new Date().toISOString().split('T')[0];

  const ahmedBooking = await prisma.booking.create({
    data: {
      reference: 'BF-2026-1001',
      shopId: shopLahore.id,
      customerId: ahmed.id,
      vehicleId: ahmedVehicle.id,
      bookingDate: todayStr,
      bookingTime: '10:00 AM',
      selectedServices: JSON.stringify(['Check engine light', 'Oil change']),
      reportedProblem: 'Light came on yesterday, car vibrates at idle.',
      status: 'PENDING',
    },
  });

  await prisma.bookingHistory.create({
    data: {
      bookingId: ahmedBooking.id,
      userId: ahmed.id,
      userName: ahmed.name,
      userRole: 'CUSTOMER',
      fromStatus: 'NONE',
      toStatus: 'PENDING',
      note: 'Online booking created by Ahmed for Friday 10:00 AM',
    },
  });

  // Seed a second booking in QC queue so QC inspector can test right away
  const qcTestBooking = await prisma.booking.create({
    data: {
      reference: 'BF-2026-1002',
      shopId: shopLahore.id,
      customerId: ahmed.id,
      vehicleId: ahmedVehicle.id,
      bookingDate: todayStr,
      bookingTime: '11:00 AM',
      selectedServices: JSON.stringify(['Brake Inspection & Pad Service']),
      reportedProblem: 'Squeaking sound when braking at high speed.',
      status: 'QC_PENDING',
      technicianId: imran.id,
      partsPersonId: usman.id,
    },
  });

  await prisma.bookingHistory.create({
    data: {
      bookingId: qcTestBooking.id,
      userId: imran.id,
      userName: imran.name,
      userRole: 'TECHNICIAN',
      fromStatus: 'IN_REPAIR',
      toStatus: 'QC_PENDING',
      note: 'Replaced ceramic brake pads and tested calipers. Ready for road test inspection.',
    },
  });

  // Seed initial notification
  await prisma.notification.create({
    data: {
      userId: bilal.id,
      shopId: shopLahore.id,
      bookingId: ahmedBooking.id,
      title: 'New Booking Received',
      message: 'New booking #BF-2026-1001 from Ahmed Khan for Honda Civic (LEA-1234).',
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('====================================================');
  console.log('DEMO ACCOUNTS READY:');
  console.log('Fatima (Owner):      fatima@lahoreauto.pk  / password123');
  console.log('Bilal (SA):          bilal@lahoreauto.pk   / password123');
  console.log('Imran (Technician):  imran@lahoreauto.pk   / password123');
  console.log('Sara (QC Inspector): sara@lahoreauto.pk    / password123');
  console.log('Usman (Parts):       usman@lahoreauto.pk   / password123');
  console.log('Ahmed (Customer):    ahmed@mail.com        / password123');
  console.log('====================================================');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error('Seeding error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
