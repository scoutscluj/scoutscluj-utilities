import { Migration } from '@mikro-orm/migrations';

export class Migration20260806121000 extends Migration {
  override up(): void {
    this.addSql(
      `alter type "activity_department" rename value 'parental_consent' to 'administrative';`,
    );
  }

  override down(): void {
    this.addSql(
      `alter type "activity_department" rename value 'administrative' to 'parental_consent';`,
    );
  }
}
