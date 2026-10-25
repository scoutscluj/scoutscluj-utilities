import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../auth/auth.module';
import {
  AdultDocument,
  AdultDocumentFile,
} from './entities/adult-document.entity';
import { AdultDocumentsController } from './adult-documents.controller';
import { AdultDocumentsService } from './adult-documents.service';

@Module({
  imports: [
    AuthModule,
    MikroOrmModule.forFeature([AdultDocument, AdultDocumentFile]),
  ],
  controllers: [AdultDocumentsController],
  providers: [AdultDocumentsService],
})
export class AdultDocumentsModule {}
