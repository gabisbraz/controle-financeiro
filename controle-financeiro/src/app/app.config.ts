import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideEcharts } from 'ngx-echarts';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideEcharts()]
};
