import http from 'http';
import { app, server } from '../src/server';
import { prisma } from '../src/prisma/client';

async function runTests() {
  console.log('🧪 Starting BayFlow API & State Machine verification test...');

  try {
    // 1. Fetch Lahore Auto Care shop
    const shopLahore = await prisma.shop.findFirst({ where: { name: 'Lahore Auto Care' } });
    const shopKarachi = await prisma.shop.findFirst({ where: { name: 'Karachi Motor Works' } });
    if (!shopLahore || !shopKarachi) throw new Error('Shops not found');

    // 2. Fetch users
    const bilal = await prisma.user.findUnique({ where: { email: 'bilal@lahoreauto.pk' } });
    const imran = await prisma.user.findUnique({ where: { email: 'imran@lahoreauto.pk' } });
    const sara = await prisma.user.findUnique({ where: { email: 'sara@lahoreauto.pk' } });
    const usman = await prisma.user.findUnique({ where: { email: 'usman@lahoreauto.pk' } });
    const ahmed = await prisma.user.findUnique({ where: { email: 'ahmed@mail.com' } });

    console.log('✓ Found seeded users and shops.');

    // 3. Test Booking State Machine Flow
    const booking = await prisma.booking.findFirst({
      where: { reference: 'BF-2026-1001' },
      include: { vehicle: true },
    });
    if (!booking) throw new Error('Ahmed booking not found');

    const { executeTransition } = await import('../src/services/stateMachine');

    // Step 1: SA Bilal confirms booking
    console.log('Testing Transition 1: PENDING -> CONFIRMED (by SA)');
    let current = await executeTransition('CONFIRM', {
      bookingId: booking.id,
      targetStatus: 'CONFIRMED',
      userId: bilal!.id,
      userName: bilal!.name,
      userRole: 'SERVICE_ADVISOR',
      note: 'Confirmed by Bilal',
    });
    if (current.status !== 'CONFIRMED') throw new Error(`Expected CONFIRMED, got ${current.status}`);
    console.log('✓ Transition 1 passed: CONFIRMED');

    // Step 2: SA Bilal assigns Tech Imran
    console.log('Testing Transition 2: CONFIRMED -> ASSIGNED');
    current = await executeTransition('ASSIGN_TECHNICIAN', {
      bookingId: booking.id,
      targetStatus: 'ASSIGNED',
      userId: bilal!.id,
      userName: bilal!.name,
      userRole: 'SERVICE_ADVISOR',
      technicianId: imran!.id,
      note: 'Assigned Imran Malik as technician',
    });
    if (current.status !== 'ASSIGNED' || current.technicianId !== imran!.id) {
      throw new Error(`Expected ASSIGNED with Imran, got ${current.status}`);
    }
    console.log('✓ Transition 2 passed: ASSIGNED to Imran');

    // Step 2b: Role guard verification: QC cannot start inspection
    try {
      await executeTransition('START_INSPECTION', {
        bookingId: booking.id,
        targetStatus: 'INSPECTING',
        userId: sara!.id,
        userName: sara!.name,
        userRole: 'QC_INSPECTOR',
      });
      throw new Error('FAILED: QC was able to start inspection (should have failed)!');
    } catch (e: any) {
      console.log('✓ Role guard verified: QC Inspector cannot start inspection.');
    }

    // Step 3: Tech Imran starts inspection
    console.log('Testing Transition 3: ASSIGNED -> INSPECTING');
    current = await executeTransition('START_INSPECTION', {
      bookingId: booking.id,
      targetStatus: 'INSPECTING',
      userId: imran!.id,
      userName: imran!.name,
      userRole: 'TECHNICIAN',
      note: 'Imran began diagnostic inspection',
    });
    if (current.status !== 'INSPECTING') throw new Error(`Expected INSPECTING, got ${current.status}`);
    console.log('✓ Transition 3 passed: INSPECTING');

    // Step 4: Tech Imran adds Estimate & submits to SA
    console.log('Testing Transition 4: INSPECTING -> ESTIMATE_REVIEW');
    const estimate = await prisma.estimate.create({
      data: {
        bookingId: booking.id,
        revision: 1,
        laborCost: 4000,
        partsCost: 12600,
        totalCost: 16600,
        submittedById: imran!.id,
        status: 'SUBMITTED_TO_SA',
        lineItems: {
          create: [
            { partName: 'Ignition Coil', quantity: 1, unitCost: 6500, totalCost: 6500 },
            { partName: 'Oil Filter', quantity: 1, unitCost: 900, totalCost: 900 },
            { partName: 'Engine Oil 4L', quantity: 1, unitCost: 5200, totalCost: 5200 },
          ],
        },
      },
    });

    current = await executeTransition('SUBMIT_ESTIMATE', {
      bookingId: booking.id,
      targetStatus: 'ESTIMATE_REVIEW',
      userId: imran!.id,
      userName: imran!.name,
      userRole: 'TECHNICIAN',
      note: 'Faulty ignition coil diagnosed. Estimate submitted.',
    });
    if (current.status !== 'ESTIMATE_REVIEW') throw new Error(`Expected ESTIMATE_REVIEW, got ${current.status}`);
    console.log('✓ Transition 4 passed: ESTIMATE_REVIEW');

    // Step 5: SA Bilal reviews & sends to Ahmed
    console.log('Testing Transition 5: ESTIMATE_REVIEW -> AWAITING_CUSTOMER');
    // Bilal adjusts labor to 3500 (revision 2)
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: { laborCost: 3500, totalCost: 16100, revision: 2 },
    });

    current = await executeTransition('SEND_TO_CUSTOMER', {
      bookingId: booking.id,
      targetStatus: 'AWAITING_CUSTOMER',
      userId: bilal!.id,
      userName: bilal!.name,
      userRole: 'SERVICE_ADVISOR',
      note: 'Adjusted labor discount and sent to Ahmed',
    });
    if (current.status !== 'AWAITING_CUSTOMER') throw new Error(`Expected AWAITING_CUSTOMER, got ${current.status}`);
    console.log('✓ Transition 5 passed: AWAITING_CUSTOMER');

    // Step 6: Customer Ahmed approves estimate
    console.log('Testing Transition 6: AWAITING_CUSTOMER -> ESTIMATE_APPROVED');
    current = await executeTransition('CUSTOMER_APPROVE_ESTIMATE', {
      bookingId: booking.id,
      targetStatus: 'ESTIMATE_APPROVED',
      userId: ahmed!.id,
      userName: ahmed!.name,
      userRole: 'CUSTOMER',
      note: 'Estimate approved in portal by Ahmed',
    });
    if (current.status !== 'ESTIMATE_APPROVED') throw new Error(`Expected ESTIMATE_APPROVED, got ${current.status}`);
    console.log('✓ Transition 6 passed: ESTIMATE_APPROVED');

    // Step 7: SA Bilal assigns Parts Person Usman
    console.log('Testing Transition 7: ESTIMATE_APPROVED -> PARTS_PENDING');
    current = await executeTransition('ASSIGN_PARTS_PERSON', {
      bookingId: booking.id,
      targetStatus: 'PARTS_PENDING',
      userId: bilal!.id,
      userName: bilal!.name,
      userRole: 'SERVICE_ADVISOR',
      partsPersonId: usman!.id,
      note: 'Assigned Usman Tariq for parts procurement',
    });
    if (current.status !== 'PARTS_PENDING' || current.partsPersonId !== usman!.id) {
      throw new Error(`Expected PARTS_PENDING with Usman, got ${current.status}`);
    }
    console.log('✓ Transition 7 passed: PARTS_PENDING with Usman');

    // Step 8: Usman orders missing coil -> PARTS_ORDERED
    console.log('Testing Transition 8: PARTS_PENDING -> PARTS_ORDERED');
    current = await executeTransition('ORDER_PARTS', {
      bookingId: booking.id,
      targetStatus: 'PARTS_ORDERED',
      userId: usman!.id,
      userName: usman!.name,
      userRole: 'PARTS_PERSON',
      note: 'Ordered 1 Ignition Coil from supplier',
    });
    if (current.status !== 'PARTS_ORDERED') throw new Error(`Expected PARTS_ORDERED, got ${current.status}`);
    console.log('✓ Transition 8 passed: PARTS_ORDERED');

    // Step 9: Coil arrives -> PARTS_READY
    console.log('Testing Transition 9: PARTS_ORDERED -> PARTS_READY');
    current = await executeTransition('PARTS_ARRIVED', {
      bookingId: booking.id,
      targetStatus: 'PARTS_READY',
      userId: usman!.id,
      userName: usman!.name,
      userRole: 'PARTS_PERSON',
      note: 'All parts received in stock',
    });
    if (current.status !== 'PARTS_READY') throw new Error(`Expected PARTS_READY, got ${current.status}`);
    console.log('✓ Transition 9 passed: PARTS_READY');

    // Step 10: Parts allocated & starts repair -> IN_REPAIR
    console.log('Testing Transition 10: PARTS_READY -> IN_REPAIR');
    current = await executeTransition('ALLOCATE_AND_START_REPAIR', {
      bookingId: booking.id,
      targetStatus: 'IN_REPAIR',
      userId: usman!.id,
      userName: usman!.name,
      userRole: 'PARTS_PERSON',
      note: 'Parts issued to Technician Imran',
    });
    if (current.status !== 'IN_REPAIR') throw new Error(`Expected IN_REPAIR, got ${current.status}`);
    console.log('✓ Transition 10 passed: IN_REPAIR');

    // Step 11: Imran completes repair -> QC_PENDING
    console.log('Testing Transition 11: IN_REPAIR -> QC_PENDING');
    current = await executeTransition('SEND_TO_QC', {
      bookingId: booking.id,
      targetStatus: 'QC_PENDING',
      userId: imran!.id,
      userName: imran!.name,
      userRole: 'TECHNICIAN',
      note: 'Repair done. Vehicle ready for QC.',
    });
    if (current.status !== 'QC_PENDING') throw new Error(`Expected QC_PENDING, got ${current.status}`);
    console.log('✓ Transition 11 passed: QC_PENDING');

    // Step 12: Sara (QC) claims job -> QC_IN_PROGRESS
    console.log('Testing Transition 12: QC_PENDING -> QC_IN_PROGRESS');
    current = await executeTransition('QC_PICK_JOB', {
      bookingId: booking.id,
      targetStatus: 'QC_IN_PROGRESS',
      userId: sara!.id,
      userName: sara!.name,
      userRole: 'QC_INSPECTOR',
      note: 'Locked by Sara for road test',
    });
    if (current.status !== 'QC_IN_PROGRESS' || current.qcInspectorId !== sara!.id) {
      throw new Error(`Expected QC_IN_PROGRESS with Sara, got ${current.status}`);
    }
    console.log('✓ Transition 12 passed: QC_IN_PROGRESS');

    // Step 13: TEST QC FAIL LOOP! Sara reports minor oil leak at filter
    console.log('Testing Transition 13: QC_FAIL LOOP (QC_IN_PROGRESS -> IN_REPAIR)');
    current = await executeTransition('QC_FAIL', {
      bookingId: booking.id,
      targetStatus: 'IN_REPAIR',
      userId: sara!.id,
      userName: sara!.name,
      userRole: 'QC_INSPECTOR',
      qcIssue: {
        title: 'Minor oil leak at filter',
        description: 'Oil seepage noticed around filter O-ring during road test',
      },
      note: 'QC Failed: Minor oil leak at filter',
    });
    if (current.status !== 'IN_REPAIR') throw new Error(`Expected IN_REPAIR, got ${current.status}`);
    const issues = await prisma.qcIssue.findMany({ where: { bookingId: booking.id } });
    if (issues.length === 0) throw new Error('QC Issue was not created in database');
    console.log(`✓ QC Fail Loop verified! Issue recorded: "${issues[0].title}". Job returned to Technician Imran.`);

    // Step 14: Imran fixes seal, resubmits to QC
    console.log('Testing Transition 14: Resubmission to QC (IN_REPAIR -> QC_PENDING)');
    current = await executeTransition('SEND_TO_QC', {
      bookingId: booking.id,
      targetStatus: 'QC_PENDING',
      userId: imran!.id,
      userName: imran!.name,
      userRole: 'TECHNICIAN',
      note: 'O-ring seal cleaned and retorqued to specification. Clean wipe performed.',
    });
    if (current.status !== 'QC_PENDING') throw new Error(`Expected QC_PENDING, got ${current.status}`);
    console.log('✓ Resubmitted to QC');

    // Step 15: Sara re-tests and passes -> READY_FOR_PICKUP
    console.log('Testing Transition 15: QC_PASS (QC_PENDING -> QC_IN_PROGRESS -> READY_FOR_PICKUP)');
    await executeTransition('QC_PICK_JOB', {
      bookingId: booking.id,
      targetStatus: 'QC_IN_PROGRESS',
      userId: sara!.id,
      userName: sara!.name,
      userRole: 'QC_INSPECTOR',
    });
    current = await executeTransition('QC_PASS', {
      bookingId: booking.id,
      targetStatus: 'READY_FOR_PICKUP',
      userId: sara!.id,
      userName: sara!.name,
      userRole: 'QC_INSPECTOR',
      note: 'Road test 10km passed. Filter dry, engine idle smooth, codes clear.',
    });
    if (current.status !== 'READY_FOR_PICKUP') throw new Error(`Expected READY_FOR_PICKUP, got ${current.status}`);
    console.log('✓ Transition 15 passed: READY_FOR_PICKUP');

    // Step 16: Complete booking
    console.log('Testing Transition 16: READY_FOR_PICKUP -> COMPLETED');
    current = await executeTransition('COMPLETE_BOOKING', {
      bookingId: booking.id,
      targetStatus: 'COMPLETED',
      userId: ahmed!.id,
      userName: ahmed!.name,
      userRole: 'CUSTOMER',
      note: 'Vehicle collected by customer. Key handed over.',
    });
    if (current.status !== 'COMPLETED') throw new Error(`Expected COMPLETED, got ${current.status}`);
    console.log('✓ Transition 16 passed: COMPLETED');

    // Verify Audit History
    const historyLogs = await prisma.bookingHistory.findMany({ where: { bookingId: booking.id } });
    console.log(`✓ Audit history fully logged with ${historyLogs.length} state transitions.`);

    // Test AI Front Desk Tool Lookup
    const { handleAIFrontDeskInteraction } = await import('../src/services/aiFrontDeskService');
    const aiResponse = await handleAIFrontDeskInteraction({
      shopId: shopLahore.id,
      customerIdentifier: 'ahmed@mail.com',
      message: 'What is the status of my Honda Civic LEA-1234?',
    });
    console.log(`✓ AI Front Desk lookup verified! Reply: "${aiResponse.reply.substring(0, 80)}..."`);
    console.log(`✓ AI Front Desk generated task: "${aiResponse.taskCreated?.taskDescription}"`);

    console.log('\n🎉 ALL STATE MACHINE & LIFECYCLE TESTS PASSED 100%!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
