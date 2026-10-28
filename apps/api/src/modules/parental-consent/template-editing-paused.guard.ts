import {
  HttpException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
@Injectable()
export class TemplateEditingPausedGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ method: string }>();
    if (['POST', 'PATCH', 'DELETE'].includes(request.method))
      throw new HttpException(
        'Editorul de acorduri parentale este suspendat temporar. Completează formatul fix în setările înscrierii activității.',
        423,
      );
    return true;
  }
}
