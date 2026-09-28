"use client";

import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import esLocale from "@fullcalendar/core/locales/es";
import type { DateSelectArg, EventClickArg, EventContentArg, EventDropArg, EventInput } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { bogotaFloating, capitalize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/components/calendar/types";
import { Button } from "@/components/ui/button";

type ViewType = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

const VIEWS: { value: ViewType; label: string }[] = [
  { value: "dayGridMonth", label: "Mes" },
  { value: "timeGridWeek", label: "Semana" },
  { value: "timeGridDay", label: "Día" },
];

/**
 * El calendario trabaja en "UTC" con horas de pared de Bogotá: así lo que se ve
 * es siempre la hora de Colombia, sin importar la zona del navegador.
 */
function wallToISO(date: Date) {
  return `${date.toISOString().slice(0, 19)}-05:00`;
}

function wallDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function wallTime(date: Date) {
  return date.toISOString().slice(11, 16);
}

export interface SlotSelection {
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
}

export interface MoveRequest {
  item: CalendarItem;
  startISO: string;
  endISO: string | null;
  date: string;
  allDay: boolean;
  revert: () => void;
}

export default function CalendarBoard({
  items,
  onItemClick,
  onSelectSlot,
  onMove,
}: {
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
  onSelectSlot: (slot: SlotSelection) => void;
  onMove: (move: MoveRequest) => void;
}) {
  const ref = useRef<FullCalendar>(null);
  const [title, setTitle] = useState("");
  const [view, setView] = useState<ViewType>("dayGridMonth");

  const events = useMemo<EventInput[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        start: item.start,
        end: item.end,
        allDay: item.allDay,
        editable: Boolean(item.editable),
        durationEditable: item.type === "meeting" && Boolean(item.editable),
        classNames: ["mf-ev", `mf-ev-${item.type}`, item.muted ? "mf-ev-muted" : ""].filter(Boolean),
        extendedProps: { item },
      })),
    [items],
  );

  const api = () => ref.current?.getApi();

  const changeView = (next: ViewType) => {
    api()?.changeView(next);
  };

  const handleSelect = (arg: DateSelectArg) => {
    api()?.unselect();
    if (arg.allDay) {
      onSelectSlot({ fecha: wallDate(arg.start) });
      return;
    }
    onSelectSlot({ fecha: wallDate(arg.start), hora_inicio: wallTime(arg.start), hora_fin: wallTime(arg.end) });
  };

  const handleClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    onItemClick(arg.event.extendedProps.item as CalendarItem);
  };

  const handleMove = (arg: EventDropArg | EventResizeDoneArg) => {
    const item = arg.event.extendedProps.item as CalendarItem;
    const start = arg.event.start;
    if (!start) return arg.revert();
    onMove({
      item,
      startISO: wallToISO(start),
      endISO: arg.event.end ? wallToISO(arg.event.end) : null,
      date: wallDate(start),
      allDay: arg.event.allDay,
      revert: arg.revert,
    });
  };

  const renderContent = (arg: EventContentArg) => {
    const item = arg.event.extendedProps.item as CalendarItem;
    return (
      <div className="mf-ev-inner">
        <span className="mf-ev-dot" style={item.color ? { backgroundColor: item.color } : undefined} />
        {!arg.event.allDay && arg.timeText && <span className="mf-ev-time">{arg.timeText}</span>}
        <span className="mf-ev-title">{arg.event.title}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => api()?.today()}>
            Hoy
          </Button>
          <div className="flex">
            <Button variant="ghost" size="icon-sm" onClick={() => api()?.prev()} aria-label="Anterior">
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => api()?.next()} aria-label="Siguiente">
              <ChevronRight />
            </Button>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{capitalize(title)}</h2>
        </div>
        <div className="inline-flex w-fit rounded-lg bg-muted p-[3px]" role="tablist" aria-label="Vista del calendario">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => changeView(v.value)}
              className={cn(
                "h-7 rounded-md px-3 text-[13px] font-medium transition-colors",
                view === v.value
                  ? "bg-background text-foreground shadow-sm dark:bg-input/40"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mf-calendar overflow-hidden rounded-xl border bg-card shadow-card">
        <FullCalendar
          ref={ref}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          locale={esLocale}
          timeZone="UTC"
          now={() => bogotaFloating(new Date())}
          initialView="dayGridMonth"
          headerToolbar={false}
          height="auto"
          firstDay={1}
          fixedWeekCount={false}
          dayMaxEvents={3}
          eventDisplay="block"
          nowIndicator
          selectable
          selectMirror
          editable={false}
          events={events}
          eventContent={renderContent}
          eventClick={handleClick}
          eventDrop={handleMove}
          eventResize={handleMove}
          select={handleSelect}
          eventDidMount={(arg) => {
            const item = arg.event.extendedProps.item as CalendarItem;
            arg.el.title = item.subtitle ? `${item.title}\n${item.subtitle}` : item.title;
          }}
          datesSet={(arg) => {
            setTitle(arg.view.title);
            setView(arg.view.type as ViewType);
          }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          scrollTime="08:00:00"
          allDayText="Todo el día"
          slotLabelFormat={{ hour: "numeric", meridiem: "short" }}
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          dayHeaderFormat={view === "dayGridMonth" ? { weekday: "short" } : { weekday: "short", day: "numeric" }}
          moreLinkText={(n) => `+${n} más`}
        />
      </div>
    </div>
  );
}
