'use client';

import type { Theme, SxProps } from '@mui/material/styles';
import type { ICalendarEvent, ICalendarFilters } from 'src/types/calendar';

import { useMemo, useCallback, startTransition } from 'react';
import Calendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useBoolean, useSetState } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import * as LottoLibrary from 'src/api/lottolibrary';

import DialogTitle from '@mui/material/DialogTitle';

import { fIsAfter, fIsBetween } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { CALENDAR_COLOR_OPTIONS } from 'src/_mock/_calendar';
import { updateEvent, useGetEvents } from 'src/actions/calendar';

import { Iconify } from 'src/components/iconify';

import { CalendarRoot } from '../styles';
import { useEvent } from '../hooks/use-event';
import { CalendarForm } from '../calendar-form';
import { useCalendar } from '../hooks/use-calendar';
import { CalendarToolbar } from '../calendar-toolbar';
import { CalendarFilters } from '../calendar-filters';
import { CalendarFiltersResult } from '../calendar-filters-result';

// ----------------------------------------------------------------------

export function CalendarView() {
  const theme = useTheme();

  const openFilters = useBoolean();
  const showBonus = useBoolean(true);
  const filterMode = useBoolean(false); // false: All, true: Calendar (matched) mode

  const { events, eventsLoading } = useGetEvents();

  const filters = useSetState<ICalendarFilters>({ colors: [], startDate: null, endDate: null });
  const { state: currentFilters } = filters;

  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const {
    calendarRef,
    /********/
    view,
    title,
    /********/
    onDropEvent,
    onChangeView,
    onSelectRange,
    onClickEvent: baseOnClickEvent,
    onResizeEvent,
    onDateNavigation,
    /********/
    openForm,
    onOpenForm,
    onCloseForm,
    /********/
    selectedRange,
    selectedEventId,
    /********/
    onClickEventInFilters,
  } = useCalendar();

  const lottoEvents = useMemo(
    () =>
      LottoLibrary.getAllLottoNumbers().map((lotto) => ({
        id: `lotto-${lotto.drwNo}`,
        title: `${lotto.drwNo}회`,
        start: lotto.drwNoDate,
        allDay: true,
        display: 'block',
        classNames: ['lotto-event'],
        extendedProps: {
          type: 'lotto',
          numbers: lotto.numbers,
          bonus: lotto.bonus,
          start: lotto.drwNoDate,
        },
      })),
    []
  );

  const currentEvent = useEvent(events, selectedEventId, selectedRange, openForm);

  const canReset =
    currentFilters.colors.length > 0 || (!!currentFilters.startDate && !!currentFilters.endDate);

  const dataFiltered = useMemo(() => {
    const userEvents = applyFilter({
      inputData: events,
      filters: currentFilters,
      dateError,
    });

    let filteredLotto = lottoEvents;

    if (filterMode.value) {
      filteredLotto = lottoEvents.filter((lottoEvent) => {
        const { numbers, bonus, start } = lottoEvent.extendedProps;
        if (!start) return false;

        const [y, m, d] = start.split('-').map(Number);

        const hasMatch =
          numbers.some((n: number) => n === m || n === d) ||
          (showBonus.value && (bonus === m || bonus === d));

        return hasMatch;
      });
    }

    return [...userEvents, ...filteredLotto];
  }, [events, currentFilters, dateError, lottoEvents, filterMode.value, showBonus.value]);

  const handleOnClickEvent = useCallback(
    (arg: any) => {
      if (arg.event.extendedProps.type === 'lotto') {
        return;
      }
      baseOnClickEvent?.(arg);
    },
    [baseOnClickEvent]
  );

  const flexStyles: SxProps<Theme> = {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
  };

  const renderCreateFormDialog = () => (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={openForm}
      onClose={onCloseForm}
      transitionDuration={{
        enter: theme.transitions.duration.shortest,
        exit: theme.transitions.duration.shortest - 80,
      }}
      slotProps={{
        paper: {
          sx: {
            display: 'flex',
            overflow: 'hidden',
            flexDirection: 'column',
            '& form': { ...flexStyles, minHeight: 0 },
          },
        },
      }}
    >
      <DialogTitle sx={{ minHeight: 76 }}>
        {openForm && <> {currentEvent?.id ? 'Edit' : 'Add'} event</>}
      </DialogTitle>

      <CalendarForm
        currentEvent={currentEvent}
        colorOptions={CALENDAR_COLOR_OPTIONS}
        onClose={onCloseForm}
      />
    </Dialog>
  );

  const renderFiltersDrawer = () => (
    <CalendarFilters
      events={events}
      filters={filters}
      canReset={canReset}
      dateError={dateError}
      open={openFilters.value}
      onClose={openFilters.onFalse}
      onClickEvent={onClickEventInFilters}
      colorOptions={CALENDAR_COLOR_OPTIONS}
    />
  );

  const renderResults = () => (
    <CalendarFiltersResult
      filters={filters}
      totalResults={dataFiltered.length}
      sx={{ mb: { xs: 3, md: 5 } }}
    />
  );

  const renderEventContent = (eventInfo: any) => {
    const { event } = eventInfo;

    if (event.extendedProps.type === 'lotto') {
      const { numbers, bonus, start } = event.extendedProps;

      if (!start) return null;

      const [y, m, d] = start.split('-').map(Number);

      const renderBall = (num: number, isBonus = false) => (
        <Box
          key={isBonus ? `bonus-${num}` : num}
          sx={{
            width: { xs: 12, sm: 16, md: 22 },
            height: { xs: 12, sm: 16, md: 22 },
            borderRadius: '50%',
            bgcolor: LottoLibrary.getBallColor(num),
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: { xs: 6, sm: 8, md: 10 },
            fontWeight: 'bold',
            boxShadow: '1px 1px 2px rgba(0,0,0,0.2)',
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%), ${LottoLibrary.getBallColor(
              num
            )}`,
          }}
        >
          {num}
        </Box>
      );

      if (!filterMode.value) {
        return (
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 0.1, sm: 0.2 },
              justifyContent: 'center',
              alignItems: 'center',
              width: 1,
              height: 1,
              py: 0.5,
            }}
          >
            {numbers.map((num: number) => renderBall(num))}
            {showBonus.value && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: { xs: 8, sm: 10 },
                    color: 'text.secondary',
                    mx: { xs: 0.1, sm: 0.2 },
                  }}
                >
                  +
                </Typography>
                {renderBall(bonus, true)}
              </>
            )}
          </Box>
        );
      }

      const mMatches = numbers.filter((n: number) => n === m);
      const dMatches = numbers.filter((n: number) => n === d);
      const bMatchM = showBonus.value && bonus === m;
      const bMatchD = showBonus.value && bonus === d;

      return (
        <Stack spacing={0.2} sx={{ py: 0.5, alignItems: 'center' }}>
          {(mMatches.length > 0 || bMatchM) && (
            <Stack direction="row" spacing={0.4} alignItems="center">
              <Box
                sx={{
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 0.4,
                  bgcolor: 'info.main',
                  color: 'info.contrastText',
                  fontSize: { xs: 7, sm: 9 },
                  fontWeight: 'bold',
                  lineHeight: 1,
                }}
              >
                월
              </Box>
              {mMatches.map((num: number) => renderBall(num))}
              {bMatchM && renderBall(bonus, true)}
            </Stack>
          )}
          {(dMatches.length > 0 || bMatchD) && (
            <Stack direction="row" spacing={0.4} alignItems="center">
              <Box
                sx={{
                  px: 0.5,
                  py: 0.1,
                  borderRadius: 0.4,
                  bgcolor: 'warning.main',
                  color: 'warning.contrastText',
                  fontSize: { xs: 7, sm: 9 },
                  fontWeight: 'bold',
                  lineHeight: 1,
                }}
              >
                일
              </Box>
              {dMatches.map((num: number) => renderBall(num))}
              {bMatchD && renderBall(bonus, true)}
            </Stack>
          )}
        </Stack>
      );
    }

    return (
      <Box
        sx={{
          width: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          px: 0.5,
        }}
      >
        {event.title}
      </Box>
    );
  };

  return (
    <>
      <DashboardContent maxWidth="xl" sx={{ ...flexStyles }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 3, md: 5 },
          }}
        >
          <Typography variant="h4">로또달력</Typography>
        </Box>

        {canReset && renderResults()}

        <Card sx={{ ...flexStyles, minHeight: '50vh' }}>
          <CalendarRoot sx={{ ...flexStyles }}>
            <CalendarToolbar
              view={view}
              title={title}
              canReset={canReset}
              loading={eventsLoading}
              onChangeView={onChangeView}
              onDateNavigation={onDateNavigation}
              onOpenFilters={openFilters.onTrue}
              showBonus={showBonus.value}
              onToggleBonus={showBonus.onToggle}
              filterMode={filterMode.value ? 'calendar' : 'all'}
              onToggleFilterMode={(mode: 'all' | 'calendar') => filterMode.setValue(mode === 'calendar')}
              viewOptions={[
                { value: 'dayGridMonth', label: 'Month', icon: 'mingcute:calendar-month-line' },
                { value: 'timeGridWeek', label: 'Week', icon: 'mingcute:calendar-week-line' },
                { value: 'timeGridDay', label: 'Day', icon: 'mingcute:calendar-day-line' },
                { value: 'listWeek', label: 'Agenda', icon: 'custom:calendar-agenda-outline' },
              ]}
            />

            <Calendar
              weekends
              editable
              droppable
              selectable
              allDayMaintainDuration
              eventResizableFromStart
              firstDay={0}
              aspectRatio={3}
              dayMaxEvents={3}
              eventMaxStack={2}
              rerenderDelay={10}
              headerToolbar={false}
              eventDisplay="block"
              ref={calendarRef}
              initialView={view}
              events={dataFiltered}
              select={onSelectRange}
              eventClick={handleOnClickEvent}
              eventContent={renderEventContent}
              businessHours={{
                daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
              }}
              eventDrop={(arg) => {
                startTransition(() => {
                  onDropEvent(arg, updateEvent);
                });
              }}
              eventResize={(arg) => {
                startTransition(() => {
                  onResizeEvent(arg, updateEvent);
                });
              }}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            />
          </CalendarRoot>
        </Card>
      </DashboardContent>

      {renderCreateFormDialog()}
      {renderFiltersDrawer()}
    </>
  );
}

// ----------------------------------------------------------------------

type ApplyFilterProps = {
  dateError: boolean;
  filters: ICalendarFilters;
  inputData: ICalendarEvent[];
};

function applyFilter({ inputData, filters, dateError }: ApplyFilterProps) {
  const { colors, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  inputData = stabilizedThis.map((el) => el[0]);

  if (colors.length) {
    inputData = inputData.filter((event) => colors.includes(event.color as string));
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((event) => fIsBetween(event.start, startDate, endDate));
    }
  }

  return inputData;
}
