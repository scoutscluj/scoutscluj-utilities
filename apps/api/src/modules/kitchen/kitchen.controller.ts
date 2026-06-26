import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser as CurrentUserDecorator } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  AssignKitchenMealRecipeDto,
  CreateKitchenPlanDto,
  CreateKitchenQuantityAdjustmentDto,
  KitchenIngredientDto,
  KitchenOverviewDto,
  KitchenProcurementEventDto,
  KitchenRecipeDto,
  LinkProcurementDocumentDto,
  ReplaceKitchenMealAttendanceDto,
  UploadProcurementDocumentDto,
  UpsertKitchenIngredientDto,
  UpsertKitchenMealDto,
  UpsertKitchenProcurementEventDto,
  UpsertKitchenProcurementItemDto,
  UpsertKitchenRecipeDto,
} from './dto/kitchen.dto';
import { KitchenService } from './kitchen.service';

@ApiTags('kitchen')
@UseGuards(AuthGuard)
@Controller('activities/:activityId/kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get()
  @ApiOkResponse({ type: KitchenOverviewDto })
  getOverview(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.kitchenService.getOverview(user, activityId);
  }

  @Post()
  @ApiOkResponse({ type: KitchenOverviewDto })
  createOrUpdatePlan(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: CreateKitchenPlanDto,
  ) {
    return this.kitchenService.createOrUpdatePlan(user, activityId, body);
  }

  @Post('sync-days')
  @ApiOkResponse({ type: KitchenOverviewDto })
  syncDays(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.kitchenService.syncDays(user, activityId);
  }

  @Get('ingredients')
  @ApiOkResponse({ type: [KitchenIngredientDto] })
  listIngredients(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.kitchenService.listIngredients(user, activityId);
  }

  @Post('ingredients')
  @ApiOkResponse({ type: KitchenIngredientDto })
  createIngredient(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: UpsertKitchenIngredientDto,
  ) {
    return this.kitchenService.createIngredient(user, activityId, body);
  }

  @Patch('ingredients/:ingredientId')
  @ApiOkResponse({ type: KitchenIngredientDto })
  updateIngredient(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('ingredientId', ParseIntPipe) ingredientId: number,
    @Body() body: UpsertKitchenIngredientDto,
  ) {
    return this.kitchenService.updateIngredient(
      user,
      activityId,
      ingredientId,
      body,
    );
  }

  @Get('recipes')
  @ApiOkResponse({ type: [KitchenRecipeDto] })
  listRecipes(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.kitchenService.listRecipes(user, activityId);
  }

  @Post('recipes')
  @ApiOkResponse({ type: KitchenRecipeDto })
  createRecipe(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: UpsertKitchenRecipeDto,
  ) {
    return this.kitchenService.createRecipe(user, activityId, body);
  }

  @Patch('recipes/:recipeId')
  @ApiOkResponse({ type: KitchenRecipeDto })
  updateRecipe(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
    @Body() body: UpsertKitchenRecipeDto,
  ) {
    return this.kitchenService.updateRecipe(user, activityId, recipeId, body);
  }

  @Post('meals')
  @ApiOkResponse({ type: KitchenOverviewDto })
  createMeal(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: UpsertKitchenMealDto,
  ) {
    return this.kitchenService.createMeal(user, activityId, body);
  }

  @Patch('meals/:mealId')
  @ApiOkResponse({ type: KitchenOverviewDto })
  updateMeal(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('mealId', ParseIntPipe) mealId: number,
    @Body() body: UpsertKitchenMealDto,
  ) {
    return this.kitchenService.updateMeal(user, activityId, mealId, body);
  }

  @Delete('meals/:mealId')
  @ApiOkResponse({ type: KitchenOverviewDto })
  deleteMeal(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('mealId', ParseIntPipe) mealId: number,
  ) {
    return this.kitchenService.deleteMeal(user, activityId, mealId);
  }

  @Post('meals/:mealId/recipes')
  @ApiOkResponse({ type: KitchenOverviewDto })
  assignRecipe(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('mealId', ParseIntPipe) mealId: number,
    @Body() body: AssignKitchenMealRecipeDto,
  ) {
    return this.kitchenService.assignRecipe(user, activityId, mealId, body);
  }

  @Delete('meal-recipes/:mealRecipeId')
  @ApiOkResponse({ type: KitchenOverviewDto })
  deleteMealRecipe(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('mealRecipeId', ParseIntPipe) mealRecipeId: number,
  ) {
    return this.kitchenService.deleteMealRecipe(user, activityId, mealRecipeId);
  }

  @Post('meals/:mealId/attendance')
  @ApiOkResponse({ type: KitchenOverviewDto })
  replaceAttendance(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('mealId', ParseIntPipe) mealId: number,
    @Body() body: ReplaceKitchenMealAttendanceDto,
  ) {
    return this.kitchenService.replaceAttendance(
      user,
      activityId,
      mealId,
      body,
    );
  }

  @Post('meals/:mealId/adjustments')
  @ApiOkResponse({ type: KitchenOverviewDto })
  createAdjustment(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('mealId', ParseIntPipe) mealId: number,
    @Body() body: CreateKitchenQuantityAdjustmentDto,
  ) {
    return this.kitchenService.createAdjustment(user, activityId, mealId, body);
  }

  @Delete('adjustments/:adjustmentId')
  @ApiOkResponse({ type: KitchenOverviewDto })
  deleteAdjustment(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('adjustmentId', ParseIntPipe) adjustmentId: number,
  ) {
    return this.kitchenService.deleteAdjustment(user, activityId, adjustmentId);
  }

  @Get('procurement')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  listProcurement(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.kitchenService.listProcurement(user, activityId);
  }

  @Post('procurement')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  createProcurementEvent(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: UpsertKitchenProcurementEventDto,
  ) {
    return this.kitchenService.createProcurementEvent(user, activityId, body);
  }

  @Patch('procurement/:eventId')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  updateProcurementEvent(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() body: UpsertKitchenProcurementEventDto,
  ) {
    return this.kitchenService.updateProcurementEvent(
      user,
      activityId,
      eventId,
      body,
    );
  }

  @Delete('procurement/:eventId')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  deleteProcurementEvent(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.kitchenService.deleteProcurementEvent(
      user,
      activityId,
      eventId,
    );
  }

  @Post('procurement/:eventId/items')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  addProcurementItem(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() body: UpsertKitchenProcurementItemDto,
  ) {
    return this.kitchenService.addProcurementItem(
      user,
      activityId,
      eventId,
      body,
    );
  }

  @Patch('procurement-items/:itemId')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  updateProcurementItem(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: UpsertKitchenProcurementItemDto,
  ) {
    return this.kitchenService.updateProcurementItem(
      user,
      activityId,
      itemId,
      body,
    );
  }

  @Delete('procurement-items/:itemId')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  deleteProcurementItem(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.kitchenService.deleteProcurementItem(user, activityId, itemId);
  }

  @Post('procurement/:eventId/from-meal-plan')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  addRemainingToProcurement(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.kitchenService.addRemainingToProcurement(
      user,
      activityId,
      eventId,
    );
  }

  @Post('procurement/:eventId/documents')
  @ApiOkResponse({ type: [KitchenProcurementEventDto] })
  linkProcurementDocument(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() body: LinkProcurementDocumentDto,
  ) {
    return this.kitchenService.linkProcurementDocument(
      user,
      activityId,
      eventId,
      body,
    );
  }

  @Post('procurement/:eventId/documents/upload')
  uploadProcurementDocument(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() body: UploadProcurementDocumentDto,
  ) {
    return this.kitchenService.uploadProcurementDocument(
      user,
      activityId,
      eventId,
      body,
    );
  }

  @Get('reports/ingredients.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  ingredientCsv(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.kitchenService.ingredientCsv(user, activityId);
  }

  @Get('reports/procurement.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  procurementCsv(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return this.kitchenService.procurementCsv(user, activityId);
  }

  @Get('procurement/:eventId/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  procurementEventCsv(
    @CurrentUserDecorator() user: AuthenticatedUser,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.kitchenService.procurementCsv(user, activityId, eventId);
  }
}
