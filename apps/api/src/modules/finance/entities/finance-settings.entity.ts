import { defineEntity, p, type InferEntity } from '@mikro-orm/core';
import { KeezHandoffMode } from './keez-handoff-mode.enum';

export const FinanceSettings = defineEntity({
  name: 'FinanceSettings',
  tableName: 'finance_settings',
  properties: {
    id: p.integer().primary(),
    keezHandoffMode: p
      .enum(() => KeezHandoffMode)
      .default(KeezHandoffMode.ReviewFirst)
      .nativeEnumName('keez_handoff_mode')
      .fieldName('keez_handoff_mode'),
    updatedById: p.integer().nullable().fieldName('updated_by_id'),
    updatedAt: p
      .datetime()
      .fieldName('updated_at')
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export type FinanceSettings = InferEntity<typeof FinanceSettings>;
