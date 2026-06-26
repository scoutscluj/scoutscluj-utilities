import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Activity } from '../activities/entities/activity.entity';
import { AuditService } from '../audit/audit.service';
import { CreateFinancialDocumentDto } from '../finance/dto/finance.dto';
import { FinancialDocument } from '../finance/entities/financial-document.entity';
import { FinanceService } from '../finance/finance.service';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';
import {
  AssignKitchenMealRecipeDto,
  CreateKitchenPlanDto,
  CreateKitchenQuantityAdjustmentDto,
  KitchenDayDto,
  KitchenIngredientDto,
  KitchenMealAttendanceDto,
  KitchenMealDto,
  KitchenMealRecipeDto,
  KitchenOverviewDto,
  KitchenPlanDto,
  KitchenProcurementDocumentDto,
  KitchenProcurementEventDto,
  KitchenProcurementItemDto,
  KitchenQuantityAdjustmentDto,
  KitchenRecipeDto,
  KitchenRecipeIngredientDto,
  LinkProcurementDocumentDto,
  ReplaceKitchenMealAttendanceDto,
  UploadProcurementDocumentDto,
  UpsertKitchenIngredientDto,
  UpsertKitchenMealDto,
  UpsertKitchenProcurementEventDto,
  UpsertKitchenProcurementItemDto,
  UpsertKitchenRecipeDto,
} from './dto/kitchen.dto';
import {
  convertKitchenQuantity,
  inferKitchenUnitFamily,
  KitchenCalculationService,
} from './kitchen-calculation.service';
import { KitchenDay } from './entities/kitchen-day.entity';
import {
  KitchenAttendanceMode,
  KitchenDayStatus,
  KitchenMealSlot,
  KitchenProcurementMethod,
  KitchenProcurementStatus,
  KitchenRecipeScalingMode,
} from './entities/kitchen.enums';
import { KitchenIngredient } from './entities/kitchen-ingredient.entity';
import { KitchenMealAttendance } from './entities/kitchen-meal-attendance.entity';
import { KitchenMealRecipe } from './entities/kitchen-meal-recipe.entity';
import { KitchenMeal } from './entities/kitchen-meal.entity';
import { KitchenPlanIngredientEstimate } from './entities/kitchen-plan-ingredient-estimate.entity';
import { KitchenPlan } from './entities/kitchen-plan.entity';
import { KitchenProcurementDocument } from './entities/kitchen-procurement-document.entity';
import { KitchenProcurementEvent } from './entities/kitchen-procurement-event.entity';
import { KitchenProcurementItem } from './entities/kitchen-procurement-item.entity';
import { KitchenQuantityAdjustment } from './entities/kitchen-quantity-adjustment.entity';
import { KitchenRecipeIngredient } from './entities/kitchen-recipe-ingredient.entity';
import { KitchenRecipe } from './entities/kitchen-recipe.entity';

type PlanState = {
  plan: KitchenPlan;
  activity: Activity;
  days: KitchenDay[];
  meals: KitchenMeal[];
  mealRecipes: KitchenMealRecipe[];
  mealAttendance: KitchenMealAttendance[];
  adjustments: KitchenQuantityAdjustment[];
  ingredients: KitchenIngredient[];
  recipes: KitchenRecipe[];
  recipeIngredients: KitchenRecipeIngredient[];
  estimates: KitchenPlanIngredientEstimate[];
  procurementEvents: KitchenProcurementEvent[];
  procurementItems: KitchenProcurementItem[];
  procurementDocuments: KitchenProcurementDocument[];
};

const cleanOptionalText = (value?: string) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const cleanRequiredText = (value: string | undefined, fieldName: string) => {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) {
    throw new BadRequestException(`${fieldName} este obligatoriu.`);
  }

  return cleaned.slice(0, 255);
};

const parsePositiveNumber = (
  value: number | undefined,
  fieldName: string,
  fallback?: number,
) => {
  if (value === undefined || value === null) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new BadRequestException(`${fieldName} este obligatoriu.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName} nu este valid.`);
  }

  return parsed;
};

const parseNonNegativeInteger = (
  value: number | undefined,
  fieldName: string,
  fallback = 0,
) => {
  const parsed =
    value === undefined || value === null ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestException(`${fieldName} nu este valid.`);
  }

  return parsed;
};

const parseOptionalDate = (value?: string) => {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) {
    return undefined;
  }

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Data nu este validă.');
  }

  return date;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const outsideActivityDatesStatus: string =
  KitchenDayStatus.OutsideActivityDates;

const enumerateDates = (startDate: Date, endDate: Date) => {
  const dates: Date[] = [];
  const cursor = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ),
  );
  const end = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
    ),
  );

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

@Injectable()
export class KitchenService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: EntityRepository<Activity>,
    @InjectRepository(FinancialDocument)
    private readonly documentsRepository: EntityRepository<FinancialDocument>,
    @InjectRepository(KitchenIngredient)
    private readonly ingredientsRepository: EntityRepository<KitchenIngredient>,
    @InjectRepository(KitchenRecipe)
    private readonly recipesRepository: EntityRepository<KitchenRecipe>,
    @InjectRepository(KitchenRecipeIngredient)
    private readonly recipeIngredientsRepository: EntityRepository<KitchenRecipeIngredient>,
    @InjectRepository(KitchenPlan)
    private readonly plansRepository: EntityRepository<KitchenPlan>,
    @InjectRepository(KitchenDay)
    private readonly daysRepository: EntityRepository<KitchenDay>,
    @InjectRepository(KitchenMeal)
    private readonly mealsRepository: EntityRepository<KitchenMeal>,
    @InjectRepository(KitchenMealRecipe)
    private readonly mealRecipesRepository: EntityRepository<KitchenMealRecipe>,
    @InjectRepository(KitchenMealAttendance)
    private readonly mealAttendanceRepository: EntityRepository<KitchenMealAttendance>,
    @InjectRepository(KitchenQuantityAdjustment)
    private readonly adjustmentsRepository: EntityRepository<KitchenQuantityAdjustment>,
    @InjectRepository(KitchenPlanIngredientEstimate)
    private readonly estimatesRepository: EntityRepository<KitchenPlanIngredientEstimate>,
    @InjectRepository(KitchenProcurementEvent)
    private readonly procurementEventsRepository: EntityRepository<KitchenProcurementEvent>,
    @InjectRepository(KitchenProcurementItem)
    private readonly procurementItemsRepository: EntityRepository<KitchenProcurementItem>,
    @InjectRepository(KitchenProcurementDocument)
    private readonly procurementDocumentsRepository: EntityRepository<KitchenProcurementDocument>,
    @Inject(EntityManager)
    private readonly em: EntityManager,
    private readonly calculationService: KitchenCalculationService,
    private readonly auditService: AuditService,
    private readonly financeService: FinanceService,
  ) {}

  async getOverview(
    user: CurrentUser,
    activityId: number,
  ): Promise<KitchenOverviewDto> {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanReadKitchen(user, activity);
    const state = await this.loadPlanState(plan, activity);

    return this.serializeOverview(state);
  }

  async createOrUpdatePlan(
    user: CurrentUser,
    activityId: number,
    input: CreateKitchenPlanDto,
  ) {
    const { activity, plan, created } = await this.getOrCreatePlan(
      user,
      activityId,
    );
    this.ensureCanManageKitchen(user, activity);
    plan.defaultParticipantCount = parseNonNegativeInteger(
      input.defaultParticipantCount,
      'Numărul de participanți',
      plan.defaultParticipantCount,
    );

    this.em.persist(plan);
    await this.em.flush();
    await this.ensureDaysForActivity(plan, activity);
    await this.auditService.record({
      actorId: user.id,
      action: created ? 'kitchen_plan.created' : 'kitchen_plan.updated',
      entityType: 'kitchen_plan',
      entityId: plan.id,
      activityId: activity.id,
      metadata: { defaultParticipantCount: plan.defaultParticipantCount },
    });

    return this.getOverview(user, activityId);
  }

  async syncDays(user: CurrentUser, activityId: number) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const result = await this.ensureDaysForActivity(plan, activity, true);
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_days.synced',
      entityType: 'kitchen_plan',
      entityId: plan.id,
      activityId: activity.id,
      metadata: result,
    });

    return this.getOverview(user, activityId);
  }

  async listIngredients(
    user: CurrentUser,
    activityId: number,
  ): Promise<KitchenIngredientDto[]> {
    const activity = await this.getActivity(activityId);
    this.ensureCanReadKitchen(user, activity);
    const ingredients = await this.ingredientsRepository.findAll({
      orderBy: { category: 'asc', name: 'asc' },
    });

    return ingredients.map((ingredient) =>
      this.serializeIngredient(ingredient),
    );
  }

  async createIngredient(
    user: CurrentUser,
    activityId: number,
    input: UpsertKitchenIngredientDto,
  ) {
    const activity = await this.getActivity(activityId);
    this.ensureCanManageKitchen(user, activity);
    const ingredient = this.ingredientsRepository.create({
      name: cleanRequiredText(input.name, 'Ingredientul'),
      category: cleanRequiredText(input.category, 'Categoria'),
      defaultUnit: cleanRequiredText(input.defaultUnit, 'Unitatea'),
      unitFamily: inferKitchenUnitFamily(input.defaultUnit),
      defaultPricePerUnit: parsePositiveNumber(
        input.defaultPricePerUnit,
        'Prețul estimat',
      ),
    });
    this.em.persist(ingredient);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_ingredient.created',
      entityType: 'kitchen_ingredient',
      entityId: ingredient.id,
      activityId,
      metadata: { name: ingredient.name },
    });

    return this.serializeIngredient(ingredient);
  }

  async updateIngredient(
    user: CurrentUser,
    activityId: number,
    ingredientId: number,
    input: UpsertKitchenIngredientDto,
  ) {
    const activity = await this.getActivity(activityId);
    this.ensureCanManageKitchen(user, activity);
    const ingredient = await this.getIngredient(ingredientId);
    ingredient.name = cleanRequiredText(input.name, 'Ingredientul');
    ingredient.category = cleanRequiredText(input.category, 'Categoria');
    ingredient.defaultUnit = cleanRequiredText(input.defaultUnit, 'Unitatea');
    ingredient.unitFamily = inferKitchenUnitFamily(input.defaultUnit);
    ingredient.defaultPricePerUnit = parsePositiveNumber(
      input.defaultPricePerUnit,
      'Prețul estimat',
    );
    this.em.persist(ingredient);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_ingredient.updated',
      entityType: 'kitchen_ingredient',
      entityId: ingredient.id,
      activityId,
      metadata: { name: ingredient.name },
    });

    return this.serializeIngredient(ingredient);
  }

  async listRecipes(
    user: CurrentUser,
    activityId: number,
  ): Promise<KitchenRecipeDto[]> {
    const activity = await this.getActivity(activityId);
    this.ensureCanReadKitchen(user, activity);
    const recipes = await this.recipesRepository.findAll({
      orderBy: { name: 'asc' },
    });
    const recipeIngredients = await this.recipeIngredientsRepository.findAll();
    const ingredients = await this.ingredientsRepository.findAll();

    return this.serializeRecipes(recipes, recipeIngredients, ingredients);
  }

  async createRecipe(
    user: CurrentUser,
    activityId: number,
    input: UpsertKitchenRecipeDto,
  ) {
    const activity = await this.getActivity(activityId);
    this.ensureCanManageKitchen(user, activity);
    const recipe = this.recipesRepository.create({
      name: cleanRequiredText(input.name, 'Rețeta'),
      description: cleanOptionalText(input.description),
      servings: parsePositiveNumber(input.servings, 'Numărul de porții'),
    });
    this.em.persist(recipe);
    await this.em.flush();
    await this.replaceRecipeIngredients(recipe.id, input.ingredients ?? []);
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_recipe.created',
      entityType: 'kitchen_recipe',
      entityId: recipe.id,
      activityId,
      metadata: { name: recipe.name },
    });

    return (await this.listRecipes(user, activityId)).find(
      (item) => item.id === recipe.id,
    );
  }

  async updateRecipe(
    user: CurrentUser,
    activityId: number,
    recipeId: number,
    input: UpsertKitchenRecipeDto,
  ) {
    const activity = await this.getActivity(activityId);
    this.ensureCanManageKitchen(user, activity);
    const recipe = await this.getRecipe(recipeId);
    recipe.name = cleanRequiredText(input.name, 'Rețeta');
    recipe.description = cleanOptionalText(input.description);
    recipe.servings = parsePositiveNumber(input.servings, 'Numărul de porții');
    this.em.persist(recipe);
    await this.em.flush();
    if (input.ingredients) {
      await this.replaceRecipeIngredients(recipe.id, input.ingredients);
    }
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_recipe.updated',
      entityType: 'kitchen_recipe',
      entityId: recipe.id,
      activityId,
      metadata: { name: recipe.name },
    });

    return (await this.listRecipes(user, activityId)).find(
      (item) => item.id === recipe.id,
    );
  }

  async createMeal(
    user: CurrentUser,
    activityId: number,
    input: UpsertKitchenMealDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const day = await this.getPlanDay(plan.id, input.kitchenDayId);
    if (!Object.values(KitchenMealSlot).includes(input.slot)) {
      throw new BadRequestException('Tipul mesei nu este valid.');
    }
    const meal = this.mealsRepository.create({
      kitchenDayId: day.id,
      slot: input.slot,
      context: cleanOptionalText(input.context),
      name: cleanOptionalText(input.name),
      sortOrder: parseNonNegativeInteger(
        input.sortOrder,
        'Ordinea',
        await this.nextMealSortOrder(day.id, input.slot),
      ),
      attendanceMode: input.attendanceMode ?? KitchenAttendanceMode.PlanDefault,
    });
    this.em.persist(meal);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_meal.created',
      entityType: 'kitchen_meal',
      entityId: meal.id,
      activityId,
      metadata: { slot: meal.slot, context: meal.context, name: meal.name },
    });

    return this.getOverview(user, activityId);
  }

  async updateMeal(
    user: CurrentUser,
    activityId: number,
    mealId: number,
    input: UpsertKitchenMealDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const meal = await this.getPlanMeal(plan.id, mealId);
    const day = await this.getPlanDay(plan.id, input.kitchenDayId);
    meal.kitchenDayId = day.id;
    meal.slot = input.slot;
    meal.context = cleanOptionalText(input.context);
    meal.name = cleanOptionalText(input.name);
    meal.sortOrder = parseNonNegativeInteger(
      input.sortOrder,
      'Ordinea',
      meal.sortOrder,
    );
    meal.attendanceMode = input.attendanceMode ?? meal.attendanceMode;
    this.em.persist(meal);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_meal.updated',
      entityType: 'kitchen_meal',
      entityId: meal.id,
      activityId,
      metadata: { slot: meal.slot, context: meal.context, name: meal.name },
    });

    return this.getOverview(user, activityId);
  }

  async deleteMeal(user: CurrentUser, activityId: number, mealId: number) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const meal = await this.getPlanMeal(plan.id, mealId);
    const [recipes, attendance, adjustments] = await Promise.all([
      this.mealRecipesRepository.find({ mealId }),
      this.mealAttendanceRepository.find({ mealId }),
      this.adjustmentsRepository.find({ mealId }),
    ]);
    [...recipes, ...attendance, ...adjustments, meal].forEach((entity) =>
      this.em.remove(entity),
    );
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_meal.deleted',
      entityType: 'kitchen_meal',
      entityId: mealId,
      activityId,
      metadata: {},
    });

    return this.getOverview(user, activityId);
  }

  async assignRecipe(
    user: CurrentUser,
    activityId: number,
    mealId: number,
    input: AssignKitchenMealRecipeDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    await this.getPlanMeal(plan.id, mealId);
    await this.getRecipe(input.recipeId);
    const mealRecipe = this.mealRecipesRepository.create({
      mealId,
      recipeId: input.recipeId,
      servingOverride: input.servingOverride
        ? parsePositiveNumber(input.servingOverride, 'Porțiile')
        : undefined,
      scalingMode: input.scalingMode ?? KitchenRecipeScalingMode.Proportional,
    });
    this.em.persist(mealRecipe);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_meal_recipe.assigned',
      entityType: 'kitchen_meal_recipe',
      entityId: mealRecipe.id,
      activityId,
      metadata: { mealId, recipeId: input.recipeId },
    });

    return this.getOverview(user, activityId);
  }

  async deleteMealRecipe(
    user: CurrentUser,
    activityId: number,
    mealRecipeId: number,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const mealRecipe = await this.mealRecipesRepository.findOne({
      id: mealRecipeId,
    });
    if (!mealRecipe) {
      throw new NotFoundException('Rețeta nu este atașată mesei.');
    }
    await this.getPlanMeal(plan.id, mealRecipe.mealId);
    this.em.remove(mealRecipe);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_meal_recipe.removed',
      entityType: 'kitchen_meal_recipe',
      entityId: mealRecipeId,
      activityId,
      metadata: {},
    });

    return this.getOverview(user, activityId);
  }

  async replaceAttendance(
    user: CurrentUser,
    activityId: number,
    mealId: number,
    input: ReplaceKitchenMealAttendanceDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const meal = await this.getPlanMeal(plan.id, mealId);
    const existing = await this.mealAttendanceRepository.find({ mealId });
    existing.forEach((row) => this.em.remove(row));
    for (const row of input.rows ?? []) {
      const subgroupName = cleanRequiredText(row.subgroupName, 'Subgrupul');
      const attendance = parseNonNegativeInteger(row.attendance, 'Prezența');
      this.em.persist(
        this.mealAttendanceRepository.create({
          mealId,
          subgroupName,
          attendance,
        }),
      );
    }
    meal.attendanceMode = KitchenAttendanceMode.Custom;
    this.em.persist(meal);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_meal_attendance.replaced',
      entityType: 'kitchen_meal',
      entityId: mealId,
      activityId,
      metadata: { rows: input.rows?.length ?? 0 },
    });

    return this.getOverview(user, activityId);
  }

  async createAdjustment(
    user: CurrentUser,
    activityId: number,
    mealId: number,
    input: CreateKitchenQuantityAdjustmentDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    await this.getPlanMeal(plan.id, mealId);
    const ingredient = await this.getIngredient(input.ingredientId);
    convertKitchenQuantity(input.quantityDelta, input.unit, ingredient);
    const adjustment = this.adjustmentsRepository.create({
      mealId,
      ingredientId: ingredient.id,
      quantityDelta: input.quantityDelta,
      unit: input.unit,
      notes: cleanOptionalText(input.notes),
    });
    this.em.persist(adjustment);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_quantity_adjustment.created',
      entityType: 'kitchen_quantity_adjustment',
      entityId: adjustment.id,
      activityId,
      metadata: { mealId, ingredientId: ingredient.id },
    });

    return this.getOverview(user, activityId);
  }

  async deleteAdjustment(
    user: CurrentUser,
    activityId: number,
    adjustmentId: number,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const adjustment = await this.adjustmentsRepository.findOne({
      id: adjustmentId,
    });
    if (!adjustment) {
      throw new NotFoundException('Ajustarea nu există.');
    }
    await this.getPlanMeal(plan.id, adjustment.mealId);
    this.em.remove(adjustment);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_quantity_adjustment.deleted',
      entityType: 'kitchen_quantity_adjustment',
      entityId: adjustmentId,
      activityId,
      metadata: {},
    });

    return this.getOverview(user, activityId);
  }

  async listProcurement(
    user: CurrentUser,
    activityId: number,
  ): Promise<KitchenProcurementEventDto[]> {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanReadKitchen(user, activity);
    const state = await this.loadPlanState(plan, activity);
    return this.serializeProcurementEvents(state);
  }

  async createProcurementEvent(
    user: CurrentUser,
    activityId: number,
    input: UpsertKitchenProcurementEventDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const event = this.procurementEventsRepository.create({
      kitchenPlanId: plan.id,
      name: cleanRequiredText(input.name, 'Numele aprovizionării'),
      supplier: cleanOptionalText(input.supplier),
      date: parseOptionalDate(input.date),
      method: input.method ?? KitchenProcurementMethod.SelfPurchase,
      status: input.status ?? KitchenProcurementStatus.Planned,
      notes: cleanOptionalText(input.notes),
    });
    this.em.persist(event);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_procurement_event.created',
      entityType: 'kitchen_procurement_event',
      entityId: event.id,
      activityId,
      metadata: { name: event.name, supplier: event.supplier },
    });

    return this.listProcurement(user, activityId);
  }

  async updateProcurementEvent(
    user: CurrentUser,
    activityId: number,
    eventId: number,
    input: UpsertKitchenProcurementEventDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const event = await this.getPlanProcurementEvent(plan.id, eventId);
    event.name = cleanRequiredText(input.name, 'Numele aprovizionării');
    event.supplier = cleanOptionalText(input.supplier);
    event.date = parseOptionalDate(input.date);
    event.method = input.method ?? event.method;
    event.status = input.status ?? event.status;
    event.notes = cleanOptionalText(input.notes);
    this.em.persist(event);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_procurement_event.updated',
      entityType: 'kitchen_procurement_event',
      entityId: event.id,
      activityId,
      metadata: { name: event.name, supplier: event.supplier },
    });

    return this.listProcurement(user, activityId);
  }

  async deleteProcurementEvent(
    user: CurrentUser,
    activityId: number,
    eventId: number,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const event = await this.getPlanProcurementEvent(plan.id, eventId);
    const [items, documents] = await Promise.all([
      this.procurementItemsRepository.find({ procurementEventId: event.id }),
      this.procurementDocumentsRepository.find({
        procurementEventId: event.id,
      }),
    ]);
    [...items, ...documents, event].forEach((entity) => this.em.remove(entity));
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_procurement_event.deleted',
      entityType: 'kitchen_procurement_event',
      entityId: event.id,
      activityId,
      metadata: { name: event.name },
    });

    return this.listProcurement(user, activityId);
  }

  async addProcurementItem(
    user: CurrentUser,
    activityId: number,
    eventId: number,
    input: UpsertKitchenProcurementItemDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const event = await this.getPlanProcurementEvent(plan.id, eventId);
    const ingredient = await this.getIngredient(input.ingredientId);
    convertKitchenQuantity(input.quantity, input.unit, ingredient);
    const item = this.procurementItemsRepository.create({
      procurementEventId: event.id,
      ingredientId: ingredient.id,
      quantity: parsePositiveNumber(input.quantity, 'Cantitatea'),
      unit: input.unit,
      estimatedUnitPrice: input.estimatedUnitPrice,
      estimatedTotalCost: input.estimatedTotalCost,
      realUnitPrice: input.realUnitPrice,
      realTotalCost: input.realTotalCost,
      notes: cleanOptionalText(input.notes),
    });
    this.em.persist(item);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_procurement_item.created',
      entityType: 'kitchen_procurement_item',
      entityId: item.id,
      activityId,
      metadata: { procurementEventId: event.id, ingredientId: ingredient.id },
    });

    return this.listProcurement(user, activityId);
  }

  async updateProcurementItem(
    user: CurrentUser,
    activityId: number,
    itemId: number,
    input: UpsertKitchenProcurementItemDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const item = await this.getPlanProcurementItem(plan.id, itemId);
    const ingredient = await this.getIngredient(input.ingredientId);
    convertKitchenQuantity(input.quantity, input.unit, ingredient);
    item.ingredientId = ingredient.id;
    item.quantity = parsePositiveNumber(input.quantity, 'Cantitatea');
    item.unit = input.unit;
    item.estimatedUnitPrice = input.estimatedUnitPrice;
    item.estimatedTotalCost = input.estimatedTotalCost;
    item.realUnitPrice = input.realUnitPrice;
    item.realTotalCost = input.realTotalCost;
    item.notes = cleanOptionalText(input.notes);
    this.em.persist(item);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_procurement_item.updated',
      entityType: 'kitchen_procurement_item',
      entityId: item.id,
      activityId,
      metadata: {
        procurementEventId: item.procurementEventId,
        ingredientId: ingredient.id,
      },
    });

    return this.listProcurement(user, activityId);
  }

  async deleteProcurementItem(
    user: CurrentUser,
    activityId: number,
    itemId: number,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const item = await this.getPlanProcurementItem(plan.id, itemId);
    this.em.remove(item);
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_procurement_item.deleted',
      entityType: 'kitchen_procurement_item',
      entityId: item.id,
      activityId,
      metadata: {
        procurementEventId: item.procurementEventId,
        ingredientId: item.ingredientId,
      },
    });

    return this.listProcurement(user, activityId);
  }

  async addRemainingToProcurement(
    user: CurrentUser,
    activityId: number,
    eventId: number,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageKitchen(user, activity);
    const event = await this.getPlanProcurementEvent(plan.id, eventId);
    const state = await this.loadPlanState(plan, activity);
    const needs = this.calculationService.calculateIngredientNeeds(state);
    for (const need of needs.filter((item) => item.remainingQuantity > 0)) {
      this.em.persist(
        this.procurementItemsRepository.create({
          procurementEventId: event.id,
          ingredientId: need.ingredientId,
          quantity: need.remainingQuantity,
          unit: need.unit,
          estimatedTotalCost: need.estimatedCost,
        }),
      );
    }
    await this.em.flush();
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_procurement_items.added_from_meal_plan',
      entityType: 'kitchen_procurement_event',
      entityId: event.id,
      activityId,
      metadata: { itemCount: needs.length },
    });

    return this.listProcurement(user, activityId);
  }

  async linkProcurementDocument(
    user: CurrentUser,
    activityId: number,
    eventId: number,
    input: LinkProcurementDocumentDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageProcurementDocuments(user, activity);
    const event = await this.getPlanProcurementEvent(plan.id, eventId);
    const document = await this.documentsRepository.findOne({
      id: input.financialDocumentId,
    });
    if (!document || document.activityId !== activityId) {
      throw new BadRequestException(
        'Documentul financiar trebuie să fie legat de această activitate.',
      );
    }
    const existing = await this.procurementDocumentsRepository.findOne({
      procurementEventId: event.id,
      financialDocumentId: document.id,
    });
    if (!existing) {
      this.em.persist(
        this.procurementDocumentsRepository.create({
          procurementEventId: event.id,
          financialDocumentId: document.id,
        }),
      );
      await this.em.flush();
    }
    await this.auditService.record({
      actorId: user.id,
      action: 'kitchen_procurement_document.linked',
      entityType: 'kitchen_procurement_event',
      entityId: event.id,
      activityId,
      metadata: { financialDocumentId: document.id },
    });

    return this.listProcurement(user, activityId);
  }

  async uploadProcurementDocument(
    user: CurrentUser,
    activityId: number,
    eventId: number,
    input: UploadProcurementDocumentDto,
  ) {
    const { activity, plan } = await this.getOrCreatePlan(user, activityId);
    this.ensureCanManageProcurementDocuments(user, activity);
    const event = await this.getPlanProcurementEvent(plan.id, eventId);
    const document = await this.financeService.createDocument(user, {
      ...(input as CreateFinancialDocumentDto),
      activityId,
      notes: cleanOptionalText(input.notes) ?? `Aprovizionare: ${event.name}`,
    });
    await this.linkProcurementDocument(user, activityId, eventId, {
      financialDocumentId: document.id,
    });

    return document;
  }

  async ingredientCsv(user: CurrentUser, activityId: number) {
    const overview = await this.getOverview(user, activityId);
    return this.csv(
      [
        'Ingredient',
        'Categorie',
        'Total necesar',
        'Cantitate aprovizionată',
        'Cantitate rămasă',
        'Unitate',
        'Cost estimat',
      ],
      overview.ingredientNeeds.map((need) => [
        need.ingredientName,
        need.category,
        need.neededQuantity,
        need.procuredQuantity,
        need.remainingQuantity,
        need.unit,
        need.estimatedCost,
      ]),
    );
  }

  async procurementCsv(
    user: CurrentUser,
    activityId: number,
    eventId?: number,
  ) {
    const events = await this.listProcurement(user, activityId);
    const selectedEvents = eventId
      ? events.filter((event) => event.id === eventId)
      : events;
    return this.csv(
      [
        'Aprovizionare',
        'Furnizor',
        'Data',
        'Status',
        'Ingredient',
        'Cantitate',
        'Unitate',
        'Preț estimat',
        'Preț real',
      ],
      selectedEvents.flatMap((event) =>
        event.items.map((item) => [
          event.name,
          event.supplier ?? '',
          event.date ?? '',
          event.status,
          item.ingredientName,
          item.quantity,
          item.unit,
          item.estimatedTotalCost ?? '',
          item.realTotalCost ?? '',
        ]),
      ),
    );
  }

  private async getOrCreatePlan(user: CurrentUser, activityId: number) {
    const activity = await this.getActivity(activityId);
    this.ensureCanReadKitchen(user, activity);
    const existing = await this.plansRepository.findOne({ activityId });
    if (existing) {
      return { activity, plan: existing, created: false };
    }

    const plan = this.plansRepository.create({
      activityId,
      defaultParticipantCount: 0,
    });
    this.em.persist(plan);
    await this.em.flush();
    await this.ensureDaysForActivity(plan, activity);

    return { activity, plan, created: true };
  }

  private async ensureDaysForActivity(
    plan: KitchenPlan,
    activity: Activity,
    markOutsideDates = false,
  ) {
    if (!activity.startDate || !activity.endDate) {
      return { added: 0, markedOutside: 0 };
    }

    const desiredDates = new Set(
      enumerateDates(activity.startDate, activity.endDate).map((date) =>
        dateKey(date),
      ),
    );
    const existingDays = await this.daysRepository.find({
      kitchenPlanId: plan.id,
    });
    const existingDates = new Set(existingDays.map((day) => dateKey(day.date)));
    let added = 0;
    let markedOutside = 0;

    for (const date of desiredDates) {
      if (!existingDates.has(date)) {
        this.em.persist(
          this.daysRepository.create({
            kitchenPlanId: plan.id,
            date: new Date(`${date}T00:00:00.000Z`),
            dateStatus: KitchenDayStatus.Current,
          }),
        );
        added += 1;
      }
    }

    if (markOutsideDates) {
      for (const day of existingDays) {
        const status: string = desiredDates.has(dateKey(day.date))
          ? KitchenDayStatus.Current
          : KitchenDayStatus.OutsideActivityDates;
        if (day.dateStatus !== status) {
          day.dateStatus = status as KitchenDayStatus;
          this.em.persist(day);
          if (status === outsideActivityDatesStatus) {
            markedOutside += 1;
          }
        }
      }
    }

    await this.em.flush();
    return { added, markedOutside };
  }

  private async loadPlanState(
    plan: KitchenPlan,
    activity: Activity,
  ): Promise<PlanState> {
    const days = await this.daysRepository.find(
      { kitchenPlanId: plan.id },
      { orderBy: { date: 'asc' } },
    );
    const dayIds = days.map((day) => day.id);
    const meals = dayIds.length
      ? await this.mealsRepository.find(
          { kitchenDayId: { $in: dayIds } },
          { orderBy: { sortOrder: 'asc', id: 'asc' } },
        )
      : [];
    const mealIds = meals.map((meal) => meal.id);
    const mealRecipes = mealIds.length
      ? await this.mealRecipesRepository.find({ mealId: { $in: mealIds } })
      : [];
    const mealAttendance = mealIds.length
      ? await this.mealAttendanceRepository.find({ mealId: { $in: mealIds } })
      : [];
    const adjustments = mealIds.length
      ? await this.adjustmentsRepository.find({ mealId: { $in: mealIds } })
      : [];
    const procurementEvents = await this.procurementEventsRepository.find(
      { kitchenPlanId: plan.id },
      { orderBy: { date: 'asc', id: 'asc' } },
    );
    const procurementEventIds = procurementEvents.map((event) => event.id);
    const procurementItems = procurementEventIds.length
      ? await this.procurementItemsRepository.find({
          procurementEventId: { $in: procurementEventIds },
        })
      : [];
    const procurementDocuments = procurementEventIds.length
      ? await this.procurementDocumentsRepository.find({
          procurementEventId: { $in: procurementEventIds },
        })
      : [];

    return {
      plan,
      activity,
      days,
      meals,
      mealRecipes,
      mealAttendance,
      adjustments,
      ingredients: await this.ingredientsRepository.findAll(),
      recipes: await this.recipesRepository.findAll(),
      recipeIngredients: await this.recipeIngredientsRepository.findAll(),
      estimates: await this.estimatesRepository.find({
        kitchenPlanId: plan.id,
      }),
      procurementEvents,
      procurementItems,
      procurementDocuments,
    };
  }

  private serializeOverview(state: PlanState): KitchenOverviewDto {
    return {
      plan: this.serializePlan(state.plan, state.activity),
      days: state.days.map((day) => this.serializeDay(day)),
      meals: this.serializeMeals(state),
      ingredientNeeds: this.calculationService.calculateIngredientNeeds(state),
    };
  }

  private serializePlan(plan: KitchenPlan, activity: Activity): KitchenPlanDto {
    return {
      id: plan.id,
      activityId: plan.activityId,
      defaultParticipantCount: plan.defaultParticipantCount,
      hasCompleteActivityDates: Boolean(activity.startDate && activity.endDate),
    };
  }

  private serializeDay(day: KitchenDay): KitchenDayDto {
    return {
      id: day.id,
      date: dateKey(day.date),
      dateStatus: day.dateStatus,
    };
  }

  private serializeMeals(state: PlanState): KitchenMealDto[] {
    const recipes = new Map(state.recipes.map((recipe) => [recipe.id, recipe]));
    const ingredients = new Map(
      state.ingredients.map((ingredient) => [ingredient.id, ingredient]),
    );
    const mealRecipes = this.groupBy(state.mealRecipes, (item) => item.mealId);
    const mealAttendance = this.groupBy(
      state.mealAttendance,
      (item) => item.mealId,
    );
    const adjustments = this.groupBy(state.adjustments, (item) => item.mealId);

    return state.meals.map((meal) => ({
      id: meal.id,
      kitchenDayId: meal.kitchenDayId,
      slot: meal.slot,
      context: meal.context ?? undefined,
      name: meal.name ?? undefined,
      sortOrder: meal.sortOrder,
      attendanceMode: meal.attendanceMode,
      attendanceTotal: this.calculationService.mealAttendance(
        state.plan,
        meal,
        mealAttendance.get(meal.id) ?? [],
      ),
      recipes: (mealRecipes.get(meal.id) ?? []).map((mealRecipe) =>
        this.serializeMealRecipe(mealRecipe, recipes),
      ),
      attendance: (mealAttendance.get(meal.id) ?? []).map((attendance) =>
        this.serializeAttendance(attendance),
      ),
      adjustments: (adjustments.get(meal.id) ?? []).map((adjustment) =>
        this.serializeAdjustment(adjustment, ingredients),
      ),
    }));
  }

  private serializeIngredient(
    ingredient: KitchenIngredient,
  ): KitchenIngredientDto {
    return {
      id: ingredient.id,
      legacySourceId: ingredient.legacySourceId ?? undefined,
      name: ingredient.name,
      category: ingredient.category,
      unitFamily: ingredient.unitFamily,
      defaultUnit: ingredient.defaultUnit,
      defaultPricePerUnit: ingredient.defaultPricePerUnit,
    };
  }

  private serializeRecipes(
    recipes: KitchenRecipe[],
    recipeIngredients: KitchenRecipeIngredient[],
    ingredients: KitchenIngredient[],
  ): KitchenRecipeDto[] {
    const ingredientsById = new Map(
      ingredients.map((ingredient) => [ingredient.id, ingredient]),
    );
    const byRecipe = this.groupBy(
      recipeIngredients,
      (recipeIngredient) => recipeIngredient.recipeId,
    );

    return recipes.map((recipe) => ({
      id: recipe.id,
      legacySourceId: recipe.legacySourceId ?? undefined,
      name: recipe.name,
      description: recipe.description ?? undefined,
      servings: recipe.servings,
      ingredients: (byRecipe.get(recipe.id) ?? []).map((recipeIngredient) =>
        this.serializeRecipeIngredient(recipeIngredient, ingredientsById),
      ),
    }));
  }

  private serializeRecipeIngredient(
    recipeIngredient: KitchenRecipeIngredient,
    ingredients: Map<number, KitchenIngredient>,
  ): KitchenRecipeIngredientDto {
    const ingredient = ingredients.get(recipeIngredient.ingredientId);
    return {
      id: recipeIngredient.id,
      ingredientId: recipeIngredient.ingredientId,
      ingredientName:
        ingredient?.name ?? `Ingredient #${recipeIngredient.ingredientId}`,
      quantity: recipeIngredient.quantity,
      unit: recipeIngredient.unit,
    };
  }

  private serializeMealRecipe(
    mealRecipe: KitchenMealRecipe,
    recipes: Map<number, KitchenRecipe>,
  ): KitchenMealRecipeDto {
    const recipe = recipes.get(mealRecipe.recipeId);
    return {
      id: mealRecipe.id,
      mealId: mealRecipe.mealId,
      recipeId: mealRecipe.recipeId,
      recipeName: recipe?.name ?? `Rețetă #${mealRecipe.recipeId}`,
      servings: recipe?.servings ?? 0,
      servingOverride: mealRecipe.servingOverride ?? undefined,
      scalingMode: mealRecipe.scalingMode,
    };
  }

  private serializeAttendance(
    attendance: KitchenMealAttendance,
  ): KitchenMealAttendanceDto {
    return {
      id: attendance.id,
      subgroupName: attendance.subgroupName,
      attendance: attendance.attendance,
    };
  }

  private serializeAdjustment(
    adjustment: KitchenQuantityAdjustment,
    ingredients: Map<number, KitchenIngredient>,
  ): KitchenQuantityAdjustmentDto {
    return {
      id: adjustment.id,
      mealId: adjustment.mealId,
      ingredientId: adjustment.ingredientId,
      ingredientName:
        ingredients.get(adjustment.ingredientId)?.name ??
        `Ingredient #${adjustment.ingredientId}`,
      quantityDelta: adjustment.quantityDelta,
      unit: adjustment.unit,
      notes: adjustment.notes ?? undefined,
    };
  }

  private serializeProcurementEvents(
    state: PlanState,
  ): KitchenProcurementEventDto[] {
    const ingredients = new Map(
      state.ingredients.map((ingredient) => [ingredient.id, ingredient]),
    );
    const items = this.groupBy(
      state.procurementItems,
      (item) => item.procurementEventId,
    );
    const documents = this.groupBy(
      state.procurementDocuments,
      (document) => document.procurementEventId,
    );

    return state.procurementEvents.map((event) => ({
      id: event.id,
      kitchenPlanId: event.kitchenPlanId,
      name: event.name,
      supplier: event.supplier ?? undefined,
      date: event.date?.toISOString(),
      method: event.method,
      status: event.status,
      notes: event.notes ?? undefined,
      items: (items.get(event.id) ?? []).map((item) =>
        this.serializeProcurementItem(item, ingredients),
      ),
      documents: (documents.get(event.id) ?? []).map((document) =>
        this.serializeProcurementDocument(document),
      ),
    }));
  }

  private serializeProcurementItem(
    item: KitchenProcurementItem,
    ingredients: Map<number, KitchenIngredient>,
  ): KitchenProcurementItemDto {
    return {
      id: item.id,
      procurementEventId: item.procurementEventId,
      ingredientId: item.ingredientId,
      ingredientName:
        ingredients.get(item.ingredientId)?.name ??
        `Ingredient #${item.ingredientId}`,
      quantity: item.quantity,
      unit: item.unit,
      estimatedUnitPrice: item.estimatedUnitPrice ?? undefined,
      estimatedTotalCost: item.estimatedTotalCost ?? undefined,
      realUnitPrice: item.realUnitPrice ?? undefined,
      realTotalCost: item.realTotalCost ?? undefined,
      notes: item.notes ?? undefined,
    };
  }

  private serializeProcurementDocument(
    document: KitchenProcurementDocument,
  ): KitchenProcurementDocumentDto {
    return {
      id: document.id,
      procurementEventId: document.procurementEventId,
      financialDocumentId: document.financialDocumentId,
    };
  }

  private async replaceRecipeIngredients(
    recipeId: number,
    inputs: UpsertKitchenRecipeDto['ingredients'],
  ) {
    const existing = await this.recipeIngredientsRepository.find({ recipeId });
    existing.forEach((item) => this.em.remove(item));

    for (const input of inputs ?? []) {
      const ingredient = await this.getIngredient(input.ingredientId);
      convertKitchenQuantity(input.quantity, input.unit, ingredient);
      this.em.persist(
        this.recipeIngredientsRepository.create({
          recipeId,
          ingredientId: ingredient.id,
          quantity: parsePositiveNumber(input.quantity, 'Cantitatea'),
          unit: input.unit,
        }),
      );
    }
    await this.em.flush();
  }

  private async getActivity(activityId: number) {
    const activity = await this.activitiesRepository.findOne({
      id: activityId,
    });
    if (!activity) {
      throw new NotFoundException('Activitatea nu există.');
    }

    return activity;
  }

  private async getIngredient(ingredientId: number) {
    const ingredient = await this.ingredientsRepository.findOne({
      id: ingredientId,
    });
    if (!ingredient) {
      throw new NotFoundException('Ingredientul nu există.');
    }

    return ingredient;
  }

  private async getRecipe(recipeId: number) {
    const recipe = await this.recipesRepository.findOne({ id: recipeId });
    if (!recipe) {
      throw new NotFoundException('Rețeta nu există.');
    }

    return recipe;
  }

  private async getPlanDay(planId: number, dayId: number) {
    const day = await this.daysRepository.findOne({
      id: dayId,
      kitchenPlanId: planId,
    });
    if (!day) {
      throw new NotFoundException('Ziua de bucătărie nu există.');
    }

    return day;
  }

  private async getPlanMeal(planId: number, mealId: number) {
    const meal = await this.mealsRepository.findOne({ id: mealId });
    if (!meal) {
      throw new NotFoundException('Masa nu există.');
    }

    await this.getPlanDay(planId, meal.kitchenDayId);
    return meal;
  }

  private async getPlanProcurementEvent(planId: number, eventId: number) {
    const event = await this.procurementEventsRepository.findOne({
      id: eventId,
      kitchenPlanId: planId,
    });
    if (!event) {
      throw new NotFoundException('Aprovizionarea nu există.');
    }

    return event;
  }

  private async getPlanProcurementItem(planId: number, itemId: number) {
    const item = await this.procurementItemsRepository.findOne({ id: itemId });
    if (!item) {
      throw new NotFoundException('Linia de aprovizionare nu există.');
    }

    await this.getPlanProcurementEvent(planId, item.procurementEventId);
    return item;
  }

  private async nextMealSortOrder(dayId: number, slot: KitchenMealSlot) {
    const meals = await this.mealsRepository.find({
      kitchenDayId: dayId,
      slot,
    });
    return meals.length;
  }

  private ensureCanReadKitchen(user: CurrentUser, activity: Activity) {
    if (
      activity.coordinatorId !== user.id &&
      !user.roles.includes(UserRole.FinanceManager) &&
      !user.roles.includes(UserRole.SuperAdmin)
    ) {
      throw new ForbiddenException('Nu ai acces la bucătăria activității.');
    }
  }

  private ensureCanManageKitchen(user: CurrentUser, activity: Activity) {
    if (
      activity.coordinatorId !== user.id &&
      !user.roles.includes(UserRole.SuperAdmin)
    ) {
      throw new ForbiddenException(
        'Nu poți modifica planul de bucătărie al acestei activități.',
      );
    }
  }

  private ensureCanManageProcurementDocuments(
    user: CurrentUser,
    activity: Activity,
  ) {
    if (
      activity.coordinatorId !== user.id &&
      !user.roles.includes(UserRole.FinanceManager) &&
      !user.roles.includes(UserRole.SuperAdmin)
    ) {
      throw new ForbiddenException(
        'Nu poți modifica documentele de aprovizionare.',
      );
    }
  }

  private csv(
    headers: Array<string | number>,
    rows: Array<Array<string | number>>,
  ) {
    return [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? '');
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\n');
  }

  private groupBy<T, TKey>(items: T[], key: (item: T) => TKey) {
    const groups = new Map<TKey, T[]>();
    for (const item of items) {
      const groupKey = key(item);
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), item]);
    }

    return groups;
  }
}
