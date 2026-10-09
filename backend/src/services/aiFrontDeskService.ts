import { prisma } from '../prisma/client';
import { notifyShopStaffByRole } from './notificationService';

export interface AIConversationTurn {
  role: 'assistant' | 'user';
  text: string;
}

export interface AIProcessResult {
  reply: string;
  identifiedBooking?: any;
  taskCreated?: any;
  summary?: string;
}

export async function lookupCustomerBookings(query: string) {
  const clean = query.trim().toLowerCase();
  
  // Try finding by reference
  let booking = await prisma.booking.findFirst({
    where: {
      OR: [
        { reference: { equals: query.trim() } },
        { id: { equals: query.trim() } },
      ],
    },
    include: {
      vehicle: true,
      shop: true,
      customer: true,
      estimates: { orderBy: { revision: 'desc' }, include: { lineItems: true } },
    },
  });

  if (booking) return [booking];

  // Try finding by customer phone, email, or name
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: clean } },
        { phone: { contains: clean } },
        { name: { contains: clean } },
      ],
    },
    select: { id: true },
  });

  const userIds = users.map((u) => u.id);

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { customerId: { in: userIds } },
        { vehicle: { registrationPlate: { contains: clean } } },
      ],
    },
    include: {
      vehicle: true,
      shop: true,
      customer: true,
      estimates: { orderBy: { revision: 'desc' }, include: { lineItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bookings;
}

/**
 * Process a message or call from customer to the AI Front Desk
 */
export async function handleAIFrontDeskInteraction({
  shopId,
  customerIdentifier,
  message,
  history = [],
}: {
  shopId: string;
  customerIdentifier?: string;
  message: string;
  history?: AIConversationTurn[];
}): Promise<AIProcessResult> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error('Shop not found');

  // Search bookings for this customer
  const bookings = customerIdentifier
    ? await lookupCustomerBookings(customerIdentifier)
    : await lookupCustomerBookings(message);

  const booking = bookings.length > 0 ? bookings[0] : null;

  const lowerMsg = message.toLowerCase();
  let reply = '';
  let intent = 'General Inquiry';
  let sentiment = 'NEUTRAL';
  let taskNeeded = false;
  let taskDesc = '';

  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    if (booking) {
      reply = `Hello ${booking.customer.name}! Thank you for calling ${shop.name}. I see your booking #${booking.reference} for the ${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}. How can I assist you today?`;
    } else {
      reply = `Hello! Thank you for calling ${shop.name}. I am the AI Front Desk assistant. Could you please provide your name, phone number, vehicle plate, or booking reference so I can look up your file?`;
    }
  } else if (lowerMsg.includes('status') || lowerMsg.includes('how is my car') || lowerMsg.includes('ready') || lowerMsg.includes('update')) {
    intent = 'Status Check';
    if (!booking) {
      reply = `I would be glad to check your vehicle's status! Could you please share your booking reference or vehicle registration plate?`;
    } else {
      const status = booking.status;
      if (status === 'READY_FOR_PICKUP') {
        reply = `Great news, ${booking.customer.name}! Your ${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.registrationPlate}) is completely ready for pick-up! Our shop is open ${shop.workingHours}.`;
      } else if (status === 'AWAITING_CUSTOMER') {
        const est = booking.estimates[0];
        reply = `Your vehicle inspection is finished! An estimate of PKR ${est?.totalCost.toLocaleString() || '0'} has been prepared by our Service Advisor and is waiting for your review and approval in your BayFlow customer portal.`;
        taskNeeded = true;
        taskDesc = `Customer ${booking.customer.name} inquired about status; reminded to approve estimate on portal.`;
      } else if (status === 'IN_REPAIR') {
        reply = `Your vehicle is currently in the workshop undergoing repairs by our technician. All required parts have been allocated and we will notify you as soon as quality testing is complete!`;
      } else if (status === 'QC_PENDING' || status === 'QC_IN_PROGRESS') {
        reply = `The repairs are completed and your vehicle is currently with our Quality Control Inspector for road testing and safety checks.`;
      } else if (status === 'PARTS_ORDERED' || status === 'PARTS_PENDING') {
        reply = `Our parts department has ordered the required components for your vehicle. We expect them shortly to proceed with the repair.`;
      } else {
        reply = `Your booking #${booking.reference} is currently at stage: ${booking.status.replace(/_/g, ' ')}. Our Service Advisor is managing your vehicle's progress.`;
      }
    }
  } else if (lowerMsg.includes('estimate') || lowerMsg.includes('cost') || lowerMsg.includes('price') || lowerMsg.includes('how much')) {
    intent = 'Estimate Inquiry';
    if (!booking) {
      reply = `I can look up your repair estimate right away! Please share your booking number or plate number.`;
    } else {
      const est = booking.estimates[0];
      if (est) {
        reply = `The latest estimate for your ${booking.vehicle.make} ${booking.vehicle.model} is PKR ${est.totalCost.toLocaleString()} (Labor: PKR ${est.laborCost.toLocaleString()}, Parts: PKR ${est.partsCost.toLocaleString()}). Its current status is ${est.status}. You can accept or decline it directly on your customer portal.`;
        taskNeeded = true;
        taskDesc = `Customer asked about estimate (PKR ${est.totalCost.toLocaleString()}). SA to follow up if needed.`;
      } else {
        reply = `Our technician is currently inspecting your car and preparing the itemized estimate. You will receive an instant notification once it is submitted!`;
      }
    }
  } else if (lowerMsg.includes('reschedule') || lowerMsg.includes('change date') || lowerMsg.includes('postpone')) {
    intent = 'Reschedule Request';
    sentiment = 'URGENT';
    taskNeeded = true;
    reply = `I have noted your reschedule request. I have alerted our Service Advisor to call you back and confirm an updated time slot that works best for you!`;
    taskDesc = `Customer requested appointment reschedule for booking #${booking?.reference || 'N/A'}.`;
  } else {
    // General or fallback
    intent = 'General Inquiry';
    reply = booking
      ? `I have noted that down for your booking #${booking.reference}. I am passing this note to your Service Advisor right away.`
      : `Thank you for the message. I will ensure our Service Advisor reviews your message and gives you a call back.`;
    taskNeeded = true;
    taskDesc = `Follow up with customer regarding inquiry: "${message.substring(0, 100)}"`;
  }

  // If task is needed or this is end of conversation, create an AI Front Desk Task for SA
  let taskCreated = null;
  const callerName = booking?.customer.name || customerIdentifier || 'Unknown Customer';
  const callerPhone = booking?.customer.phone || 'Phone not registered';
  const summaryText = `Customer ${callerName} inquired: "${message}". AI Response: "${reply}"`;

  const transcript = JSON.stringify([
    ...history,
    { role: 'user', text: message },
    { role: 'assistant', text: reply },
  ]);

  taskCreated = await prisma.aIFronDeskTask.create({
    data: {
      shopId,
      bookingId: booking?.id,
      callerName,
      callerPhone,
      intent,
      sentiment,
      summary: summaryText,
      taskDescription: taskDesc || `Follow up with ${callerName} regarding recent call`,
      status: 'OPEN',
      transcript,
    },
  });

  // Notify Service Advisor of new AI Front Desk task
  await notifyShopStaffByRole(
    shopId,
    ['SERVICE_ADVISOR', 'OWNER'],
    'New AI Front Desk Task',
    `Task: ${taskCreated.taskDescription} (Caller: ${callerName})`,
    booking?.id
  );

  return {
    reply,
    identifiedBooking: booking,
    taskCreated,
    summary: summaryText,
  };
}
