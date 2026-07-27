export enum ScheduleType {
  SHOP_OPERATING_HOURS = 'shop_operating_hours',
  STAFF_RECURRING_PATTERN = 'staff_recurring_pattern',
  STAFF_BREAK = 'staff_break',
}

export enum ExceptionScope {
  SHOP = 'shop',
  STAFF = 'staff',
}

export enum ExceptionType {
  HOLIDAY = 'holiday',
  LEAVE = 'leave',
  BLOCKED_SLOT = 'blocked_slot',
}

export enum ExceptionWorkflowStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
