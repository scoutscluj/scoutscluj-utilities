import { Migration } from '@mikro-orm/migrations';

export class Migration20260709000100 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "financial_documents" alter column "status" set default \'ready_to_send\';',
    );

    this.addSql(
      'update "financial_documents" set "status" = \'ready_to_send\', "updated_at" = now() where "status" in (\'uploaded\', \'in_review\');',
    );

    this.addSql(`
      update "financial_documents" as document
      set "reviewer_notes" = null, "updated_at" = now()
      where document."status" = 'sent'
        and document."reviewer_notes" is not null
        and exists (
          select 1
          from "financial_document_handoff_attempts" as failed_attempt
          where failed_attempt."document_id" = document."id"
            and failed_attempt."status" = 'failed'
            and failed_attempt."error_message" = document."reviewer_notes"
            and exists (
              select 1
              from "financial_document_handoff_attempts" as succeeded_attempt
              where succeeded_attempt."document_id" = document."id"
                and succeeded_attempt."status" = 'succeeded'
                and succeeded_attempt."created_at" > failed_attempt."created_at"
            )
        );
    `);
  }

  override down(): void {}
}
