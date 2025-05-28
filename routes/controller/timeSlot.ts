import { Request, Response, NextFunction } from "express";
import shop from "../../services/database/schema/shop";
import appointment from "../../services/database/schema/appointment";
import { AppointmentStatus } from "../../types/appointment";

export interface TimeSlot {
    time: string;
    available: boolean;
    conflictReason?: string;
}

export interface AvailableTimeSlotsResponse {
    shopId: string;
    date: string;
    openTime: string;
    closeTime: string;
    timeSlots: TimeSlot[];
    totalAvailable: number;
}

export class TimeSlotController {
    /**
     * Get available time slots for a specific shop on a given date
     */
    static getAvailableTimeSlots = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { shopId } = req.params;
            const { date, serviceDuration = 30 } = req.query;

            if (!shopId || !date) {
                return res.status(400).json({
                    message: "Shop ID and date are required"
                });
            }

            // Validate and parse date
            const selectedDate = new Date(date as string);
            if (isNaN(selectedDate.getTime())) {
                return res.status(400).json({
                    message: "Invalid date format"
                });
            }

            // Check if date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            selectedDate.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                return res.status(400).json({
                    message: "Cannot book appointments for past dates"
                });
            }

            // Find the shop
            const barberShop = await shop.findById(shopId);
            if (!barberShop) {
                return res.status(404).json({
                    message: "Shop not found"
                });
            }

            // Check if shop has operating hours
            if (!barberShop.open_time || !barberShop.close_time) {
                return res.status(400).json({
                    message: "Shop operating hours not set"
                });
            }

            const duration = parseInt(serviceDuration as string);
            const timeSlots = await TimeSlotController.generateTimeSlots(
                shopId,
                selectedDate,
                barberShop.open_time,
                barberShop.close_time,
                duration
            );

            const availableCount = timeSlots.filter(slot => slot.available).length;

            const response: AvailableTimeSlotsResponse = {
                shopId,
                date: selectedDate.toISOString().split('T')[0],
                openTime: barberShop.open_time,
                closeTime: barberShop.close_time,
                timeSlots,
                totalAvailable: availableCount
            };

            res.status(200).json({
                success: true,
                data: response
            });

        } catch (error) {
            console.error('Error getting available time slots:', error);
            next(error);
        }
    };

    /**
     * Generate time slots between open and close time, marking availability
     */
    private static async generateTimeSlots(
        shopId: string,
        date: Date,
        openTime: string,
        closeTime: string,
        serviceDuration: number = 30
    ): Promise<TimeSlot[]> {
        const timeSlots: TimeSlot[] = [];
        
        // Parse open and close times
        const openHour = TimeSlotController.parseTime(openTime);
        const closeHour = TimeSlotController.parseTime(closeTime);
        
        if (!openHour || !closeHour) {
            throw new Error("Invalid shop operating hours format");
        }

        // Get existing appointments for the date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const existingAppointments = await appointment.find({
            shopId,
            appointmentDate: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: {
                $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED]
            }
        }).select('appointmentDate totalDuration');

        // Generate time slots in 30-minute intervals
        const intervalMinutes = 30;
        let currentTime = openHour;

        while (currentTime.hour < closeHour.hour || 
               (currentTime.hour === closeHour.hour && currentTime.minute < closeHour.minute)) {
            
            // Check if there's enough time for the service before closing
            const endTimeMinutes = currentTime.hour * 60 + currentTime.minute + serviceDuration;
            const closeTimeMinutes = closeHour.hour * 60 + closeHour.minute;
            
            if (endTimeMinutes <= closeTimeMinutes) {
                const timeString = TimeSlotController.formatTime(currentTime);
                const slotDateTime = new Date(date);
                slotDateTime.setHours(currentTime.hour, currentTime.minute, 0, 0);
                
                // Check if this time slot conflicts with existing appointments
                const conflict = TimeSlotController.checkTimeSlotConflict(
                    slotDateTime,
                    serviceDuration,
                    existingAppointments
                );

                // Check if the time slot is in the past (for today's bookings)
                const now = new Date();
                const isPastTime = date.toDateString() === now.toDateString() && slotDateTime <= now;

                timeSlots.push({
                    time: timeString,
                    available: !conflict && !isPastTime,
                    conflictReason: conflict ? "Already booked" : isPastTime ? "Past time" : undefined
                });
            }

            // Move to next interval
            currentTime.minute += intervalMinutes;
            if (currentTime.minute >= 60) {
                currentTime.hour += 1;
                currentTime.minute = 0;
            }
        }

        return timeSlots;
    }

    /**
     * Parse time string (e.g., "09:00" or "9:00 AM") to hour and minute
     */
    private static parseTime(timeStr: string): { hour: number; minute: number } | null {
        try {
            // Handle both 24-hour format (09:00) and 12-hour format (9:00 AM)
            const timePattern24 = /^(\d{1,2}):(\d{2})$/;
            const timePattern12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

            let match = timeStr.match(timePattern24);
            if (match) {
                const hour = parseInt(match[1]);
                const minute = parseInt(match[2]);
                if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                    return { hour, minute };
                }
            }

            match = timeStr.match(timePattern12);
            if (match) {
                let hour = parseInt(match[1]);
                const minute = parseInt(match[2]);
                const period = match[3].toUpperCase();

                if (period === 'PM' && hour !== 12) {
                    hour += 12;
                } else if (period === 'AM' && hour === 12) {
                    hour = 0;
                }

                if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                    return { hour, minute };
                }
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Format time object to string
     */
    private static formatTime(time: { hour: number; minute: number }): string {
        const hour12 = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
        const period = time.hour >= 12 ? 'PM' : 'AM';
        const minute = time.minute.toString().padStart(2, '0');
        return `${hour12}:${minute} ${period}`;
    }

    /**
     * Check if a time slot conflicts with existing appointments
     */
    private static checkTimeSlotConflict(
        slotDateTime: Date,
        serviceDuration: number,
        existingAppointments: any[]
    ): boolean {
        const slotStart = slotDateTime.getTime();
        const slotEnd = slotStart + (serviceDuration * 60 * 1000);

        for (const apt of existingAppointments) {
            const aptStart = new Date(apt.appointmentDate).getTime();
            const aptEnd = aptStart + (apt.totalDuration * 60 * 1000);

            // Check if there's any overlap
            if (slotStart < aptEnd && slotEnd > aptStart) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a specific time slot is available
     */
    static checkTimeSlotAvailability = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { shopId } = req.params;
            const { date, time, serviceDuration = 30 } = req.query;

            if (!shopId || !date || !time) {
                return res.status(400).json({
                    message: "Shop ID, date, and time are required"
                });
            }

            const selectedDate = new Date(date as string);
            if (isNaN(selectedDate.getTime())) {
                return res.status(400).json({
                    message: "Invalid date format"
                });
            }

            const barberShop = await shop.findById(shopId);
            if (!barberShop) {
                return res.status(404).json({
                    message: "Shop not found"
                });
            }

            // Parse the requested time
            const timeObj = TimeSlotController.parseTime(time as string);
            if (!timeObj) {
                return res.status(400).json({
                    message: "Invalid time format"
                });
            }

            const slotDateTime = new Date(selectedDate);
            slotDateTime.setHours(timeObj.hour, timeObj.minute, 0, 0);

            // Check if it's within operating hours
            const openTime = TimeSlotController.parseTime(barberShop.open_time || "");
            const closeTime = TimeSlotController.parseTime(barberShop.close_time || "");
            
            if (!openTime || !closeTime) {
                return res.status(400).json({
                    message: "Shop operating hours not properly configured"
                });
            }

            const requestedMinutes = timeObj.hour * 60 + timeObj.minute;
            const openMinutes = openTime.hour * 60 + openTime.minute;
            const closeMinutes = closeTime.hour * 60 + closeTime.minute;
            const duration = parseInt(serviceDuration as string);

            if (requestedMinutes < openMinutes || requestedMinutes + duration > closeMinutes) {
                return res.status(400).json({
                    available: false,
                    message: "Requested time is outside shop operating hours"
                });
            }

            // Check for conflicts
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const existingAppointments = await appointment.find({
                shopId,
                appointmentDate: {
                    $gte: startOfDay,
                    $lte: endOfDay
                },
                status: {
                    $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED]
                }
            }).select('appointmentDate totalDuration');

            const hasConflict = TimeSlotController.checkTimeSlotConflict(
                slotDateTime,
                duration,
                existingAppointments
            );

            // Check if it's in the past
            const now = new Date();
            const isPastTime = selectedDate.toDateString() === now.toDateString() && slotDateTime <= now;

            const available = !hasConflict && !isPastTime;

            res.status(200).json({
                available,
                shopId,
                date: selectedDate.toISOString().split('T')[0],
                time: time as string,
                message: available ? "Time slot is available" : 
                        hasConflict ? "Time slot is already booked" : 
                        isPastTime ? "Cannot book past time slots" : "Time slot not available"
            });

        } catch (error) {
            console.error('Error checking time slot availability:', error);
            next(error);
        }
    };
}
