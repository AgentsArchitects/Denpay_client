// Export all services from a single entry point
export { default as authService } from './authService';
export { default as clientService } from './clientService';
export { default as userService } from './userService';
export { default as compassService } from './compassService';
export { default as xeroService } from './xeroService';
export { default as dashboardService } from './dashboardService';

// Export types
export type { LoginData, LoginResponse } from './authService';
export type { Client, ClientUser } from './clientService';
export type { User } from './userService';
export type { CompassDate } from './compassService';
export type { XeroConnection } from './xeroService';
export type { DashboardData } from './dashboardService';
