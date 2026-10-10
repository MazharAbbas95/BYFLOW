import { prisma } from '../prisma/client';
import { executeTransition } from './stateMachine';
import { broadcastToShop, createNotification, notifyShopStaffByRole } from './notificationService';

export interface MatchedInventoryResult {
  inventoryItem: any | null;
  onHand: number;
  shortage: number;
}

/**
 * Intelligently matches a part description to existing shop inventory
 */
export function matchInventoryItem(
  partName: string,
  partInventoryId: string | null | undefined,
  inventoryList: any[]
): any | null {
  if (!inventoryList || inventoryList.length === 0) return null;

  // 1. Direct ID match
  if (partInventoryId) {
    const directMatch = inventoryList.find((i) => i.id === partInventoryId);
    if (directMatch) return directMatch;
  }

  const rawName = (partName || '').trim();
  if (!rawName) return null;
  const lowerName = rawName.toLowerCase();

  // 2. Exact SKU match
  const skuMatch = inventoryList.find(
    (i) => i.sku && i.sku.trim().toLowerCase() === lowerName
  );
  if (skuMatch) return skuMatch;

  // 3. Exact Name match (case-insensitive, trimmed)
  const exactNameMatch = inventoryList.find(
    (i) => i.name && i.name.trim().toLowerCase() === lowerName
  );
  if (exactNameMatch) return exactNameMatch;

  // 4. Substring containment (e.g. "Oil Filter" in "OEM Oil Filter (Honda)")
  const subMatch = inventoryList.find((i) => {
    if (!i.name) return false;
    const invLower = i.name.trim().toLowerCase();
    return invLower.includes(lowerName) || lowerName.includes(invLower);
  });
  if (subMatch) return subMatch;

  // 5. Keyword token overlap
  // Tokenize ignoring common filler symbols: ()/-
  const tokens = lowerName
    .replace(/[()\-/_]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !['set', 'oem', 'the', 'for'].includes(t));

  if (tokens.length > 0) {
    let bestItem: any = null;
    let maxMatches = 0;

    for (const item of inventoryList) {
      if (!item.name) continue;
      const invTokens = item.name
        .toLowerCase()
        .replace(/[()\-/_]/g, ' ')
        .split(/\s+/);

      const matches = tokens.filter((t) =>
        invTokens.some((it: string) => it.includes(t) || t.includes(it))
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestItem = item;
      }
    }

    if (maxMatches >= 1 && bestItem) {
      return bestItem;
    }
  }

  return null;
}

/**
 * Re-evaluates all work orders awaiting parts for a shop.
 * If all required parts are now in stock (e.g. after a PO delivery or inventory restock),
 * automatically transitions the booking to PARTS_READY and notifies staff.
 */
export async function recheckAndAdvanceWorkOrdersAwaitingParts(
  shopId: string,
  contextNote?: string,
  user?: { id: string; name: string; role?: string }
): Promise<{ updatedCount: number; updatedBookings: any[] }> {
  // Find all work orders waiting for parts in this shop
  const awaitingBookings = await prisma.booking.findMany({
    where: {
      shopId,
      status: { in: ['PARTS_PENDING', 'PARTS_ORDERED'] },
    },
    include: {
      vehicle: true,
      customer: true,
      technician: true,
      estimates: {
        orderBy: { revision: 'desc' },
        take: 1,
        include: { lineItems: true },
      },
    },
  });

  if (awaitingBookings.length === 0) {
    return { updatedCount: 0, updatedBookings: [] };
  }

  // Fetch fresh inventory snapshot
  const inventory = await prisma.inventoryItem.findMany({ where: { shopId } });
  const invMap = new Map(inventory.map((i) => [i.id, i]));

  const updatedBookings: any[] = [];

  for (const booking of awaitingBookings) {
    const latestEst = booking.estimates[0];
    const items = latestEst?.lineItems || [];
    if (items.length === 0) continue;

    let allInStock = true;

    for (const line of items) {
      let invItem = line.partInventoryId ? invMap.get(line.partInventoryId) : null;
      if (!invItem) {
        invItem = matchInventoryItem(line.partName, line.partInventoryId, inventory);
        if (invItem) {
          // Link permanently in DB
          await prisma.estimateLineItem.update({
            where: { id: line.id },
            data: { partInventoryId: invItem.id },
          }).catch(() => {});
        }
      }

      const onHand = invItem ? invItem.quantityOnHand : 0;
      if (line.quantity > onHand) {
        allInStock = false;
        break;
      }
    }

    // If all required items are in stock, advance from PARTS_PENDING / PARTS_ORDERED to PARTS_READY
    if (allInStock) {
      try {
        const updated = await executeTransition('PARTS_ARRIVED', {
          bookingId: booking.id,
          targetStatus: 'PARTS_READY',
          userId: user?.id || 'system',
          userName: user?.name || 'BayFlow Procurement Engine',
          userRole: (user?.role as any) || 'PARTS_PERSON',
          note: contextNote || 'Stock replenished. All parts are verified in stock and ready for repair.',
        });

        // Notify Technician
        if (booking.technicianId) {
          await createNotification({
            userId: booking.technicianId,
            title: 'Parts Shortage Resolved! ✓',
            message: `All parts for vehicle ${booking.vehicle?.registrationPlate} (#${booking.reference}) are in stock and ready for repair.`,
            shopId: booking.shopId,
            bookingId: booking.id,
          });
        }

        // Notify Service Advisor & Owner
        await notifyShopStaffByRole(
          booking.shopId,
          ['SERVICE_ADVISOR', 'OWNER'],
          'Parts Arrived for Work Order',
          `Shortage resolved for #${booking.reference}. Job moved to PARTS_READY.`,
          booking.id
        );

        updatedBookings.push(updated);
      } catch (err: any) {
        console.error(`Failed to auto-advance booking ${booking.reference}:`, err.message);
      }
    }
  }

  return { updatedCount: updatedBookings.length, updatedBookings };
}
