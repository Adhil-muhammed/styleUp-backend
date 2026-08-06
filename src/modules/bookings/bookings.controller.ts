import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards';
import { CurrentAuth } from '@/common/decorators';
import { AuthenticatedRequest } from '@/common/guards/auth.guard';
import { BookingsService } from '@/modules/bookings/bookings.service';
import {
  GetAvailabilityQueryDto,
  PostBookingsDto,
  PostBookingsPayDto,
  PostBookingsQuoteDto,
  GetBookingsListQueryDto,
  PatchBookingsReminderDto,
  PostBookingsRescheduleDto,
  PostBookingsReviewDto,
} from '@/modules/bookings/dto';

interface ApiSuccess<T> {
  success: true;
  data: T;
}

@ApiTags('Mobile Bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ version: VERSION_NEUTRAL })
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('mobile/v1/shops/:shopId/availability')
  @ApiParam({ name: 'shopId', type: String })
  async getAvailability(
    @Param('shopId') shopId: string,
    @Query() query: GetAvailabilityQueryDto,
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.getAvailability(shopId, query);
    return { success: true, data };
  }

  @Post('mobile/v1/bookings/quote')
  @HttpCode(HttpStatus.OK)
  async postQuote(@Body() dto: PostBookingsQuoteDto): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.computeQuote(dto);
    return { success: true, data };
  }

  /**
   * Creates a pending booking and returns HTTP 402 (PAYMENT_REQUIRED) with the
   * booking payload so the client can proceed to payment without a second fetch.
   */
  @Post('mobile/v1/bookings')
  @HttpCode(HttpStatus.PAYMENT_REQUIRED)
  async createBooking(
    @Body() dto: PostBookingsDto,
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.createBooking(auth.userId, dto);
    return { success: true, data };
  }

  @Get('mobile/v1/payment-methods')
  async getPaymentMethods(
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.getPaymentMethods(auth.userId);
    return { success: true, data };
  }

  @Post('mobile/v1/bookings/:bookingId/pay')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'bookingId', type: String })
  async payBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: PostBookingsPayDto,
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.payBooking(bookingId, auth.userId, dto);
    return { success: true, data };
  }

  @Get('mobile/v1/bookings/:bookingId/payment-status')
  @ApiParam({ name: 'bookingId', type: String })
  async getPaymentStatus(
    @Param('bookingId') bookingId: string,
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.getPaymentStatus(bookingId, auth.userId);
    return { success: true, data };
  }

  @Get('mobile/v1/bookings/:bookingId/confirmation')
  @ApiParam({ name: 'bookingId', type: String })
  async getConfirmation(
    @Param('bookingId') bookingId: string,
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.getConfirmation(bookingId, auth.userId);
    return { success: true, data };
  }

  @Get('mobile/v1/bookings')
  async listBookings(
    @Query() query: GetBookingsListQueryDto,
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.listBookings(auth.userId, query);
    return { success: true, data };
  }

  @Patch('mobile/v1/bookings/:bookingId/reminder')
  @ApiParam({ name: 'bookingId', type: String })
  async patchReminder(
    @Param('bookingId') bookingId: string,
    @Body() dto: PatchBookingsReminderDto,
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.updateReminder(bookingId, auth.userId, dto);
    return { success: true, data };
  }

  @Delete('mobile/v1/bookings/:bookingId')
  @ApiParam({ name: 'bookingId', type: String })
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @CurrentAuth() auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    const data = await this.bookingsService.cancelBooking(bookingId, auth.userId);
    return { success: true, data };
  }

  @Post('mobile/v1/bookings/:bookingId/reschedule')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiParam({ name: 'bookingId', type: String })
  async rescheduleBooking(
    @Param('bookingId') _bookingId: string,
    @Body() _dto: PostBookingsRescheduleDto,
    @CurrentAuth() _auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    this.bookingsService.rescheduleNotImplemented();
  }

  @Post('mobile/v1/bookings/:bookingId/reviews')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  @ApiParam({ name: 'bookingId', type: String })
  async submitReview(
    @Param('bookingId') _bookingId: string,
    @Body() _dto: PostBookingsReviewDto,
    @CurrentAuth() _auth: AuthenticatedRequest['authUser'],
  ): Promise<ApiSuccess<unknown>> {
    this.bookingsService.reviewNotImplemented();
  }
}
