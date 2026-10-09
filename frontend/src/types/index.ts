export type UserRole = 
  | 'CUSTOMER' 
  | 'OWNER' 
  | 'SERVICE_ADVISOR' 
  | 'TECHNICIAN' 
  | 'PARTS_PERSON' 
  | 'QC_INSPECTOR';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'ASSIGNED'
  | 'INSPECTING'
  | 'ESTIMATE_REVIEW'
  | 'AWAITING_CUSTOMER'
  | 'ESTIMATE_APPROVED'
  | 'ESTIMATE_REJECTED'
  | 'PARTS_PENDING'
  | 'PARTS_ORDERED'
  | 'PARTS_READY'
  | 'IN_REPAIR'
  | 'QC_PENDING'
  | 'QC_IN_PROGRESS'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  memberships: {
    shopId: string;
    role: UserRole;
    shopName: string;
  }[];
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  workingHours: string;
  slotDuration: number;
  slotCapacity: number;
  rating: number;
  logo?: string;
  services?: ServiceItem[];
  _count?: {
    bookings: number;
    members: number;
  };
}

export interface ServiceItem {
  id: string;
  shopId: string;
  name: string;
  description: string;
  estimatedDuration: number;
  basePrice: number;
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  customerId: string;
  registrationPlate: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  mileage?: number;
}

export interface EstimateLineItem {
  id: string;
  estimateId: string;
  partInventoryId?: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Estimate {
  id: string;
  bookingId: string;
  revision: number;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  status: string;
  submittedById?: string;
  reviewedById?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  lineItems: EstimateLineItem[];
}

export interface BookingHistoryItem {
  id: string;
  bookingId: string;
  userId?: string;
  userName: string;
  userRole: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
  createdAt: string;
}

export interface QcIssue {
  id: string;
  bookingId: string;
  inspectorId: string;
  inspector?: { name: string };
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  reference: string;
  shopId: string;
  shop?: Shop;
  customerId: string;
  customer?: User;
  vehicleId: string;
  vehicle: Vehicle;
  bookingDate: string;
  bookingTime: string;
  selectedServices: string;
  reportedProblem: string;
  status: BookingStatus;
  technicianId?: string;
  technician?: { id: string; name: string };
  partsPersonId?: string;
  partsPerson?: { id: string; name: string };
  qcInspectorId?: string;
  qcInspector?: { id: string; name: string };
  estimates: Estimate[];
  history: BookingHistoryItem[];
  qcIssues: QcIssue[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  shopId: string;
  sku: string;
  name: string;
  quantityOnHand: number;
  reorderLevel: number;
  costPrice: number;
  sellPrice: number;
  category?: string;
}

export interface PurchaseOrder {
  id: string;
  shopId: string;
  poNumber: string;
  supplierName: string;
  status: 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED';
  bookingId?: string;
  booking?: { reference: string; vehicle: Vehicle };
  notes?: string;
  createdAt: string;
  items: {
    id: string;
    inventoryItemId: string;
    inventoryItem: InventoryItem;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
  }[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  bookingId?: string;
}

export interface AIFronDeskTask {
  id: string;
  shopId: string;
  bookingId?: string;
  booking?: Booking;
  callerName: string;
  callerPhone: string;
  intent: string;
  sentiment: string;
  summary: string;
  taskDescription: string;
  status: 'OPEN' | 'DONE';
  transcript: string;
  createdAt: string;
}
