'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { CalendarXIcon } from '@phosphor-icons/react/dist/ssr/CalendarX';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { NotePencilIcon } from '@phosphor-icons/react/dist/ssr/NotePencil';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import dayjs from 'dayjs';
import { utcDate, utcDateTimeLong, utcTime } from '@/lib/fmt-time';

import { RoleGuard } from '@/components/auth/role-guard';
import type { UserRole } from '@/types/user';
import { useUser } from '@/hooks/use-user';
import type { AppointmentSlotResponse, AvailabilityInput, AvailabilityResponse, DoctorLeaveCreate, DoctorLeaveResponse, DoctorResponse, PaginatedResponse, SlotStatus, SlotToggleResponse } from '@/lib/api';
import {
  createDoctorLeave,
  createSlot,
  deleteDoctorLeave,
  deleteSlot,
  generateSlotsForDoctor,
  getDoctorAvailability,
  getDoctorLeaves,
  getDoctorProfile,
  getDoctors,
  getSlots,
  setDoctorAvailability,
  setOwnAvailability,
  toggleSlotActive,
  updateSlot,
} from '@/lib/api';

// ── AddLeaveDialog ─────────────────────────────────────────────────────────────

interface AddLeaveDialogProps {
  open: boolean;
  doctors: DoctorResponse[];
  lockedDoctorId?: number;
  onClose: () => void;
  onCreated: () => void;
}

function AddLeaveDialog({ open, doctors, lockedDoctorId, onClose, onCreated }: AddLeaveDialogProps): React.JSX.Element {
  const [form, setForm] = React.useState<DoctorLeaveCreate & { doctor_id: string }>({
    doctor_id: lockedDoctorId ? String(lockedDoctorId) : '',
    date: '',
    is_full_day: true,
    start_time: '',
    end_time: '',
    reason: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (lockedDoctorId) setForm((f) => ({ ...f, doctor_id: String(lockedDoctorId) }));
  }, [lockedDoctorId]);

  function reset(): void {
    setForm({ doctor_id: lockedDoctorId ? String(lockedDoctorId) : '', date: '', is_full_day: true, start_time: '', end_time: '', reason: '' });
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!form.doctor_id || !form.date) {
      setError('Doctor and date are required.');
      return;
    }
    if (!form.is_full_day && (!form.start_time || !form.end_time)) {
      setError('Start time and end time are required for a partial-day leave.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createDoctorLeave(Number(form.doctor_id), {
        date: form.date,
        is_full_day: form.is_full_day,
        start_time: form.is_full_day ? undefined : form.start_time || undefined,
        end_time: form.is_full_day ? undefined : form.end_time || undefined,
        reason: form.reason || undefined,
      });
      reset();
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create leave.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Add Leave / Unavailability</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {/* Doctor picker */}
          {lockedDoctorId ? (
            <TextField
              label="Doctor"
              size="small"
              value={doctors.find((d) => d.id === lockedDoctorId)?.doctor_name ?? `Doctor #${lockedDoctorId}`}
              disabled
            />
          ) : (
            <FormControl fullWidth size="small" required>
              <InputLabel>Doctor</InputLabel>
              <Select
                label="Doctor"
                value={form.doctor_id}
                onChange={(e) => { setForm((f) => ({ ...f, doctor_id: e.target.value })); }}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.doctor_name ?? `Doctor #${d.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.date}
            onChange={(e) => { setForm((f) => ({ ...f, date: e.target.value })); }}
            required
            inputProps={{ min: new Date().toISOString().split('T')[0] }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.is_full_day}
                onChange={(e) => { setForm((f) => ({ ...f, is_full_day: e.target.checked })); }}
                color="warning"
              />
            }
            label={form.is_full_day ? 'Full day' : 'Partial day (specific time window)'}
          />

          {!form.is_full_day ? (
            <Stack direction="row" spacing={2}>
              <TextField
                label="Block start"
                type="time"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.start_time}
                onChange={(e) => { setForm((f) => ({ ...f, start_time: e.target.value })); }}
                required
                sx={{ flex: 1 }}
                inputProps={{ step: 300 }}
              />
              <TextField
                label="Block end"
                type="time"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.end_time}
                onChange={(e) => { setForm((f) => ({ ...f, end_time: e.target.value })); }}
                required
                sx={{ flex: 1 }}
                inputProps={{ step: 300 }}
              />
            </Stack>
          ) : null}

          <TextField
            label="Reason (optional)"
            size="small"
            multiline
            rows={2}
            value={form.reason}
            onChange={(e) => { setForm((f) => ({ ...f, reason: e.target.value })); }}
            placeholder="e.g. Personal leave, conference, holiday…"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button variant="contained" color="warning" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Add Leave'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SlotStatus,
  { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }
> = {
  available: { label: 'Available', color: 'success' },
  booked:    { label: 'Booked',    color: 'info' },
  cancelled: { label: 'Cancelled', color: 'error' },
  blocked:   { label: 'Blocked',   color: 'warning' },
};

const SLOT_STATUSES: SlotStatus[] = ['available', 'booked', 'cancelled', 'blocked'];

function toLocalDatetimeValue(iso: string): string {
  // Convert ISO-8601 to value accepted by <input type="datetime-local">
  return dayjs(iso).format('YYYY-MM-DDTHH:mm');
}

// ── sub-components ─────────────────────────────────────────────────────────────

interface CreateSlotDialogProps {
  open: boolean;
  doctors: DoctorResponse[];
  /** When set, the doctor field is pre-filled and locked (used for doctor role). */
  lockedDoctorId?: number;
  onClose: () => void;
  onCreated: () => void;
}

function CreateSlotDialog({ open, doctors, lockedDoctorId, onClose, onCreated }: CreateSlotDialogProps): React.JSX.Element {
  const [form, setForm] = React.useState({
    doctor_id: lockedDoctorId ? String(lockedDoctorId) : '',
    start_time: '',
    end_time: '',
    capacity: '1',
    status: 'available' as SlotStatus,
  });

  React.useEffect(() => {
    if (lockedDoctorId) setForm((f) => ({ ...f, doctor_id: String(lockedDoctorId) }));
  }, [lockedDoctorId]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset(): void {
    // Preserve locked doctor_id so re-opening the dialog passes validation.
    setForm({ doctor_id: lockedDoctorId ? String(lockedDoctorId) : '', start_time: '', end_time: '', capacity: '1', status: 'available' });
    setError(null);
  }

  async function handleSave(): Promise<void> {
    if (!form.doctor_id || !form.start_time || !form.end_time) {
      setError('Doctor, start time, and end time are required.');
      return;
    }
    const doctor = doctors.find((d) => String(d.id) === form.doctor_id);
    if (!doctor) { setError('Doctor not found.'); return; }
    setSaving(true);
    setError(null);
    try {
      await createSlot({
        doctor_id: doctor.id,
        clinic_id: doctor.clinic_id,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        capacity: Number(form.capacity) || 1,
        status: form.status,
      });
      reset();
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create slot.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Create Slot</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {lockedDoctorId ? (
            <TextField
              label="Doctor"
              size="small"
              value={doctors.find((d) => d.id === lockedDoctorId)?.doctor_name ?? `Doctor #${lockedDoctorId}`}
              disabled
            />
          ) : (
            <FormControl fullWidth size="small" required>
              <InputLabel>Doctor</InputLabel>
              <Select
                label="Doctor"
                value={form.doctor_id}
                onChange={(e) => { setForm((f) => ({ ...f, doctor_id: e.target.value })); }}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.doctor_name ?? `Doctor #${d.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Start Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.start_time}
            onChange={(e) => { setForm((f) => ({ ...f, start_time: e.target.value })); }}
            required
          />
          <TextField
            label="End Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.end_time}
            onChange={(e) => { setForm((f) => ({ ...f, end_time: e.target.value })); }}
            required
          />
          <TextField
            label="Capacity"
            type="number"
            size="small"
            inputProps={{ min: 1, max: 10 }}
            value={form.capacity}
            onChange={(e) => { setForm((f) => ({ ...f, capacity: e.target.value })); }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => { setForm((f) => ({ ...f, status: e.target.value as SlotStatus })); }}
            >
              {SLOT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface EditSlotDialogProps {
  slot: AppointmentSlotResponse | null;
  onClose: () => void;
  onUpdated: () => void;
}

function EditSlotDialog({ slot, onClose, onUpdated }: EditSlotDialogProps): React.JSX.Element {
  const [form, setForm] = React.useState({
    start_time: '',
    end_time: '',
    capacity: '1',
    status: 'available' as SlotStatus,
    force: false,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (slot) {
      setForm({
        start_time: toLocalDatetimeValue(slot.start_time),
        end_time: toLocalDatetimeValue(slot.end_time),
        capacity: String(slot.capacity),
        status: slot.status,
        force: false,
      });
      setError(null);
    }
  }, [slot]);

  async function handleSave(): Promise<void> {
    if (!slot) return;
    setSaving(true);
    setError(null);
    try {
      await updateSlot(
        slot.id,
        {
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
          capacity: Number(form.capacity) || 1,
          status: form.status,
        },
        form.force,
      );
      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update slot.');
    } finally {
      setSaving(false);
    }
  }

  const isBooked = (slot?.booked_count ?? 0) > 0;

  return (
    <Dialog open={Boolean(slot)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Slot #{slot?.id}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {isBooked ? (
            <Alert severity="warning">
              This slot has active bookings. Time/capacity changes require the Force override.
            </Alert>
          ) : null}

          <TextField
            label="Start Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.start_time}
            onChange={(e) => { setForm((f) => ({ ...f, start_time: e.target.value })); }}
          />
          <TextField
            label="End Time"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.end_time}
            onChange={(e) => { setForm((f) => ({ ...f, end_time: e.target.value })); }}
          />
          <TextField
            label="Capacity"
            type="number"
            size="small"
            inputProps={{ min: 1, max: 10 }}
            value={form.capacity}
            onChange={(e) => { setForm((f) => ({ ...f, capacity: e.target.value })); }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => { setForm((f) => ({ ...f, status: e.target.value as SlotStatus })); }}
            >
              {SLOT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {isBooked ? (
            <FormControlLabel
              control={
                <Switch
                  checked={form.force}
                  onChange={(e) => { setForm((f) => ({ ...f, force: e.target.checked })); }}
                  color="warning"
                />
              }
              label="Force override (allow editing booked slot)"
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface GenerateSlotsDialogProps {
  open: boolean;
  doctors: DoctorResponse[];
  /** When set, the doctor field is pre-filled and locked (used for doctor role). */
  lockedDoctorId?: number;
  onClose: () => void;
  onGenerated: (count: number) => void;
}

function GenerateSlotsDialog({ open, doctors, lockedDoctorId, onClose, onGenerated }: GenerateSlotsDialogProps): React.JSX.Element {
  const [doctorId, setDoctorId] = React.useState(lockedDoctorId ? String(lockedDoctorId) : '');
  const [mode, setMode] = React.useState<'rolling' | 'range'>('rolling');
  const [daysAhead, setDaysAhead] = React.useState('60');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (lockedDoctorId) setDoctorId(String(lockedDoctorId));
  }, [lockedDoctorId]);

  function reset(): void {
    setDoctorId(lockedDoctorId ? String(lockedDoctorId) : '');
    setMode('rolling');
    setDaysAhead('60');
    setDateFrom('');
    setDateTo('');
    setError(null);
  }

  async function handleGenerate(): Promise<void> {
    if (!doctorId) { setError('Please select a doctor.'); return; }
    if (mode === 'range' && (!dateFrom || !dateTo)) { setError('Both From and To dates are required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const result = await generateSlotsForDoctor(Number(doctorId), {
        days_ahead: mode === 'rolling' ? Number(daysAhead) : undefined,
        date_from: mode === 'range' ? dateFrom : undefined,
        date_to: mode === 'range' ? dateTo : undefined,
      });
      reset();
      onGenerated(result.generated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate slots.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Slots for Doctor</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          {lockedDoctorId ? (
            <TextField
              label="Doctor"
              size="small"
              value={doctors.find((d) => d.id === lockedDoctorId)?.doctor_name ?? `Doctor #${lockedDoctorId}`}
              disabled
            />
          ) : (
            <FormControl fullWidth size="small" required>
              <InputLabel>Doctor</InputLabel>
              <Select
                label="Doctor"
                value={doctorId}
                onChange={(e) => { setDoctorId(e.target.value); }}
              >
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.doctor_name ?? `Doctor #${d.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>Generation Mode</InputLabel>
            <Select
              label="Generation Mode"
              value={mode}
              onChange={(e) => { setMode(e.target.value as 'rolling' | 'range'); }}
            >
              <MenuItem value="rolling">Rolling window (days ahead)</MenuItem>
              <MenuItem value="range">Specific date range</MenuItem>
            </Select>
          </FormControl>

          {mode === 'rolling' ? (
            <TextField
              label="Days Ahead"
              type="number"
              size="small"
              inputProps={{ min: 1, max: 365 }}
              value={daysAhead}
              onChange={(e) => { setDaysAhead(e.target.value); }}
            />
          ) : (
            <>
              <TextField
                label="From Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); }}
              />
              <TextField
                label="To Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); }}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button variant="contained" onClick={handleGenerate} disabled={saving}>
          {saving ? 'Generating…' : 'Generate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── main content ───────────────────────────────────────────────────────────────

function SlotsContent(): React.JSX.Element {
  const { user } = useUser();
  const role = user?.role as UserRole | undefined;
  const isDoctor = role === 'doctor';

  const [slots, setSlots] = React.useState<AppointmentSlotResponse[]>([]);
  const [doctors, setDoctors] = React.useState<DoctorResponse[]>([]);
  /** The logged-in doctor's own profile ID — set only when role === 'doctor'. */
  const [ownDoctorId, setOwnDoctorId] = React.useState<number | undefined>(undefined);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage] = React.useState(20);

  // Filters
  const [filterDoctor, setFilterDoctor] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<SlotStatus | 'all'>('all');
  const [filterDateFrom, setFilterDateFrom] = React.useState('');
  const [filterDateTo, setFilterDateTo] = React.useState('');
  const [includeAll, setIncludeAll] = React.useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<AppointmentSlotResponse | null>(null);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<AppointmentSlotResponse | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Snackbar
  const [snack, setSnack] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<'leaves' | 'availability'>('availability');

  // ── Leave state ────────────────────────────────────────────────────────────
  const [leaves, setLeaves] = React.useState<DoctorLeaveResponse[]>([]);
  const [leavesLoading, setLeavesLoading] = React.useState(false);
  const [addLeaveOpen, setAddLeaveOpen] = React.useState(false);
  const [deleteLeaveTarget, setDeleteLeaveTarget] = React.useState<DoctorLeaveResponse | null>(null);
  const [deletingLeave, setDeletingLeave] = React.useState(false);
  const [deleteLeaveError, setDeleteLeaveError] = React.useState<string | null>(null);

  function showSnack(message: string, severity: 'success' | 'error' = 'success'): void {
    setSnack({ open: true, message, severity });
  }

  // ── Leave helpers ──────────────────────────────────────────────────────────
  const activeDoctorId = ownDoctorId ?? (filterDoctor ? Number(filterDoctor) : undefined);

  // ── Availability state ─────────────────────────────────────────────────────
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  type DaySchedule = { enabled: boolean; start_time: string; end_time: string; slot_interval: number };
  const defaultDay = (): DaySchedule => ({ enabled: false, start_time: '09:00', end_time: '17:00', slot_interval: 15 });

  const [schedule, setSchedule] = React.useState<Record<number, DaySchedule>>(
    Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, defaultDay()]))
  );
  const [availLoading, setAvailLoading] = React.useState(false);
  const [availSaving, setAvailSaving] = React.useState(false);

  const fetchAvailability = React.useCallback(async () => {
    if (!activeDoctorId) return;
    setAvailLoading(true);
    try {
      const records: AvailabilityResponse[] = await getDoctorAvailability(activeDoctorId);
      setSchedule(() => {
        const next: Record<number, DaySchedule> = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, defaultDay()]));
        records.forEach((r) => {
          next[r.day_of_week] = { enabled: true, start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5), slot_interval: r.slot_interval ?? 15 };
        });
        return next;
      });
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : 'Failed to load availability.', 'error');
    } finally {
      setAvailLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoctorId]);

  React.useEffect(() => {
    if (activeTab === 'availability') void fetchAvailability();
  }, [activeTab, fetchAvailability]);

  async function handleSaveAvailability(): Promise<void> {
    if (!activeDoctorId) return;
    setAvailSaving(true);
    try {
      const payload: AvailabilityInput[] = [0, 1, 2, 3, 4, 5, 6]
        .filter((d) => schedule[d].enabled)
        .map((d) => ({
          day_of_week: d,
          start_time: schedule[d].start_time,
          end_time: schedule[d].end_time,
          slot_interval: schedule[d].slot_interval,
        }));
      // Doctors use their own scoped endpoint; admins use the doctor-id endpoint
      if (isDoctor) {
        await setOwnAvailability(payload);
      } else {
        await setDoctorAvailability(activeDoctorId, payload);
      }
      showSnack('Availability schedule saved.');
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : 'Failed to save availability.', 'error');
    } finally {
      setAvailSaving(false);
    }
  }

  const fetchLeaves = React.useCallback(async () => {
    if (!activeDoctorId) { setLeaves([]); return; }
    setLeavesLoading(true);
    try {
      const data = await getDoctorLeaves(activeDoctorId);
      setLeaves(data);
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : 'Failed to load leaves.', 'error');
    } finally {
      setLeavesLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoctorId]);

  React.useEffect(() => {
    if (activeTab === 'leaves') void fetchLeaves();
  }, [activeTab, fetchLeaves]);

  async function handleDeleteLeave(): Promise<void> {
    if (!deleteLeaveTarget) return;
    setDeletingLeave(true);
    setDeleteLeaveError(null);
    try {
      await deleteDoctorLeave(deleteLeaveTarget.doctor_id, deleteLeaveTarget.id);
      setDeleteLeaveTarget(null);
      showSnack('Leave removed.');
      void fetchLeaves();
    } catch (err: unknown) {
      setDeleteLeaveError(err instanceof Error ? err.message : 'Failed to delete leave.');
    } finally {
      setDeletingLeave(false);
    }
  }

  // When role is doctor, resolve their own profile once and lock the filter.
  React.useEffect(() => {
    if (!isDoctor) return;
    getDoctorProfile()
      .then((profile) => {
        setOwnDoctorId(profile.id);
        setFilterDoctor(String(profile.id));
        setDoctors([profile]);   // doctors list only needs own entry for label lookup
      })
      .catch(() => { /* non-fatal – page still loads */ });
  }, [isDoctor]);

  const fetchDoctors = React.useCallback(async () => {
    if (isDoctor) return;   // doctor branch handled above
    try {
      const result = await getDoctors({ limit: 200 });
      setDoctors(result.items);
    } catch {
      /* non-fatal */
    }
  }, [isDoctor]);

  const fetchSlots = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSlots({
        doctor_id: filterDoctor ? Number(filterDoctor) : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        date_from: filterDateFrom ? new Date(filterDateFrom).toISOString() : undefined,
        date_to: filterDateTo ? new Date(filterDateTo).toISOString() : undefined,
        include_all: includeAll,
        limit: 500,
      });
      setSlots(data);
      setPage(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load slots.');
    } finally {
      setLoading(false);
    }
  }, [filterDoctor, filterStatus, filterDateFrom, filterDateTo, includeAll]);

  React.useEffect(() => {
    void fetchDoctors();
  }, [fetchDoctors]);

  React.useEffect(() => {
    void fetchSlots();
  }, [fetchSlots]);

  async function handleToggleActive(slot: AppointmentSlotResponse): Promise<void> {
    try {
      const result: SlotToggleResponse = await toggleSlotActive(slot.id);
      showSnack(result.message);
      void fetchSlots();
    } catch (err: unknown) {
      showSnack(err instanceof Error ? err.message : 'Failed to toggle slot.', 'error');
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSlot(deleteTarget.id);
      setDeleteTarget(null);
      showSnack(`Slot #${deleteTarget.id} deleted.`);
      void fetchSlots();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete slot.');
    } finally {
      setDeleting(false);
    }
  }

  function getDoctorName(doctorId: number): string {
    const d = doctors.find((x) => x.id === doctorId);
    return d?.doctor_name ?? `Doctor #${doctorId}`;
  }

  const paginated = slots.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ClockIcon size={28} />
          <Typography variant="h4">Slot Management</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { void (activeTab === 'leaves' ? fetchLeaves() : fetchAvailability()); }}>
              <ArrowClockwiseIcon />
            </IconButton>
          </Tooltip>
          {activeTab === 'leaves' ? (
            <Button
              variant="contained"
              color="warning"
              startIcon={<PlusIcon />}
              onClick={() => { setAddLeaveOpen(true); }}
              disabled={!activeDoctorId}
            >
              Add Leave
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<CalendarCheckIcon />}
              onClick={() => { void handleSaveAvailability(); }}
              disabled={availSaving || !activeDoctorId}
            >
              {availSaving ? 'Saving…' : 'Save Schedule'}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v: 'leaves' | 'availability') => { setActiveTab(v); }}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="leaves" label="Leave Management" icon={<CalendarXIcon size={16} />} iconPosition="start" />
        <Tab value="availability" label="Availability" icon={<CalendarCheckIcon size={16} />} iconPosition="start" />
      </Tabs>

      {false ? (
        <>
      {/* Filters */}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" gap={2}>
          {/* Doctor filter — hidden for doctor role (auto-locked to own profile) */}
          {!isDoctor ? (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Doctor</InputLabel>
              <Select
                label="Doctor"
                value={filterDoctor}
                onChange={(e) => { setFilterDoctor(e.target.value); }}
              >
                <MenuItem value="">All Doctors</MenuItem>
                {doctors.map((d) => (
                  <MenuItem key={d.id} value={String(d.id)}>
                    {d.doctor_name ?? `Doctor #${d.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {/* Status filter */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as SlotStatus | 'all'); }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              {SLOT_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date filters */}
          <TextField
            label="From"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); }}
            sx={{ minWidth: 160 }}
          />

          {/* Include all toggle */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={includeAll}
                onChange={(e) => { setIncludeAll(e.target.checked); }}
              />
            }
            label="Include past / inactive"
          />

          {/* Clear */}
          <Button
            size="small"
            variant="text"
            onClick={() => {
              if (!isDoctor) setFilterDoctor('');
              setFilterStatus('all');
              setFilterDateFrom('');
              setFilterDateTo('');
              setIncludeAll(true);
            }}
          >
            Clear
          </Button>
        </Stack>
      </Card>

      {/* Table */}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardHeader
          title={`Slots (${slots.length})`}
          titleTypographyProps={{ variant: 'subtitle1' }}
          sx={{ py: 1.5 }}
        />
        <Divider />
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto', width: '100%' }}>
              <Table size="small" sx={{ minWidth: 1200 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600, width: '5%' }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '12%' }}>Doctor</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '12%' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '10%' }}>Start</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '10%' }}>End</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '10%' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '8%' }} align="center">Booked</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '8%' }} align="center">Capacity</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '8%' }} align="center">Active</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '12%' }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          No slots found. Adjust filters or generate slots for a doctor.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((slot) => {
                      const cfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.available;
                      const dateStr = slot.date
                        ? dayjs(slot.date).format('MMM D, YYYY')
                        : utcDate(slot.start_time);
                      return (
                        <TableRow key={slot.id} hover sx={{ opacity: slot.is_active ? 1 : 0.5 }}>
                          <TableCell>#{slot.id}</TableCell>
                          <TableCell>{getDoctorName(slot.doctor_id)}</TableCell>
                          <TableCell>{dateStr}</TableCell>
                          <TableCell>{utcTime(slot.start_time)}</TableCell>
                          <TableCell>{utcTime(slot.end_time)}</TableCell>
                          <TableCell>
                            <Chip label={cfg.label} color={cfg.color} size="small" />
                          </TableCell>
                          <TableCell align="center">{slot.booked_count}</TableCell>
                          <TableCell align="center">{slot.capacity}</TableCell>
                          <TableCell align="center">
                            <Tooltip title={slot.is_active ? 'Click to deactivate' : 'Click to activate'}>
                              <Switch
                                size="small"
                                checked={slot.is_active}
                                onChange={() => { void handleToggleActive(slot); }}
                                color="success"
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Edit slot">
                                <IconButton
                                  size="small"
                                  onClick={() => { setEditTarget(slot); }}
                                >
                                  <NotePencilIcon size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete slot">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => { setDeleteTarget(slot); }}
                                    disabled={slot.booked_count > 0}
                                  >
                                    <TrashIcon size={16} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
            <TablePagination
              component="div"
              count={slots.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[rowsPerPage]}
              onPageChange={(_, p) => { setPage(p); }}
            />
          </>
        )}
      </Card>
        </>
      ) : null}

      {/* Create dialog */}
      <CreateSlotDialog
        open={createOpen}
        doctors={doctors}
        lockedDoctorId={ownDoctorId}
        onClose={() => { setCreateOpen(false); }}
        onCreated={() => {
          setCreateOpen(false);
          showSnack('Slot created.');
          void fetchSlots();
        }}
      />

      {/* Edit dialog */}
      <EditSlotDialog
        slot={editTarget}
        onClose={() => { setEditTarget(null); }}
        onUpdated={() => {
          setEditTarget(null);
          showSnack('Slot updated.');
          void fetchSlots();
        }}
      />

      {/* Generate dialog */}
      <GenerateSlotsDialog
        open={generateOpen}
        doctors={doctors}
        lockedDoctorId={ownDoctorId}
        onClose={() => { setGenerateOpen(false); }}
        onGenerated={(count) => {
          setGenerateOpen(false);
          showSnack(`Generated ${count} new slot${count !== 1 ? 's' : ''}.`);
          void fetchSlots();
        }}
      />

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => { setDeleteTarget(null); }}>
        <DialogTitle>Delete Slot #{deleteTarget?.id}?</DialogTitle>
        <DialogContent>
          {deleteError ? <Alert severity="error" sx={{ mb: 1 }}>{deleteError}</Alert> : null}
          <Typography variant="body2">
            {utcDateTimeLong(deleteTarget?.start_time)}
            {' → '}
            {utcTime(deleteTarget?.end_time)}
          </Typography>
          <Typography variant="body2" color="text.secondary">This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => { void handleDelete(); }} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Leave Management section ───────────────────────────────────────── */}
      {activeTab === 'leaves' ? (
        <Card>
          <CardHeader
            title={activeDoctorId ? `Leave Records – Doctor #${activeDoctorId}` : 'Leave Records'}
            titleTypographyProps={{ variant: 'subtitle1' }}
            subheader={!activeDoctorId && !isDoctor ? 'Select a doctor in the Slots filter to manage their leave.' : undefined}
            sx={{ py: 1.5 }}
          />
          <Divider />
          {leavesLoading ? (
            <Box sx={{ p: 2 }}>
              <Stack spacing={1}>
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={36} />)}
              </Stack>
            </Box>
          ) : !activeDoctorId ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CalendarXIcon size={40} style={{ opacity: 0.25 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {isDoctor ? 'Your leave records will appear here.' : 'Select a doctor using the filter on the Slots tab first.'}
              </Typography>
            </Box>
          ) : leaves.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CalendarXIcon size={40} style={{ opacity: 0.25 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No leave records found. Click “Add Leave” to block a date.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Time window</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Added on</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {dayjs(leave.date).format('MMM D, YYYY')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(leave.date).format('dddd')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={leave.is_full_day ? 'Full day' : 'Partial'}
                          color={leave.is_full_day ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {leave.is_full_day ? (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        ) : (
                          <Typography variant="body2">
                            {leave.start_time} – {leave.end_time}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {leave.reason ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {leave.created_at ? dayjs(leave.created_at).format('MMM D, YYYY') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Remove leave">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => { setDeleteLeaveTarget(leave); setDeleteLeaveError(null); }}
                          >
                            <TrashIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Card>
      ) : null}

      {/* ── Availability / Weekly Schedule panel ───────────────────────────── */}
      {activeTab === 'availability' ? (
        <Card>
          <CardHeader
            title="Weekly Schedule"
            subheader="Enable each day you work and set your hours. Changes are saved when you click Save Schedule."
            sx={{ py: 1.5 }}
          />
          <Divider />
          {availLoading ? (
            <Box sx={{ p: 2 }}>
              <Stack spacing={1}>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} variant="rounded" height={56} />)}
              </Stack>
            </Box>
          ) : !activeDoctorId ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CalendarCheckIcon size={40} style={{ opacity: 0.25 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {isDoctor ? 'Loading your schedule…' : 'Select a doctor using the filter on the Slots tab first.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                  const day = schedule[d];
                  return (
                    <Box
                      key={d}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: day.enabled ? 'primary.light' : 'divider',
                        bgcolor: day.enabled ? 'action.hover' : 'transparent',
                        flexWrap: 'wrap',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={day.enabled}
                            onChange={(e) => { setSchedule((prev) => ({ ...prev, [d]: { ...prev[d], enabled: e.target.checked } })); }}
                          />
                        }
                        label={
                          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 90 }}>
                            {DAYS[d]}
                          </Typography>
                        }
                        labelPlacement="end"
                        sx={{ m: 0, minWidth: 180 }}
                      />
                      <TextField
                        label="From"
                        type="time"
                        size="small"
                        value={day.start_time}
                        disabled={!day.enabled}
                        onChange={(e) => { setSchedule((prev) => ({ ...prev, [d]: { ...prev[d], start_time: e.target.value } })); }}
                        sx={{ width: 140 }}
                        inputProps={{ step: 300 }}
                      />
                      <TextField
                        label="To"
                        type="time"
                        size="small"
                        value={day.end_time}
                        disabled={!day.enabled}
                        onChange={(e) => { setSchedule((prev) => ({ ...prev, [d]: { ...prev[d], end_time: e.target.value } })); }}
                        sx={{ width: 140 }}
                        inputProps={{ step: 300 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 130 }} disabled={!day.enabled}>
                        <InputLabel>Slot (min)</InputLabel>
                        <Select
                          label="Slot (min)"
                          value={day.slot_interval}
                          onChange={(e) => { setSchedule((prev) => ({ ...prev, [d]: { ...prev[d], slot_interval: Number(e.target.value) } })); }}
                        >
                          {[5, 10, 15, 20, 30, 45, 60].map((m) => (
                            <MenuItem key={m} value={m}>{m} min</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {!day.enabled ? (
                        <Typography variant="caption" color="text.secondary">Off – not available for booking</Typography>
                      ) : null}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Card>
      ) : null}

      {/* ── Add Leave dialog ──────────────────────────────────────────────── */}
      <AddLeaveDialog
        open={addLeaveOpen}
        doctors={doctors}
        lockedDoctorId={ownDoctorId}
        onClose={() => { setAddLeaveOpen(false); }}
        onCreated={() => {
          setAddLeaveOpen(false);
          showSnack('Leave block added. Slots on that date are now unavailable.');
          void fetchLeaves();
        }}
      />

      {/* ── Delete Leave confirm dialog ───────────────────────────────────── */}
      <Dialog open={Boolean(deleteLeaveTarget)} onClose={() => { if (!deletingLeave) setDeleteLeaveTarget(null); }}>
        <DialogTitle>Remove Leave Block?</DialogTitle>
        <DialogContent>
          {deleteLeaveError ? <Alert severity="error" sx={{ mb: 1 }}>{deleteLeaveError}</Alert> : null}
          <Typography variant="body2">
            <strong>{deleteLeaveTarget?.date ? dayjs(deleteLeaveTarget.date).format('dddd, MMM D YYYY') : ''}</strong>
            {deleteLeaveTarget?.is_full_day
              ? ' — Full day'
              : ` — ${deleteLeaveTarget?.start_time ?? ''} – ${deleteLeaveTarget?.end_time ?? ''}`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Removing this leave will make the time slots available for booking again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteLeaveTarget(null); setDeleteLeaveError(null); }} disabled={deletingLeave}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => { void handleDeleteLeave(); }} disabled={deletingLeave}>
            {deletingLeave ? 'Removing…' : 'Remove Leave'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => { setSnack((s) => ({ ...s, open: false })); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} onClose={() => { setSnack((s) => ({ ...s, open: false })); }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

// ── page export ────────────────────────────────────────────────────────────────

export default function Page(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['admin', 'super_admin', 'doctor']}>
      <SlotsContent />
    </RoleGuard>
  );
}
