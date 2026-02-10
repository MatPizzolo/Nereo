"use client";

import { Cloud, CloudRain, Sun, Thermometer, Lightbulb } from "lucide-react";
import type { WeatherData } from "@/lib/types";
import { InlineAlert } from "@/components/shared/inline-alert";

const weatherIcons: Record<string, typeof Sun> = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  default: Thermometer,
};

function getWeatherIcon(icon: string) {
  if (icon.includes("01") || icon.includes("clear")) return weatherIcons.clear;
  if (icon.includes("09") || icon.includes("10") || icon.includes("rain"))
    return weatherIcons.rain;
  if (icon.includes("02") || icon.includes("03") || icon.includes("04") || icon.includes("cloud"))
    return weatherIcons.clouds;
  return weatherIcons.default;
}

export interface WeatherWidgetProps {
  data: WeatherData;
}

export function WeatherWidget({ data }: WeatherWidgetProps) {
  const CurrentIcon = getWeatherIcon(data.current.icon);

  return (
    <div className="rounded-lg border p-6">
      <h3 className="mb-4 text-lg font-semibold">Clima & Sugerencia</h3>

      {/* Current weather */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <CurrentIcon className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-3xl font-bold">{Math.round(data.current.temp)}°C</p>
          <p className="text-sm capitalize text-muted-foreground">
            {data.current.description}
          </p>
        </div>
      </div>

      {/* 3-day forecast */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {data.forecast.slice(0, 3).map((day) => {
          const DayIcon = getWeatherIcon(day.icon);
          return (
            <div
              key={day.date}
              className="flex flex-col items-center rounded-md border p-2 text-center"
            >
              <span className="text-xs text-muted-foreground">
                {new Date(day.date).toLocaleDateString("es-AR", {
                  weekday: "short",
                })}
              </span>
              <DayIcon className="my-1 h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {Math.round(day.temp)}°C
              </span>
            </div>
          );
        })}
      </div>

      {/* AI suggestion */}
      {data.suggestion && (
        <div className="mt-4">
          <InlineAlert variant="info" title="Sugerencia">
            {data.suggestion}
          </InlineAlert>
        </div>
      )}
    </div>
  );
}
