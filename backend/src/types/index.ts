import { Request } from 'express';

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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string; // global role
  memberships: {
    shopId: string;
    role: UserRole;
    shopName: string;
  }[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  currentShopId?: string;
  currentShopRole?: UserRole;
}
