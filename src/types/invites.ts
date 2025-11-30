import { Organization } from './organizations';
import { User } from './auth';

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface OrganizationInvite {
  id: string;
  organizationId: string;
  organization?: Organization;
  email: string;
  status: InviteStatus;
  invitedBy: string;
  inviter?: User;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

