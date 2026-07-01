import { Migration } from '@mikro-orm/migrations';

export class Migration20260701000300 extends Migration {
  override up(): void {
    this.addSql(`
      with restored(legacy_source_id, condiments) as (
        values
          ('fea7c5a1-6c07-4af8-86f2-a41967b0adc2', jsonb_build_array('sare', 'boia')),
          ('6f997ab8-680f-4cec-b1e3-a6f9a8fb8cfb', jsonb_build_array('sare', 'piper', 'oțet')),
          ('0f25260d-6320-47b4-9f2e-79f89f48d3f2', jsonb_build_array('sare', 'piper', 'ulei', 'condiment fajitas')),
          ('ddb47809-c595-4904-8ffb-1ab030c57caa', jsonb_build_array('sare', 'piper', 'Maggi Idea Zilei paste bolognese', 'ulei')),
          ('c17a57e7-7981-4672-8681-81a11c363926', jsonb_build_array('sare', 'piper', 'Maggi Idea Zilei paste bolognese')),
          ('49588ae7-2732-43e6-bc84-ebfca1653617', jsonb_build_array('sare', 'piper')),
          ('2e37e22d-adcc-4088-8f73-b4dba3408730', jsonb_build_array('sare', 'piper', 'boia', 'foi de dafin')),
          ('7e1ddfd4-c292-4dff-8669-651e7a6277c4', jsonb_build_array('sare', 'piper', 'foi de dafin')),
          ('1ca5da5d-117e-4635-83ba-c117b157119a', jsonb_build_array('sare', 'piper', 'ketchup')),
          ('8b056de9-e2c0-4a7b-8847-884cef32aa33', jsonb_build_array('esență de vanilie')),
          ('57f8d5ae-fa93-4b63-9368-e6d42d95abf5', jsonb_build_array('boia', 'sare', 'piper', 'foi de dafin')),
          ('0da2fa71-053f-4365-86aa-447314cdee0f', jsonb_build_array('sare', 'piper', 'boia', 'foi de dafin', 'ulei')),
          ('0b7222fb-3a5f-46f8-a564-f00d4ef95045', jsonb_build_array('ulei', 'sare', 'boia', 'piper')),
          ('b64228ec-24d3-4e5c-ba78-47f6190eae29', jsonb_build_array('sare', 'ulei', 'borș')),
          ('4fcfcb1f-44e6-4cf7-8403-f39e210904b6', jsonb_build_array('Vegeta', 'zahăr brun', 'amidon de porumb')),
          ('2c1a9967-84e6-4d7e-a319-bbab1d4baeac', jsonb_build_array('ulei', 'foi de dafin', 'boia', 'piper', 'sare')),
          ('81385eb0-07dc-4a38-8829-2efbef63f13c', jsonb_build_array('ketchup', 'muștar')),
          ('bba53138-9a9b-4cd8-90da-f6e47430a33a', jsonb_build_array('muștar', 'ketchup')),
          ('6a6ac6d1-da01-436a-ac51-2bd4e0c409ae', jsonb_build_array('ulei', 'sare', 'piper', 'boia', 'foi de dafin')),
          ('4121323a-5fb2-4960-bbb4-0f834a664135', jsonb_build_array('ulei', 'sare', 'piper')),
          ('22951497-f340-48c9-8fad-9fe974a32642', jsonb_build_array('ketchup', 'sare', 'piper')),
          ('2be9e5f7-68da-4d26-9f56-0622be45234f', jsonb_build_array('drojdie', 'sare', 'zahăr', 'scorțișoară'))
      )
      update "kitchen_recipes" as r
      set "condiments" = restored.condiments
      from restored
      where r."legacy_source_id" = restored.legacy_source_id
        and r."condiments" = '[]'::jsonb;
    `);

    this.addSql(`
      with restored(legacy_source_id, condiments) as (
        values
          ('fea7c5a1-6c07-4af8-86f2-a41967b0adc2', jsonb_build_array('sare', 'boia')),
          ('6f997ab8-680f-4cec-b1e3-a6f9a8fb8cfb', jsonb_build_array('sare', 'piper', 'oțet')),
          ('0f25260d-6320-47b4-9f2e-79f89f48d3f2', jsonb_build_array('sare', 'piper', 'ulei', 'condiment fajitas')),
          ('ddb47809-c595-4904-8ffb-1ab030c57caa', jsonb_build_array('sare', 'piper', 'Maggi Idea Zilei paste bolognese', 'ulei')),
          ('c17a57e7-7981-4672-8681-81a11c363926', jsonb_build_array('sare', 'piper', 'Maggi Idea Zilei paste bolognese')),
          ('49588ae7-2732-43e6-bc84-ebfca1653617', jsonb_build_array('sare', 'piper')),
          ('2e37e22d-adcc-4088-8f73-b4dba3408730', jsonb_build_array('sare', 'piper', 'boia', 'foi de dafin')),
          ('7e1ddfd4-c292-4dff-8669-651e7a6277c4', jsonb_build_array('sare', 'piper', 'foi de dafin')),
          ('1ca5da5d-117e-4635-83ba-c117b157119a', jsonb_build_array('sare', 'piper', 'ketchup')),
          ('8b056de9-e2c0-4a7b-8847-884cef32aa33', jsonb_build_array('esență de vanilie')),
          ('57f8d5ae-fa93-4b63-9368-e6d42d95abf5', jsonb_build_array('boia', 'sare', 'piper', 'foi de dafin')),
          ('0da2fa71-053f-4365-86aa-447314cdee0f', jsonb_build_array('sare', 'piper', 'boia', 'foi de dafin', 'ulei')),
          ('0b7222fb-3a5f-46f8-a564-f00d4ef95045', jsonb_build_array('ulei', 'sare', 'boia', 'piper')),
          ('b64228ec-24d3-4e5c-ba78-47f6190eae29', jsonb_build_array('sare', 'ulei', 'borș')),
          ('4fcfcb1f-44e6-4cf7-8403-f39e210904b6', jsonb_build_array('Vegeta', 'zahăr brun', 'amidon de porumb')),
          ('2c1a9967-84e6-4d7e-a319-bbab1d4baeac', jsonb_build_array('ulei', 'foi de dafin', 'boia', 'piper', 'sare')),
          ('81385eb0-07dc-4a38-8829-2efbef63f13c', jsonb_build_array('ketchup', 'muștar')),
          ('bba53138-9a9b-4cd8-90da-f6e47430a33a', jsonb_build_array('muștar', 'ketchup')),
          ('6a6ac6d1-da01-436a-ac51-2bd4e0c409ae', jsonb_build_array('ulei', 'sare', 'piper', 'boia', 'foi de dafin')),
          ('4121323a-5fb2-4960-bbb4-0f834a664135', jsonb_build_array('ulei', 'sare', 'piper')),
          ('22951497-f340-48c9-8fad-9fe974a32642', jsonb_build_array('ketchup', 'sare', 'piper')),
          ('2be9e5f7-68da-4d26-9f56-0622be45234f', jsonb_build_array('drojdie', 'sare', 'zahăr', 'scorțișoară'))
      )
      update "kitchen_meal_recipes" as kmr
      set "condiments_snapshot" = restored.condiments
      from "kitchen_recipes" as r
      join restored on restored.legacy_source_id = r."legacy_source_id"
      where kmr."recipe_id" = r."id"
        and kmr."condiments_snapshot" = '[]'::jsonb;
    `);
  }

  override down(): void {
    this.addSql(`
      with restored(legacy_source_id, condiments) as (
        values
          ('fea7c5a1-6c07-4af8-86f2-a41967b0adc2', jsonb_build_array('sare', 'boia')),
          ('6f997ab8-680f-4cec-b1e3-a6f9a8fb8cfb', jsonb_build_array('sare', 'piper', 'oțet')),
          ('0f25260d-6320-47b4-9f2e-79f89f48d3f2', jsonb_build_array('sare', 'piper', 'ulei', 'condiment fajitas')),
          ('ddb47809-c595-4904-8ffb-1ab030c57caa', jsonb_build_array('sare', 'piper', 'Maggi Idea Zilei paste bolognese', 'ulei')),
          ('c17a57e7-7981-4672-8681-81a11c363926', jsonb_build_array('sare', 'piper', 'Maggi Idea Zilei paste bolognese')),
          ('49588ae7-2732-43e6-bc84-ebfca1653617', jsonb_build_array('sare', 'piper')),
          ('2e37e22d-adcc-4088-8f73-b4dba3408730', jsonb_build_array('sare', 'piper', 'boia', 'foi de dafin')),
          ('7e1ddfd4-c292-4dff-8669-651e7a6277c4', jsonb_build_array('sare', 'piper', 'foi de dafin')),
          ('1ca5da5d-117e-4635-83ba-c117b157119a', jsonb_build_array('sare', 'piper', 'ketchup')),
          ('8b056de9-e2c0-4a7b-8847-884cef32aa33', jsonb_build_array('esență de vanilie')),
          ('57f8d5ae-fa93-4b63-9368-e6d42d95abf5', jsonb_build_array('boia', 'sare', 'piper', 'foi de dafin')),
          ('0da2fa71-053f-4365-86aa-447314cdee0f', jsonb_build_array('sare', 'piper', 'boia', 'foi de dafin', 'ulei')),
          ('0b7222fb-3a5f-46f8-a564-f00d4ef95045', jsonb_build_array('ulei', 'sare', 'boia', 'piper')),
          ('b64228ec-24d3-4e5c-ba78-47f6190eae29', jsonb_build_array('sare', 'ulei', 'borș')),
          ('4fcfcb1f-44e6-4cf7-8403-f39e210904b6', jsonb_build_array('Vegeta', 'zahăr brun', 'amidon de porumb')),
          ('2c1a9967-84e6-4d7e-a319-bbab1d4baeac', jsonb_build_array('ulei', 'foi de dafin', 'boia', 'piper', 'sare')),
          ('81385eb0-07dc-4a38-8829-2efbef63f13c', jsonb_build_array('ketchup', 'muștar')),
          ('bba53138-9a9b-4cd8-90da-f6e47430a33a', jsonb_build_array('muștar', 'ketchup')),
          ('6a6ac6d1-da01-436a-ac51-2bd4e0c409ae', jsonb_build_array('ulei', 'sare', 'piper', 'boia', 'foi de dafin')),
          ('4121323a-5fb2-4960-bbb4-0f834a664135', jsonb_build_array('ulei', 'sare', 'piper')),
          ('22951497-f340-48c9-8fad-9fe974a32642', jsonb_build_array('ketchup', 'sare', 'piper')),
          ('2be9e5f7-68da-4d26-9f56-0622be45234f', jsonb_build_array('drojdie', 'sare', 'zahăr', 'scorțișoară'))
      )
      update "kitchen_recipes" as r
      set "condiments" = '[]'::jsonb
      from restored
      where r."legacy_source_id" = restored.legacy_source_id
        and r."condiments" = restored.condiments;
    `);
  }
}
