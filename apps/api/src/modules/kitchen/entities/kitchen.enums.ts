export enum KitchenUnitFamily {
  Mass = 'mass',
  Volume = 'volume',
  Count = 'count',
}

export enum KitchenDayStatus {
  Current = 'current',
  OutsideActivityDates = 'outside_activity_dates',
}

export enum KitchenMealSlot {
  Breakfast = 'breakfast',
  Snack1 = 'snack_1',
  Lunch = 'lunch',
  Snack2 = 'snack_2',
  Dinner = 'dinner',
}

export enum KitchenAttendanceMode {
  PlanDefault = 'plan_default',
  Custom = 'custom',
}

export enum KitchenRecipeScalingMode {
  Proportional = 'proportional',
  WholeBatch = 'whole_batch',
}

export enum KitchenProcurementMethod {
  Delivery = 'delivery',
  LocalCenter = 'local_center',
  Person = 'person',
  SelfPurchase = 'self_purchase',
  ShoppingRun = 'shopping_run',
  SupplierOrder = 'supplier_order',
}

export enum KitchenProcurementStatus {
  Planned = 'planned',
  InProgress = 'in_progress',
  Completed = 'completed',
}
